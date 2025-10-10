import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
    InternalServerErrorException,
    ForbiddenException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginDTO } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/communication/email.service';
import { GitHubUserDto } from './dto/github-user.dto';
import { CaptchaService } from './captcha.service';
import * as crypto from 'crypto';
import { GoogleLoginDTO } from './dto/googleLogin.dto';
import { FacebookLoginDTO } from './dto/facebookLogin.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { generateOtpEmailHtml } from 'src/templates/otp-email';
import {verification_email_object, reset_password_email_object } from 'src/constants/variables';
import { instanceToPlain } from 'class-transformer';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import {
  REFRESH_TOKEN_OBJECT,
  USER_REFRESH_TOKENS_ADD,
  USER_REFRESH_TOKENS_REMOVE,
  USER_REFRESH_TOKENS_KEY,
  REFRESH_TOKEN_KEY,
  PENDING_USER_KEY,
  PENDING_USER_OBJECT,
  OTP_KEY,
} from 'src/constants/redis';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwt_service: JwtService,
        private readonly user_service: UserService,
        private readonly redis_service: RedisService,
        private readonly verification_service: VerificationService,
        private readonly email_service: EmailService,
        private readonly captcha_service: CaptchaService,
        private readonly config_service: ConfigService,
    ) {}

    async generateTokens(id: string) {
        const access_token = this.jwt_service.sign(
            { id },
            {
                secret: process.env.JWT_TOKEN_SECRET,
                expiresIn: process.env.JWT_TOKEN_EXPIRATION_TIME,
            },
        );

        const refresh_payload = { id, jti: crypto.randomUUID() };
        const refresh_token = this.jwt_service.sign(refresh_payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
        });

        const ttl = 7 * 24 * 60 * 60; 

        const refresh_redis_object = REFRESH_TOKEN_OBJECT(refresh_payload.jti, id, ttl);
        await this.redis_service.set(refresh_redis_object.key, refresh_redis_object.value, refresh_redis_object.ttl);

        const user_tokens_add = USER_REFRESH_TOKENS_ADD(id, refresh_payload.jti, ttl);
        await this.redis_service.sadd(user_tokens_add.key, user_tokens_add.value);
        await this.redis_service.expire(user_tokens_add.key, user_tokens_add.ttl);

        return {
            access_token: access_token,
            refresh_token: refresh_token,
        };
    }

    async validateUser(email: string, password: string): Promise<string> {
        const user = await this.user_service.findUserByEmail(email);
        if (!user) {
            const pending_user_key = PENDING_USER_KEY(email);
            const unverified_user = await this.redis_service.hget(pending_user_key);
            if (!unverified_user) {
                throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
            } else {
                const is_password_valid = await bcrypt.compare(password, unverified_user.password);
                if (!is_password_valid) {
                    throw new UnauthorizedException(ERROR_MESSAGES.WRONG_PASSWORD);
                } else {
                    throw new ForbiddenException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
                }
            }
        }

        if (user.password) {
            const is_password_valid = await bcrypt.compare(password, user.password);
            if (!is_password_valid)
                throw new UnauthorizedException(ERROR_MESSAGES.WRONG_PASSWORD);
        } else {
            throw new UnauthorizedException(ERROR_MESSAGES.SOCIAL_LOGIN_REQUIRED);
        }

        return user.id;
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
        // try {
        //     await this.captcha_service.validateCaptcha(captcha_token);
        // } catch (error) {
        //     throw new BadRequestException(ERROR_MESSAGES.CAPTCHA_VERIFICATION_FAILED);
        // }

        // Check if email is under verification process
        const pending_user_key = PENDING_USER_KEY(email);
        const pending_user = await this.redis_service.hget(pending_user_key);

        if (pending_user) {
            throw new ConflictException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
        }

        // Check if email is in use
        const existing_user = await this.user_service.findUserByEmail(
            register_dto.email,
        );

        if (existing_user) {
            throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        // Check that passwords match
        if (password !== confirm_password) {
            throw new BadRequestException(ERROR_MESSAGES.PASSWORD_CONFIRMATION_MISMATCH);
        }

        const hashed_password = await bcrypt.hash(password, 10);

        const pending_user_object = PENDING_USER_OBJECT(
            email,
            {
                ...register_user,
                password: hashed_password,
            },
            this.config_service.get('PENDING_USER_EXPIRATION_TIME') || 3600,
        );

        await this.redis_service.hset(
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

    async login(login_dto: LoginDTO) {
        const id = await this.validateUser(login_dto.email, login_dto.password);

        const user_instance = await this.user_service.findUserById(id);
        const user = instanceToPlain(user_instance);

        const { access_token, refresh_token } = await this.generateTokens(id);

        return { user, access_token, refresh_token };
    }

    async generateEmailVerification(email: string) {
        const pending_user_key = PENDING_USER_KEY(email);
        const user = await this.redis_service.hget(pending_user_key);

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND_OR_VERIFIED);
        }

        const otp = await this.verification_service.generateOtp(email, 'email');
        const not_me_link = await this.verification_service.generateNotMeLink(
            email,
            `${process.env.BACKEND_URL}/auth/not-me`,
        );

        const { subject, title, description, subtitle, subtitle_description } = verification_email_object(otp, not_me_link);
        const html = generateOtpEmailHtml(title, description, otp, subtitle, subtitle_description, email.split('@')[0]);

        const email_sent = await this.email_service.sendEmail({
            subject: subject,
            recipients: [{ name: user.firstName ?? '', address: email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL);
        }

        return { isEmailSent: true };
    }

    async sendResetPasswordEmail(user_id: string) {
        const user = await this.user_service.findUserById(user_id);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const otp = await this.verification_service.generateOtp(user_id, 'password');
        const email = user.email;
        const user_name = email.split('@')[0]; // just for now

        const { subject, title, description, subtitle, subtitle_description } = reset_password_email_object(user_name);
        const html = generateOtpEmailHtml(title, description, otp, subtitle, subtitle_description, user_name);

        const email_sent = await this.email_service.sendEmail({
            subject: subject,
            recipients: [{ name: user.first_name ?? '', address: email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL);
        }

        return { isEmailSent: true };
    }

    async verifyEmail(email: string, token: string) {
        const pending_user_key = PENDING_USER_KEY(email);
        const user = await this.redis_service.hget(pending_user_key);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND_OR_VERIFIED);
        }

        const is_valid = await this.verification_service.validateOtp(
            email,
            token,
            'email',
        );

        if (!is_valid) {
            throw new UnprocessableEntityException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }

        const first_name = user.firstName;
        const last_name = user.lastName;

        const created_user = await this.user_service.createUser({
            email,
            first_name,
            last_name,
            ...user,
        });

        if (!created_user) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB);
        }

        await this.redis_service.del(pending_user_key);

        return {
            userId: created_user.id,
        };
    }

    async verifyResetPasswordOtp(user_id: string, token: string) {
        const is_valid = await this.verification_service.validateOtp(
            user_id,
            token,
            'password',
        );

        if (!is_valid) {
            throw new UnprocessableEntityException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }

        // Generate secure token for password reset step
        const reset_token = await this.verification_service.generatePasswordResetToken(user_id);

        return {
            isValid: true,
            resetToken: reset_token, // This token will be used in step 3
        };
    }


    async changePassword(user_id: string, old_password: string, new_password: string) {
        if (new_password === old_password) {
            throw new BadRequestException(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD);
        }

        const user = await this.user_service.findUserById(user_id);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // for now, I will ignore users without password (OAuth users)
        if (user.password) {
            const is_password_valid = await bcrypt.compare(old_password, user.password);
            if (!is_password_valid) {
                throw new UnauthorizedException(ERROR_MESSAGES.WRONG_PASSWORD);
            }
        }

        const hashed_new_password = await bcrypt.hash(new_password, 10);
        await this.user_service.updateUserPassword(user_id, hashed_new_password);

        return {};
    }

    async resetPassword(user_id: string, new_password: string, token: string) {
        const token_data = await this.verification_service.validatePasswordResetToken(token);

        if (!token_data) {
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }    
        // check that the 2 ids are same
        if (token_data.userId !== user_id) {
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }

        const user = await this.user_service.findUserById(user_id);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // check if new password is same as old password
        if (user.password) {
            const is_same_password = await bcrypt.compare(new_password, user.password);
            if (is_same_password) {
                throw new BadRequestException(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD);
            }
        }

        const hashed_password = await bcrypt.hash(new_password, 10);
        await this.user_service.updateUserPassword(user_id, hashed_password);
        return {};
    }

    async handleNotMe(token: string) {
        const user = await this.verification_service.validateNotMeLink(token);

        if (!user) {
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_LINK);
        }

        const pending_user_key = PENDING_USER_KEY(user.email);
        const pending_user = await this.redis_service.hget(pending_user_key);

        if (!pending_user) {
            throw new BadRequestException(ERROR_MESSAGES.ACCOUNT_ALREADY_VERIFIED);
        }

        // Clean up pending user data and OTP
        await this.redis_service.del(pending_user_key);
        await this.redis_service.del(OTP_KEY('email', user.email));

        return {};
    }

    async logout(refresh_token: string, res: Response) {
        try {
            const payload: any = await this.jwt_service.verifyAsync(
                refresh_token, 
                {
                    secret: process.env.JWT_REFRESH_SECRET,
                }
            );

            await this.redis_service.del(REFRESH_TOKEN_KEY(payload.jti));
            // Also remove from user's set
            const user_tokens_remove = USER_REFRESH_TOKENS_REMOVE(payload.id, payload.jti);
            await this.redis_service.srem(user_tokens_remove.key, user_tokens_remove.value);

            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            return {};
        } catch {
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }
    }

    async logoutAll(refresh_token: string, res: Response) {
        try {
            const payload: any = await this.jwt_service.verifyAsync(
                refresh_token, 
                {
                    secret: process.env.JWT_REFRESH_SECRET,
                }
            );

            // to logout from all devices, we need to get all JTIs for this user and delete them
            const user_tokens_key = USER_REFRESH_TOKENS_KEY(payload.id);
            const tokens = await this.redis_service.smembers(user_tokens_key);

            if (tokens.length > 0) {
                const pipeline = this.redis_service.pipeline();
                tokens.forEach(jti => pipeline.del(REFRESH_TOKEN_KEY(jti)));
                pipeline.del(user_tokens_key);
                await pipeline.exec();
            }

            res.clearCookie('refresh_token', {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            });

            return {};
        } catch {
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }
    }

    async refresh(token: string) {
        try {
            const payload: any = await this.jwt_service.verifyAsync(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const refresh_token_key = REFRESH_TOKEN_KEY(payload.jti);
            const exists = await this.redis_service.get(refresh_token_key);
            if (!exists)
                throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);

            await this.redis_service.del(refresh_token_key);

            return await this.generateTokens(payload.id);
        } catch (e) {
            console.log(e);
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }
    }

    async validateGoogleUser(google_user: GoogleLoginDTO) {
        let user = await this.user_service.findUserByGoogleId(google_user.google_id);

        if (user) {
            return user;
        }

        if (google_user.email) {
            user = await this.user_service.findUserByEmail(google_user.email);
            if (user) {
                // update avatar_url if the user doesn't have one
                let avatar_url = user.avatar_url;
                if (!avatar_url) {
                    avatar_url = google_user.avatar_url;
                }

                const updated_user = await this.user_service.updateUser(
                    user.id, 
                    {
                        google_id: google_user.google_id,
                        avatar_url: avatar_url,
                    }
                );

                if (!updated_user) {
                    throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
                }

                return updated_user;
            }
        }

        return await this.user_service.createUser({
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
        let user = await this.user_service.findUserByFacebookId(
            facebook_user.facebook_id,
        );

        if (user) {
            return user;
        }

        if (facebook_user.email) {
            user = await this.user_service.findUserByEmail(facebook_user.email);
            if (user) {
                let avatar_url = user.avatar_url;
                if (!avatar_url) {
                    avatar_url = facebook_user.avatar_url;
                }

                const updated_user = await this.user_service.updateUser(
                    user.id, 
                    {
                        facebook_id: facebook_user.facebook_id,
                        avatar_url: avatar_url,
                    }
                );

                if (!updated_user) {
                    throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
                }

                return updated_user;
            }
        }

        return await this.user_service.createUser({
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
        let user = await this.user_service.findUserByGithubId(github_user.github_id);
        if (user) {
            return user;
        }

        user = await this.user_service.findUserByEmail(github_user.email);
        if (user) {
            let avatar_url = user.avatar_url;
            if (!avatar_url) {
                avatar_url = github_user.avatar_url;
            }

            const updated_user = await this.user_service.updateUser(
                user.id,
                {
                    github_id: github_user.github_id,
                    avatar_url: avatar_url,
                }
            );

            if (!updated_user) {
                throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
            }

            return updated_user;
        }

        return await this.user_service.createUser({
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