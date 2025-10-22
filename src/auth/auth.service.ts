import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { SignupStep1Dto } from './dto/signup-step1.dto';
import { SignupStep2Dto } from './dto/signup-step2.dto';
import { SignupStep3Dto } from './dto/signup-step3.dto';
import { OAuthCompletionStep1Dto } from './dto/oauth-completion-step1.dto';
import { OAuthCompletionStep2Dto } from './dto/oauth-completion-step2.dto';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { UsernameService } from './username.service';
import { LoginDTO } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/communication/email.service';
import { GitHubUserDto } from './dto/github-user.dto';
import { CaptchaService } from './captcha.service';
import * as crypto from 'crypto';
import { GoogleLoginDTO } from './dto/google-login.dto';
import { FacebookLoginDTO } from './dto/facebook-login.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { generateOtpEmailHtml } from 'src/templates/otp-email';
import { reset_password_email_object, verification_email_object } from 'src/constants/variables';
import { instanceToPlain } from 'class-transformer';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import {
    OAUTH_SESSION_KEY,
    OAUTH_SESSION_OBJECT,
    OTP_KEY,
    REFRESH_TOKEN_KEY,
    REFRESH_TOKEN_OBJECT,
    SIGNUP_SESSION_KEY,
    SIGNUP_SESSION_OBJECT,
    USER_REFRESH_TOKENS_ADD,
    USER_REFRESH_TOKENS_KEY,
    USER_REFRESH_TOKENS_REMOVE,
} from 'src/constants/redis';
import { StringValue } from 'ms'; // Add this import
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwt_service: JwtService,
        private readonly user_service: UserService,
        private readonly username_service: UsernameService,
        private readonly redis_service: RedisService,
        private readonly verification_service: VerificationService,
        private readonly email_service: EmailService,
        private readonly captcha_service: CaptchaService,
        private readonly config_service: ConfigService
    ) {}

    async generateTokens(id: string) {
        const access_token = this.jwt_service.sign(
            { id },
            {
                secret: process.env.JWT_TOKEN_SECRET ?? 'fallback-secret', // Optional: Add fallback for safety
                expiresIn: (process.env.JWT_TOKEN_EXPIRATION_TIME ?? '1h') as StringValue, // Fix here
            }
        );

        const refresh_payload = { id, jti: crypto.randomUUID() };
        const refresh_token = this.jwt_service.sign(refresh_payload, {
            secret: process.env.JWT_REFRESH_SECRET ?? 'fallback-refresh-secret',
            expiresIn: (process.env.JWT_REFRESH_EXPIRATION_TIME ?? '7d') as StringValue,
        });

        const refresh_redis_object = REFRESH_TOKEN_OBJECT(refresh_payload.jti, id);
        await this.redis_service.set(
            refresh_redis_object.key,
            refresh_redis_object.value,
            refresh_redis_object.ttl
        );

        const user_tokens_add = USER_REFRESH_TOKENS_ADD(id, refresh_payload.jti);
        await this.redis_service.sadd(user_tokens_add.key, user_tokens_add.value);
        await this.redis_service.expire(user_tokens_add.key, user_tokens_add.ttl);

        return {
            access_token: access_token,
            refresh_token: refresh_token,
        };
    }

    async getRecommendedUsernames(name: string): Promise<string[]> {
        const name_parts = name.split(' ');
        const first_name = name_parts[0];
        const last_name = name_parts.length > 1 ? name_parts.slice(1).join(' ') : '';

        const recommendations = await this.username_service.generateUsernameRecommendations(
            first_name,
            last_name
        );

        return recommendations;
    }

    async validateUser(identifier: string, password: string, type: string): Promise<string> {
        const user = type === 'email'
            ? await this.user_service.findUserByEmail(identifier)
            : type === 'phone_number'
                ? await this.user_service.findUserByPhoneNumber(identifier)
                : await this.user_service.findUserByUsername(identifier);

        if (!user) {
            if (type !== 'email') {
                throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
            }

            const signup_session_key = SIGNUP_SESSION_KEY(identifier);
            const unverified_user = await this.redis_service.hget(signup_session_key);
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
            if (!is_password_valid) throw new UnauthorizedException(ERROR_MESSAGES.WRONG_PASSWORD);
        } else {
            throw new UnauthorizedException(ERROR_MESSAGES.SOCIAL_LOGIN_REQUIRED);
        }

        return user.id;
    }

    async signupStep1(dto: SignupStep1Dto) {
        const { name, birth_date, email, captcha_token } = dto;

        // Verify CAPTCHA first (uncomment in production)
        // try {
        //     await this.captcha_service.validateCaptcha(captcha_token);
        // } catch (error) {
        //     throw new BadRequestException(ERROR_MESSAGES.CAPTCHA_VERIFICATION_FAILED);
        // }

        const existing_user = await this.user_service.findUserByEmail(email);
        if (existing_user) {
            throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        const signup_session_key = SIGNUP_SESSION_KEY(email);
        const existing_session = await this.redis_service.hget(signup_session_key);
        if (existing_session) {
            throw new ConflictException({ message: ERROR_MESSAGES.SIGNUP_SESSION_ALREADY_EXISTS, current_step: existing_session.step });
        }

        const signup_session_object = SIGNUP_SESSION_OBJECT(email, {
            name,
            birth_date,
            email,
            step: '1',
            email_verified: 'false',
        });

        await this.redis_service.hset(
            signup_session_object.key,
            signup_session_object.value,
            signup_session_object.ttl
        );

        await this.generateEmailVerification(email);

        return { isEmailSent: true };
    }

    async signupStep2(dto: SignupStep2Dto) {
        const { email, token } = dto;

        const signup_session_key = SIGNUP_SESSION_KEY(email);
        const signup_session = await this.redis_service.hget(signup_session_key);

        if (!signup_session) {
            throw new NotFoundException(ERROR_MESSAGES.SIGNUP_SESSION_NOT_FOUND);
        }

        const is_valid = await this.verification_service.validateOtp(email, token, 'email');
        if (!is_valid) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }

        // Update session to mark email as verified
        const updated_session = SIGNUP_SESSION_OBJECT(email, {
            ...signup_session,
            step: '2',
            email_verified: 'true',
        });

        await this.redis_service.hset(
            updated_session.key,
            updated_session.value,
            updated_session.ttl
        );

        // generate username recommendations for step 3
        const recommendations = await this.getRecommendedUsernames(signup_session.name);

        return {
            isVerified: true,
            recommendations,
        };
    }

    async signupStep3(dto: SignupStep3Dto) {
        const { email, password, username, language } = dto;

        const signup_session_key = SIGNUP_SESSION_KEY(email);
        const signup_session = await this.redis_service.hget(signup_session_key);

        if (!signup_session || signup_session.email_verified !== 'true') {
            throw new NotFoundException(ERROR_MESSAGES.SIGNUP_SESSION_NOT_FOUND);
        }

        const hashed_password = await bcrypt.hash(password, 10);
        const user_data: any = {
            email: signup_session.email,
            name: signup_session.name,
            birth_date: new Date(signup_session.birth_date),
            username,
            password: hashed_password,
            language: language || 'en',
        };
        const created_user = await this.user_service.createUser(user_data);

        if (!created_user) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB);
        }

        // Generate tokens for automatic login
        const { access_token, refresh_token } = await this.generateTokens(created_user.id);

        // Clean up
        await this.redis_service.del(signup_session_key);
        const otp_key = OTP_KEY('email', email);
        await this.redis_service.del(otp_key);

        // Return user data with tokens for automatic login
        const user = instanceToPlain(created_user);

        return {
            user_id: created_user.id,
            access_token,
            refresh_token,
        };
    }

    async checkIdentifier(identifier: string) {
        let identifier_type: string = '';
        let user: User | null = null;

        if (identifier.includes('@')) {
            identifier_type = 'email';
            user = await this.user_service.findUserByEmail(identifier);
        } else if (/^[\+]?[0-9\-\(\)\s]+$/.test(identifier)) {
            identifier_type = 'phone_number';
            user = await this.user_service.findUserByPhoneNumber(identifier);
        } else {
            identifier_type = 'username';
            user = await this.user_service.findUserByUsername(identifier);
        }

        if (!user) {
            throw new NotFoundException(
                identifier_type === 'email'
                    ? ERROR_MESSAGES.EMAIL_NOT_FOUND
                    : identifier_type === 'phone_number'
                      ? ERROR_MESSAGES.PHONE_NUMBER_NOT_FOUND
                      : ERROR_MESSAGES.USERNAME_NOT_FOUND
            );
        }

        return {
            identifier_type: identifier_type,
        };
    }

    async login(login_dto: LoginDTO) {
        const id = await this.validateUser(login_dto.identifier, login_dto.password, login_dto.type);

        const user_instance = await this.user_service.findUserById(id);
        if (!user_instance) {
            throw new InternalServerErrorException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const user = instanceToPlain(user_instance);

        const { access_token, refresh_token } = await this.generateTokens(id);

        return { user, access_token, refresh_token };
    }

    async generateEmailVerification(email: string) {
        const signup_session_key = SIGNUP_SESSION_KEY(email);
        const user = await this.redis_service.hget(signup_session_key);

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND_OR_VERIFIED);
        }

        const otp = await this.verification_service.generateOtp(email, 'email');
        const not_me_link = await this.verification_service.generateNotMeLink(
            email,
            `${process.env.BACKEND_URL}/auth/not-me`
        );

        const { subject, title, description, subtitle, subtitle_description } =
            verification_email_object(otp, not_me_link);
        const html = generateOtpEmailHtml(
            title,
            description,
            otp,
            subtitle,
            subtitle_description,
            user.name
        );

        const email_sent = await this.email_service.sendEmail({
            subject: subject,
            recipients: [{ name: user.name ?? '', address: email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL);
        }

        return { isEmailSent: true };
    }

    async sendResetPasswordEmail(email: string) {
        const user = await this.user_service.findUserByEmail(email);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const otp = await this.verification_service.generateOtp(user.id, 'password');
        const username = user.username;

        const { subject, title, description, subtitle, subtitle_description } =
            reset_password_email_object(username);
        const html = generateOtpEmailHtml(
            title,
            description,
            otp,
            subtitle,
            subtitle_description,
            username
        );

        const email_sent = await this.email_service.sendEmail({
            subject: subject,
            recipients: [{ name: user.name ?? '', address: email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL);
        }

        return { isEmailSent: true };
    }

    async verifyResetPasswordOtp(user_id: string, token: string) {
        const is_valid = await this.verification_service.validateOtp(user_id, token, 'password');

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

        const signup_session_key = SIGNUP_SESSION_KEY(user.email);
        const signup_session = await this.redis_service.hget(signup_session_key);

        if (!signup_session) {
            throw new BadRequestException(ERROR_MESSAGES.SIGNUP_SESSION_NOT_FOUND);
        }

        // Clean up signup session and OTP
        await this.redis_service.del(signup_session_key);
        await this.redis_service.del(OTP_KEY('email', user.email));

        return {};
    }

    async logout(refresh_token: string, res: Response) {
        try {
            const payload: any = await this.jwt_service.verifyAsync(refresh_token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

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
            const payload: any = await this.jwt_service.verifyAsync(refresh_token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // to logout from all devices, we need to get all JTIs for this user and delete them
            const user_tokens_key = USER_REFRESH_TOKENS_KEY(payload.id);
            const tokens = await this.redis_service.smembers(user_tokens_key);

            if (tokens.length > 0) {
                const pipeline = this.redis_service.pipeline();
                tokens.forEach((jti) => pipeline.del(REFRESH_TOKEN_KEY(jti)));
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
            if (!exists) throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);

            await this.redis_service.del(refresh_token_key);

            return await this.generateTokens(payload.id);
        } catch (e) {
            console.log(e);
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }
    }

    async updateUsername(user_id: string, new_username: string) {
        const user = await this.user_service.findUserById(user_id);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check if username is already taken
        const is_available = await this.username_service.isUsernameAvailable(new_username);
        if (!is_available) {
            throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);
        }

        await this.user_service.updateUser(user_id, { username: new_username });
        return {
            username: new_username,
        };
    }

    async updateEmail(user_id: string, new_email: string) {
        const user = await this.user_service.findUserById(user_id);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const existing_user = await this.user_service.findUserByEmail(new_email);
        if (existing_user) {
            throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        // I will not use the old key here to avoid conflicts with signup flow (if there is one ongoing)
        const otp = await this.verification_service.generateOtp(user_id + '_email_update', 'email');
        const email_update_session_key = `email_update:${user_id}`;
        await this.redis_service.set(email_update_session_key, new_email, 3600); // 1 hour

        // Send OTP email
        const { subject, title, description, subtitle, subtitle_description } = {
            subject: 'Email Update Verification',
            title: 'Verify Your New Email Address',
            description: `Please use the following code to verify your new email address:`,
            subtitle: 'Security Notice',
            subtitle_description:
                "If you didn't request this email change, please ignore this message.",
        };

        const html = generateOtpEmailHtml(
            title,
            description,
            otp,
            subtitle,
            subtitle_description,
            user.username || user.name
        );

        const email_sent = await this.email_service.sendEmail({
            subject: subject,
            recipients: [{ name: user.name ?? '', address: new_email }],
            html,
        });

        if (!email_sent) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL);
        }

        return {
            new_email,
            verification_sent: true,
        };
    }

    async verifyUpdateEmail(user_id: string, new_email: string, otp: string) {
        const user = await this.user_service.findUserById(user_id);
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const is_valid = await this.verification_service.validateOtp(
            user_id + '_email_update',
            otp,
            'email'
        );
        if (!is_valid) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }

        // Check if the new_email matches what was stored
        const email_update_session_key = `email_update:${user_id}`;
        const stored_email = await this.redis_service.get(email_update_session_key);
        if (!stored_email || stored_email !== new_email) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);
        }

        // Check if email is still available
        const existing_user = await this.user_service.findUserByEmail(new_email);
        if (existing_user) {
            throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        // Update user email
        await this.user_service.updateUser(user_id, { email: new_email });

        // Clean up
        await this.redis_service.del(email_update_session_key);
        const otp_key = OTP_KEY('email', user_id + '_email_update');
        await this.redis_service.del(otp_key);

        return {
            email: new_email,
        };
    }

    // ####################### GitHub OAuth Routes ########################

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

                const updated_user = await this.user_service.updateUser(user.id, {
                    google_id: google_user.google_id,
                    avatar_url: avatar_url,
                });

                if (!updated_user) {
                    throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
                }

                return {
                    user: updated_user,
                    needs_completion: false,
                };
            }
        }

        const last_name = google_user.last_name ? google_user.last_name : '';
        let name = google_user.first_name + ' ' + last_name;
        name = name.trim();

        // If user doesn't exist, we need to create an OAuth completion session
        // The frontend will need to handle this by redirecting to completion flow
        return {
            needs_completion: true,
            user: {
                email: google_user.email,
                name: name,
                avatar_url: google_user.avatar_url,
                google_id: google_user.google_id,
            },
        };
    }

    async validateFacebookUser(facebook_user: FacebookLoginDTO) {
        let user = await this.user_service.findUserByFacebookId(facebook_user.facebook_id);

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

                const updated_user = await this.user_service.updateUser(user.id, {
                    facebook_id: facebook_user.facebook_id,
                    avatar_url: avatar_url,
                });

                if (!updated_user) {
                    throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
                }

                return {
                    user: updated_user,
                    needs_completion: false,
                };
            }
        }

        const last_name = facebook_user.last_name ? facebook_user.last_name : '';
        let name = facebook_user.first_name + ' ' + last_name;
        name = name.trim();

        return {
            needs_completion: true,
            user: {
                email: facebook_user.email,
                name: name,
                avatar_url: facebook_user.avatar_url,
                facebook_id: facebook_user.facebook_id,
            },
        };
    }

    async validateGitHubUser(github_user: GitHubUserDto) {
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

            const updated_user = await this.user_service.updateUser(user.id, {
                github_id: github_user.github_id,
                avatar_url: avatar_url,
            });

            if (!updated_user) {
                throw new InternalServerErrorException(ERROR_MESSAGES.FAILED_TO_UPDATE_IN_DB);
            }

            return {
                user: updated_user,
                needs_completion: false,
            };
        }

        const last_name = github_user.last_name ? github_user.last_name : '';
        let name = github_user.first_name + ' ' + last_name;
        name = name.trim();

        return {
            needs_completion: true,
            user: {
                email: github_user.email,
                name: name,
                avatar_url: github_user.avatar_url,
                github_id: github_user.github_id,
            },
        };
    }

    // ###################### MOBILE OAUTH VERIFICATION ######################    

    async verifyGoogleMobileToken(access_token: string) {
        try {
            const client = new OAuth2Client()

            // Verify the Google ID token
            const ticket = await client.verifyIdToken({
                idToken: access_token,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                throw new UnauthorizedException(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID);
            }

            if (!payload['email']) {
                throw new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_PROVIDED_BY_OAUTH_GITHUB);
            }

            const googleUser: GoogleLoginDTO = {
                google_id: payload['sub'],
                email: payload['email'],
                first_name: payload['given_name'] || '',
                last_name: payload['family_name'] || '',
                avatar_url: payload['picture'],
            };

            return await this.validateGoogleUser(googleUser);
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
                throw error;
            }
            console.error('Error verifying Google mobile token:', error);
            throw new UnauthorizedException(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID);
        }
    }

    async verifyGitHubMobileToken(access_token: string) {
        try {
            // Make a request to GitHub's user API to get user info
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'YourAppName'
                }
            });

            if (!response.ok) {
                throw new UnauthorizedException(ERROR_MESSAGES.GITHUB_TOKEN_INVALID);
            }

            const userData = await response.json();

            // Get user's primary email (GitHub doesn't always include email in user endpoint)
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'YourAppName'
                }
            });

            let email = userData.email; // This might be null
            if (!email && emailResponse.ok) {
                const emails = await emailResponse.json();
                const primaryEmail = emails.find((e: any) => e.primary && e.verified);
                email = primaryEmail?.email;
            }

            if (!email) {
                throw new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_PROVIDED_BY_OAUTH_GITHUB);
            }

            // Parse the name from GitHub's name field or fallback to login
            const fullName = userData.name || userData.login || '';
            const nameParts = fullName.trim().split(' ');
            const first_name = nameParts[0] || '';
            const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            const githubUser: GitHubUserDto = {
                github_id: userData.id.toString(),
                email: email,
                first_name: first_name,
                last_name: last_name,
                avatar_url: userData.avatar_url,
            };

            return await this.validateGitHubUser(githubUser);
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
                throw error;
            }
            console.error('Error verifying GitHub mobile token:', error);
            throw new UnauthorizedException(ERROR_MESSAGES.GITHUB_TOKEN_INVALID);
        }
    }

    // ###################### OAUTH COMPLETION FLOW ######################

    async createOAuthSession(user_data: Record<string, any>): Promise<string> {
        const session_key = user_data.email;
        const oauth_session_data = OAUTH_SESSION_OBJECT(session_key, user_data);

        await this.redis_service.hset(
            oauth_session_data.key,
            oauth_session_data.value,
            oauth_session_data.ttl
        );

        return session_key;
    }

    async oauthCompletionStep1(dto: OAuthCompletionStep1Dto) {
        const { oauth_session_token, birth_date } = dto;

        // Get OAuth session data
        const session_data = await this.redis_service.hget(OAUTH_SESSION_KEY(oauth_session_token));
        if (!session_data) {
            throw new NotFoundException(ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN);
        }

        const user_data = JSON.parse(session_data.user_data);

        // Update session with birth_date
        const updated_session_data = OAUTH_SESSION_OBJECT(oauth_session_token, {
            ...user_data,
            birth_date,
        });

        await this.redis_service.hset(
            updated_session_data.key,
            updated_session_data.value,
            updated_session_data.ttl
        );

        const recommendations = await this.getRecommendedUsernames(user_data.name);

        return {
            usernames: recommendations,
            token: oauth_session_token,
            nextStep: 'choose-username',
        };
    }

    async oauthCompletionStep2(dto: OAuthCompletionStep2Dto) {
        const { oauth_session_token, username } = dto;

        // Get OAuth session data
        const session_data = await this.redis_service.hget(OAUTH_SESSION_KEY(oauth_session_token));
        if (!session_data) {
            throw new NotFoundException(ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN);
        }

        const user_data = JSON.parse(session_data.user_data);

        // Check if username is available
        const is_username_available = await this.username_service.isUsernameAvailable(username);
        if (!is_username_available) {
            throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);
        }

        // Create the user
        const user = await this.user_service.createUser({
            email: user_data.email,
            name: user_data.name,
            username: username,
            birth_date: new Date(user_data.birth_date),
            password: '', // OAuth users don't have passwords
            phone_number: '',
            google_id: user_data.google_id || null,
            facebook_id: user_data.facebook_id || null,
            github_id: user_data.github_id || null,
            avatar_url: user_data.avatar_url || null,
        });

        // Clean up OAuth session
        await this.redis_service.del(OAUTH_SESSION_KEY(oauth_session_token));

        // Generate tokens
        const { access_token, refresh_token } = await this.generateTokens(user.id);

        return {
            user: instanceToPlain(user),
            access_token,
            refresh_token,
        };
    }
}
