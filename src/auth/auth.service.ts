import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
    InternalServerErrorException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginDTO } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/message/email.service';
import { GitHubUserDto } from './dto/github-user.dto';
import { CaptchaService } from './captcha.service';
import * as crypto from 'crypto';
import { GoogleLoginDTO } from './dto/googleLogin.dto';
import { FacebookLoginDTO } from './dto/facebookLogin.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { getVerificationEmailTemplate } from 'src/templates/email-verification';
import { getPasswordResetEmailTemplate } from 'src/templates/password-reset';
import { API_URL } from 'src/constants/variables';
import { instanceToPlain } from 'class-transformer';
import {
  REFRESH_TOKEN_OBJECT,
  USER_REFRESH_TOKENS_ADD,
  USER_REFRESH_TOKENS_REMOVE,
  USER_REFRESH_TOKENS_KEY,
  REFRESH_TOKEN_KEY,
  PENDING_USER_KEY,
  PENDING_USER_OBJECT,
  OTP_KEY
} from 'src/constants/redis';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly redisService: RedisService,
        private readonly verificationService: VerificationService,
        private readonly emailService: EmailService,
        private readonly captchaService: CaptchaService,
        private readonly configService: ConfigService,
    ) {}

    async generateTokens(id: string) {
        const access_token = this.jwtService.sign(
            { id },
            {
                secret: process.env.JWT_TOKEN_SECRET,
                expiresIn: process.env.JWT_TOKEN_EXPIRATION_TIME,
            },
        );

        const refresh_payload = { id, jti: crypto.randomUUID() };
        const refresh_token = this.jwtService.sign(refresh_payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
        });

        const ttl = 7 * 24 * 60 * 60; 

        const refresh_redis_object = REFRESH_TOKEN_OBJECT(refresh_payload.jti, id, ttl);
        await this.redisService.set(refresh_redis_object.key, refresh_redis_object.value, refresh_redis_object.ttl);

        const user_tokens_add = USER_REFRESH_TOKENS_ADD(id, refresh_payload.jti, ttl);
        await this.redisService.sadd(user_tokens_add.key, user_tokens_add.value);
        await this.redisService.expire(user_tokens_add.key, user_tokens_add.ttl);

        return {
            access_token: access_token,
            refresh_token: refresh_token,
        };
    }


    async logout(refresh_token: string, res: Response) {
        try {
            const payload: any = await this.jwtService.verifyAsync(
                refresh_token, 
                {
                    secret: process.env.JWT_REFRESH_SECRET,
                }
            );

            await this.redisService.del(REFRESH_TOKEN_KEY(payload.jti));
            // Also remove from user's set
            const user_tokens_remove = USER_REFRESH_TOKENS_REMOVE(payload.id, payload.jti);
            await this.redisService.srem(user_tokens_remove.key, user_tokens_remove.value);

            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            return { message: 'Logged out successfully' };
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logoutAll(refresh_token: string, res: Response) {
        try {
            const payload: any = await this.jwtService.verifyAsync(
                refresh_token, 
                {
                    secret: process.env.JWT_REFRESH_SECRET,
                }
            );

            // to logout from all devices, we need to get all JTIs for this user and delete them
            const user_tokens_key = USER_REFRESH_TOKENS_KEY(payload.id);
            const tokens = await this.redisService.smembers(user_tokens_key);

            if (tokens.length > 0) {
                const pipeline = this.redisService.pipeline();
                tokens.forEach(jti => pipeline.del(REFRESH_TOKEN_KEY(jti)));
                pipeline.del(user_tokens_key);
                await pipeline.exec();
            }

            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            return { message: 'Logged out from all devices' };
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async register(register_dto: RegisterDto) {
        const { 
            email, 
            confirm_password, 
            password, 
            captcha_token, 
            ...register_user 
        } = register_dto;

        // Verify CAPTCHA first (comment that in case you want to test the endpoint)
        try {
            await this.captchaService.validateCaptcha(captcha_token);
        } catch (error) {
            throw new BadRequestException(
                'CAPTCHA verification failed. Please try again.',
            );
        }

        // Check if email is under verification process
        const pending_user_key = PENDING_USER_KEY(email);
        const pending_user = await this.redisService.hget(pending_user_key);

        if (pending_user) {
            throw new ConflictException('Email already exists');
        }

        // Check if email is in use
        const existing_user = await this.userService.findUserByEmail(
            register_dto.email,
        );

        if (existing_user) {
            throw new ConflictException('Email already exists');
        }

        // Check that passwords match
        if (password !== confirm_password) {
            throw new BadRequestException(
                'Confirmation password must match password',
            );
        }

        const hashed_password = await bcrypt.hash(password, 10);

        const pending_user_object = PENDING_USER_OBJECT(
            email,
            {
                ...register_user,
                password: hashed_password,
            },
            this.configService.get('PENDING_USER_EXPIRATION_TIME') || 3600,
        );

        await this.redisService.hset(
            pending_user_object.key,
            pending_user_object.value,
            pending_user_object.ttl,
        );

        // Send verification email
        await this.generateEmailVerification(email);
        return {
            isEmailSent: true,
        };
    }

    async generateEmailVerification(email: string) {
        const pending_user_key = PENDING_USER_KEY(email);
        const user = await this.redisService.hget(pending_user_key);

        if (!user) {
            throw new NotFoundException('User not found or already verified');
        }

        const otp = await this.verificationService.generateOtp(email, 'email');

        const not_me_link = await this.verificationService.generateNotMeLink(
            email,
            `${API_URL}/auth/not-me`,
        );

        const html = getVerificationEmailTemplate({
            otp,
        });

        const email_sent = await this.emailService.sendEmail({
            subject: 'El Sab3 - Account Verification',
            recipients: [{ name: user.firstName ?? '', address: email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException('Failed to send OTP email');
        }

        return { isEmailSent: true };
    }

    async sendResetPasswordEmail(user_id: string) {
        const user = await this.userService.findUserById(user_id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const otp = await this.verificationService.generateOtp(user_id, 'password');
        const email = user.email;
        const user_name = email.split('@')[0]; // just for now

        const html = getPasswordResetEmailTemplate({
            otp: otp,
            user_name: user_name || 'Mario0o0o',
        });

        const email_sent = await this.emailService.sendEmail({
            subject: 'Password reset request',
            recipients: [{ name: user.first_name ?? '', address: email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException(
                'Failed to send password reset email',
            );
        }

        return { isEmailSent: true };
    }

    async verifyEmail(email: string, token: string) {
        const pending_user_key = PENDING_USER_KEY(email);
        const user = await this.redisService.hget(pending_user_key);
        if (!user) {
            throw new NotFoundException('User not found or already verified');
        }

        const is_valid = await this.verificationService.validateOtp(
            email,
            token,
            'email',
        );

        if (!is_valid) {
            throw new UnprocessableEntityException('Expired or incorrect token');
        }

        const first_name = user.firstName;
        const last_name = user.lastName;

        const created_user = await this.userService.createUser({
            email,
            first_name,
            last_name,
            ...user,
        });

        if (!created_user) {
            throw new InternalServerErrorException('Failed to save user to database');
        }

        await this.redisService.del(pending_user_key);

        return {
            userId: created_user.id,
        };
    }

    async verifyResetPasswordOtp(user_id: string, token: string) {
        const is_valid = await this.verificationService.validateOtp(
            user_id,
            token,
            'password',
        );

        if (!is_valid) {
            throw new UnprocessableEntityException('Expired or incorrect token');
        }

        // Generate secure token for password reset step
        const reset_token = await this.verificationService.generatePasswordResetToken(user_id);

        return {
            isValid: true,
            resetToken: reset_token, // This token will be used in step 3
        };
    }

    async resetPassword(user_id: string, new_password: string, token: string) {
        const token_data = await this.verificationService.validatePasswordResetToken(token);

        if (!token_data) {
            throw new UnauthorizedException('Invalid or expired reset token');
        }
        // check that the 2 ids are same
        if (token_data.userId !== user_id) {
            throw new UnauthorizedException('Invalid reset token for this user');
        }

        const user = await this.userService.findUserById(user_id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // check if new password is same as old password
        if (user.password) {
            const is_same_password = await bcrypt.compare(new_password, user.password);
            if (is_same_password) {
                throw new BadRequestException('New password must be different from the current password');
            }
        }

        const hashed_password = await bcrypt.hash(new_password, 10);
        await this.userService.updateUserPassword(user_id, hashed_password);
        return { success: true };
    }

    async handleNotMe(token: string) {
        const user = await this.verificationService.validateNotMeLink(token);

        if (!user) {
            throw new UnauthorizedException('Invalid or expired link');
        }

        const pending_user_key = PENDING_USER_KEY(user.email);
        const pending_user = await this.redisService.hget(pending_user_key);

        if (!pending_user) {
            throw new BadRequestException('Account was already verified');
        }

        // Clean up pending user data and OTP
        await this.redisService.del(pending_user_key);
        await this.redisService.del(OTP_KEY('email', user.email));

        return { message: 'deleted account successfully' };
    }

    async validateUser(email: string, password: string): Promise<string> {
        const user = await this.userService.findUserByEmail(email);
        if (!user) {
            const pending_user_key = PENDING_USER_KEY(email);
            const unverified_user = await this.redisService.hget(pending_user_key);
            if (!unverified_user) {
                throw new NotFoundException('User not found');
            } else {
                const is_password_valid = await bcrypt.compare(password, unverified_user.password);
                if (!is_password_valid) {
                    throw new UnauthorizedException('Wrong password');
                } else {
                    throw new UnauthorizedException('Email not verified yet. Please check your inbox.');
                }
            }
        }

        if (user.password) {
            const is_password_valid = await bcrypt.compare(password, user.password);
            if (!is_password_valid)
                throw new UnauthorizedException('Wrong password');
        } else {
            throw new UnauthorizedException('User registered with social login. Please use social login to access your account.');
        }

        return user.id;
    }

    async login(login_dto: LoginDTO) {
        const id = await this.validateUser(login_dto.email, login_dto.password);

        const user_instance = await this.userService.findUserById(id);
        const user = instanceToPlain(user_instance);

        const { access_token, refresh_token } = await this.generateTokens(id);

        return { user, access_token, refresh_token };
    }

    async changePassword(
        user_id: string,
        old_password: string,
        new_password: string,
    ) {
        if (new_password === old_password) {
            throw new BadRequestException('New password must be different from the old password');
        }

        const user = await this.userService.findUserById(user_id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // for now, I will ignore users without password (OAuth users)
        if (user.password) {
            const is_password_valid = await bcrypt.compare(old_password, user.password);
            if (!is_password_valid) {
                throw new UnauthorizedException('Wrong password');
            }
        }

        const hashed_new_password = await bcrypt.hash(new_password, 10);
        await this.userService.updateUserPassword(user_id, hashed_new_password);

        return {
            success: true,
        };
    }

    async refresh(token: string) {
        try {
            const payload: any = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const refresh_token_key = REFRESH_TOKEN_KEY(payload.jti);
            const exists = await this.redisService.get(refresh_token_key);
            if (!exists)
                throw new UnauthorizedException('Refresh token is invalid or expired');

            await this.redisService.del(refresh_token_key);

            return await this.generateTokens(payload.id);
        } catch (e) {
            console.log(e);
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateGoogleUser(google_user: GoogleLoginDTO) {
        let user = await this.userService.findUserByGoogleId(
            google_user.google_id
        );

        if (user) return user;

        if (google_user.email) {
            user = await this.userService.findUserByEmail(google_user.email);
            if (user) {
                const updated_user = await this.userService.updateUser(
                    user.id, 
                    {
                        google_id: google_user.google_id,
                        avatar_url: google_user.avatar_url,
                    }
                );

                if (!updated_user) {
                    throw new InternalServerErrorException('Failed to update user');
                }

                return updated_user;
            }
        }

        return await this.userService.createUser({
            email: google_user.email,
            first_name: google_user.first_name,
            last_name: google_user.last_name,
            avatar_url: google_user.avatar_url,
            google_id: google_user.google_id,
            password: '',
            phone_number: '',
        });
    }

    async validateFacebookUser(facebook_user: FacebookLoginDTO) {
        let user = await this.userService.findUserByFacebookId(
            facebook_user.facebook_id,
        );

        //user has already signed in with facebook
        if (user) {
            return user;
        }

        //user has already signed in with this email, so it is the same 
        //record in db
        if (facebook_user.email) {
            user = await this.userService.findUserByEmail(facebook_user.email);
            if (user) {
                const updated_user = await this.userService.updateUser(
                    user.id, 
                    {
                        facebook_id: facebook_user.facebook_id,
                        avatar_url: facebook_user.avatar_url,
                    }
                );

                if (!updated_user) {
                    throw new InternalServerErrorException('Failed to update user');
                }

                return updated_user;
            }
        }

        return await this.userService.createUser({
            email: facebook_user.email,
            first_name: facebook_user.first_name,
            last_name: facebook_user.last_name,
            facebook_id: facebook_user.facebook_id,
            avatar_url: facebook_user.avatar_url,
            phone_number: '',
            password: '', // No password for OAuth users
        });
    }

    /* 
        ####################### GitHub OAuth Routes ########################
    */
    async validateGitHubUser(github_user: GitHubUserDto): Promise<User> {
        let user = await this.userService.findUserByGithubId(github_user.github_id);
        if (user) {
            return user;
        }

        user = await this.userService.findUserByEmail(github_user.email);
        if (user) {
            const updated_user = await this.userService.updateUser(user.id, {
                github_id: github_user.github_id,
                avatar_url: github_user.avatar_url,
            });

            if (!updated_user) {
                throw new InternalServerErrorException('Failed to update user');
            }

            return updated_user;
        }

        return await this.userService.createUser({
            email: github_user.email,
            first_name: github_user.first_name,
            last_name: github_user.last_name,
            github_id: github_user.github_id,
            avatar_url: github_user.avatar_url,
            phone_number: '', // Will be filled later if needed
            password: undefined, // No password for OAuth users
        });
    }
}