import {
    BadRequestException,
    Controller,
    Get,
    InternalServerErrorException,
    Param,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { SignupStep1Dto } from './dto/signup-step1.dto';
import { SignupStep2Dto } from './dto/signup-step2.dto';
import { SignupStep3Dto } from './dto/signup-step3.dto';
import { OAuthCompletionStep1Dto } from './dto/oauth-completion-step1.dto';
import { OAuthCompletionStep2Dto } from './dto/oauth-completion-step2.dto';
import { Body } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordAuthDTO } from './dto/change-password-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';
import { CheckIdentifierDto } from './dto/check-identifier.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { VerifyUpdateEmailDto } from './dto/verify-update-email.dto';
import { MobileGoogleAuthDto } from './dto/mobile-google-auth.dto';
import { MobileGitHubAuthDto } from './dto/mobile-github-auth.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import {
    ApiBearerAuth,
    ApiBody,
    ApiCookieAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { GitHubAuthGuard } from './guards/github.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { GetUserId } from 'src/decorators/get-user_id.decorator';
import {
    ApiBadRequestErrorResponse,
    ApiConflictErrorResponse,
    ApiForbiddenErrorResponse,
    ApiInternalServerError,
    ApiNotFoundErrorResponse,
    ApiUnauthorizedErrorResponse,
    ApiUnprocessableEntityErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import {
    captcha_swagger,
    change_password_swagger,
    check_identifier_swagger,
    facebook_callback_swagger,
    facebook_oauth_swagger,
    forget_password_swagger,
    generate_otp_swagger,
    github_callback_swagger,
    github_mobile_swagger,
    github_oauth_swagger,
    google_callback_swagger,
    google_mobile_swagger,
    google_oauth_swagger,
    login_swagger,
    logout_all_swagger,
    logout_swagger,
    not_me_swagger,
    oauth_completion_step1_swagger,
    oauth_completion_step2_swagger,
    refresh_token_swagger,
    reset_password_swagger,
    signup_step1_swagger,
    signup_step2_swagger,
    signup_step3_swagger,
    update_email_swagger,
    update_username_swagger,
    verify_email_swagger,
    verify_reset_otp_swagger,
    verify_update_email_swagger,
} from './auth.swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth_service: AuthService) {}

    private httpOnlyRefreshToken(response: Response, refresh: string) {
        const is_production = process.env.NODE_ENV === 'production';

        response.cookie('refresh_token', refresh, {
            httpOnly: true,
            secure: is_production,
            sameSite: is_production ? 'strict' : 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    @ApiOperation(signup_step1_swagger.operation)
    @ApiBody({ type: SignupStep1Dto })
    @ApiCreatedResponse(signup_step1_swagger.responses.success)
    @ApiConflictErrorResponse(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.SIGNUP_STEP1_COMPLETED)
    @Post('signup/step1')
    async signupStep1(@Body() dto: SignupStep1Dto) {
        return this.auth_service.signupStep1(dto);
    }

    @ApiOperation(signup_step2_swagger.operation)
    @ApiBody({ type: SignupStep2Dto })
    @ApiOkResponse(signup_step2_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.SIGNUP_SESSION_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.SIGNUP_STEP2_COMPLETED)
    @Post('signup/step2')
    async signupStep2(@Body() dto: SignupStep2Dto) {
        return this.auth_service.signupStep2(dto);
    }

    @ApiOperation(signup_step3_swagger.operation)
    @ApiBody({ type: SignupStep3Dto })
    @ApiCreatedResponse(signup_step3_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.SIGNUP_SESSION_NOT_FOUND)
    @ApiConflictErrorResponse(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB)
    @ResponseMessage(SUCCESS_MESSAGES.SIGNUP_STEP3_COMPLETED)
    @Post('signup/step3')
    async signupStep3(@Body() dto: SignupStep3Dto, @Res({ passthrough: true }) response: Response) {
        const { user, access_token, refresh_token } = await this.auth_service.signupStep3(dto);

        this.httpOnlyRefreshToken(response, refresh_token);
        return { user, access_token };
    }

    @ApiOperation(login_swagger.operation)
    @ApiBody({ type: LoginDTO })
    @ApiOkResponse(login_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.WRONG_PASSWORD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.EMAIL_NOT_VERIFIED)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_IN)
    @Post('login')
    async login(@Body() login_dto: LoginDTO, @Res({ passthrough: true }) response: Response) {
        const { access_token, refresh_token, user } = await this.auth_service.login(login_dto);

        this.httpOnlyRefreshToken(response, refresh_token);
        return { access_token, user };
    }

    @ApiOperation(generate_otp_swagger.operation)
    @ApiBody({ type: ResendOtpDto })
    @ApiCreatedResponse(generate_otp_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.OTP_REQUEST_WAIT)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND_OR_VERIFIED)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.OTP_GENERATED)
    @Post('resend-otp')
    async generateEmailVerification(@Body() resend_otp_dto: ResendOtpDto) {
        const { email } = resend_otp_dto;
        return this.auth_service.generateEmailVerification(email);
    }

    @ApiOperation(not_me_swagger.operation)
    @ApiQuery(not_me_swagger.api_query)
    @ApiOkResponse(not_me_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.ACCOUNT_ALREADY_VERIFIED)
    @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_REMOVED)
    @Get('not-me')
    async handleNotMe(@Query('token') token: string) {
        return this.auth_service.handleNotMe(token);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(change_password_swagger.operation)
    @ApiBody({ type: ChangePasswordAuthDTO })
    @ApiOkResponse(change_password_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.PASSWORD_CONFIRMATION_MISMATCH)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.WRONG_PASSWORD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_CHANGED)
    @Post('change-password')
    async changePassword(@Body() body: ChangePasswordAuthDTO, @GetUserId() user_id: string) {
        const { old_password, new_password } = body;
        return this.auth_service.changePassword(user_id, old_password, new_password);
    }

    @ApiOperation(forget_password_swagger.operation)
    @ApiBody({ type: ForgetPasswordDto })
    @ApiOkResponse(forget_password_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_RESET_OTP_SENT)
    @Post('forget-password')
    async forgetPassword(@Body() body: ForgetPasswordDto) {
        return this.auth_service.sendResetPasswordEmail(body.identifier);
    }

    @ApiOperation(verify_reset_otp_swagger.operation)
    @ApiBody({ type: VerifyPasswordResetOtpDto })
    @ApiOkResponse(verify_reset_otp_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnprocessableEntityErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.OTP_VERIFIED)
    @Post('password/verify-otp')
    async verifyResetPasswordOtp(@Body() verify_password_reset_otp_dto: VerifyPasswordResetOtpDto) {
        const { token, identifier } = verify_password_reset_otp_dto;
        return this.auth_service.verifyResetPasswordOtp(identifier, token);
    }

    @ApiOperation(reset_password_swagger.operation)
    @ApiBody({ type: ResetPasswordDto })
    @ApiOkResponse(reset_password_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_RESET)
    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        const { new_password, reset_token, identifier } = body;
        return this.auth_service.resetPassword(identifier, new_password, reset_token);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(logout_swagger.operation)
    @ApiCookieAuth('refresh_token')
    @ApiOkResponse(logout_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_OUT)
    @Post('logout')
    async logout(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
        const refresh_token = req.cookies['refresh_token'];
        if (!refresh_token) throw new BadRequestException('No refresh token provided');
        return await this.auth_service.logout(refresh_token, response);
    }

    @ApiBearerAuth('JWT-auth')
    @ApiCookieAuth('refresh_token')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(logout_all_swagger.operation)
    @ApiOkResponse(logout_all_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_OUT_ALL)
    @Post('logout-all')
    async logoutAll(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
        const refresh_token = req.cookies['refresh_token'];
        if (!refresh_token) throw new BadRequestException('No refresh token provided');
        return await this.auth_service.logoutAll(refresh_token, response);
    }

    @ApiCookieAuth('refresh_token')
    @ApiOperation(refresh_token_swagger.operation)
    @ApiOkResponse(refresh_token_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.NEW_ACCESS_TOKEN)
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
        const refresh_token_cookie = req.cookies['refresh_token'];
        if (!refresh_token_cookie) throw new BadRequestException('No refresh token provided');

        const { access_token, refresh_token } =
            await this.auth_service.refresh(refresh_token_cookie);
        this.httpOnlyRefreshToken(response, refresh_token);
        return { access_token };
    }

    @ApiOperation(captcha_swagger.operation)
    @ApiResponse(captcha_swagger.responses.success)
    @ResponseMessage('ReCAPTCHA site key retrieved successfully')
    @Get('captcha/site-key')
    getCaptchaSiteKey() {
        return {
            siteKey: process.env.RECAPTCHA_SITE_KEY || '',
        };
    }

    @ApiOperation(check_identifier_swagger.operation)
    @ApiBody({ type: CheckIdentifierDto })
    @ApiOkResponse(check_identifier_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USERNAME_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.IDENTIFIER_AVAILABLE)
    @Post('check-identifier')
    async checkIdentifier(@Body() dto: CheckIdentifierDto) {
        const { identifier } = dto;
        return this.auth_service.checkIdentifier(identifier);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(update_username_swagger.operation)
    @ApiBody({ type: UpdateUsernameDto })
    @ApiOkResponse(update_username_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiConflictErrorResponse(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.USERNAME_UPDATED)
    @Post('update-username')
    async updateUsername(@Body() dto: UpdateUsernameDto, @GetUserId() user_id: string) {
        return this.auth_service.updateUsername(user_id, dto.username);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(update_email_swagger.operation)
    @ApiBody({ type: UpdateEmailDto })
    @ApiOkResponse(update_email_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiConflictErrorResponse(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.EMAIL_UPDATE_INITIATED)
    @Post('update-email')
    async updateEmail(@Body() dto: UpdateEmailDto, @GetUserId() user_id: string) {
        return this.auth_service.updateEmail(user_id, dto.new_email);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(verify_update_email_swagger.operation)
    @ApiBody({ type: VerifyUpdateEmailDto })
    @ApiOkResponse(verify_update_email_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.EMAIL_UPDATED)
    @Post('update-email/verify')
    async verifyUpdateEmail(@Body() dto: VerifyUpdateEmailDto, @GetUserId() user_id: string) {
        return this.auth_service.verifyUpdateEmail(user_id, dto.new_email, dto.otp);
    }

    /* 
        ######################### Google OAuth Routes #########################
    */

    @UseGuards(GoogleAuthGuard)
    @ApiOperation(google_oauth_swagger.operation)
    @ApiResponse(google_oauth_swagger.responses.success)
    @ApiResponse(google_oauth_swagger.responses.InternalServerError)
    @Get('google')
    googleLogin() {}

    @ApiOperation(google_mobile_swagger.operation)
    @ApiBody({ type: MobileGoogleAuthDto })
    @ApiOkResponse(google_mobile_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.EMAIL_NOT_PROVIDED_BY_OAUTH_GOOGLE)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_IN)
    @Post('mobile/google')
    async mobileGoogleAuth(
        @Body() dto: MobileGoogleAuthDto,
        @Res({ passthrough: true }) response: Response
    ) {
        const result = await this.auth_service.verifyGoogleMobileToken(dto.access_token);

        // Check if user needs to complete OAuth registration
        if ('needs_completion' in result && result.needs_completion) {
            const session_token = await this.auth_service.createOAuthSession(result.user);
            return {
                needs_completion: true,
                session_token: session_token,
                provider: 'google',
            };
        }

        if (!('user' in result) || !('id' in result.user)) {
            throw new BadRequestException(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID);
        }

        const user = result.user;
        const { access_token, refresh_token } = await this.auth_service.generateTokens(user.id);
        this.httpOnlyRefreshToken(response, refresh_token);

        return {
            access_token,
            user: user,
        };
    }

    @UseGuards(GoogleAuthGuard)
    @ApiOperation(google_callback_swagger.operation)
    @ApiResponse(google_callback_swagger.responses.success)
    @ApiResponse(google_callback_swagger.responses.AuthFail)
    @Get('google/callback')
    async googleLoginCallback(@Req() req, @Res() res) {
        try {
            // if the user doesn't have a record for that email in DB, we will need to redirect the user to complete his data
            if (req.user?.needs_completion) {
                const session_token = await this.auth_service.createOAuthSession(req.user.user);
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/oauth-complete?session=${encodeURIComponent(session_token)}&provider=google`
                );
            }

            // Check if user authentication failed but no completion required
            if (!req.user) {
                console.log('Google authentication failed - no user found');
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`
                );
            }

            // Normal OAuth flow for existing users
            const { access_token, refresh_token } = await this.auth_service.generateTokens(
                req.user.id
            );

            // Set refresh token in HTTP-only cookie
            this.httpOnlyRefreshToken(res, refresh_token);

            // Redirect to frontend with access token
            const frontend_url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontend_url);
        } catch (error) {
            console.log('Google callback error:', error);
            return res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`
            );
        }
    }

    /* 
        ######################### Facebook OAuth Routes #########################
    */

    @UseGuards(FacebookAuthGuard)
    @ApiOperation(facebook_oauth_swagger.operation)
    @ApiResponse(facebook_oauth_swagger.responses.success)
    @ApiResponse(facebook_oauth_swagger.responses.InternalServerError)
    @Get('facebook')
    facebookLogin() {}

    @UseGuards(FacebookAuthGuard)
    @ApiOperation(facebook_callback_swagger.operation)
    @ApiResponse(facebook_callback_swagger.responses.success)
    @ApiResponse(facebook_callback_swagger.responses.AuthFail)
    @Get('facebook/callback')
    async facebookLoginCallback(@Req() req, @Res() res) {
        try {
            // if the user doesn't have a record for that email in DB, we will need to redirect the user to complete his data
            if (req.user?.needs_completion) {
                const session_token = await this.auth_service.createOAuthSession(req.user.user);
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/oauth-complete?session=${encodeURIComponent(session_token)}&provider=facebook`
                );
            }

            // Check if user authentication failed but no completion required
            if (!req.user) {
                console.log('Facebook authentication failed - no user found');
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`
                );
            }

            // Normal OAuth flow for existing users
            const { access_token, refresh_token } = await this.auth_service.generateTokens(
                req.user.id
            );

            // Set refresh token in HTTP-only cookie
            this.httpOnlyRefreshToken(res, refresh_token);

            // Redirect to frontend with access token
            const frontend_url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontend_url);
        } catch (error) {
            console.log('Facebook callback error:', error);
            return res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`
            );
        }
    }

    /* 
        ######################### GitHub OAuth Routes #########################
    */

    @UseGuards(GitHubAuthGuard)
    @ApiOperation(github_oauth_swagger.operation)
    @ApiResponse(github_oauth_swagger.responses.success)
    @ApiResponse(github_oauth_swagger.responses.InternalServerError)
    @Get('github')
    async githubLogin() {}

    @ApiOperation(github_mobile_swagger.operation)
    @ApiBody({ type: MobileGitHubAuthDto })
    @ApiOkResponse(github_mobile_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.GITHUB_TOKEN_INVALID)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.EMAIL_NOT_PROVIDED_BY_OAUTH_GITHUB)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_IN)
    @Post('mobile/github')
    async mobileGitHubAuth(
        @Body() dto: MobileGitHubAuthDto,
        @Res({ passthrough: true }) response: Response
    ) {
        const result = await this.auth_service.verifyGitHubMobileToken(
            dto.code,
            dto.redirect_uri,
            dto.code_verifier
        );

        if ('needs_completion' in result && result.needs_completion) {
            const session_token = await this.auth_service.createOAuthSession(result.user);
            return {
                needs_completion: true,
                session_token: session_token,
                provider: 'github',
            };
        }

        if (!('user' in result) || !('id' in result.user)) {
            throw new BadRequestException(ERROR_MESSAGES.GITHUB_TOKEN_INVALID);
        }

        const user = result.user;
        const { access_token, refresh_token } = await this.auth_service.generateTokens(user.id);
        this.httpOnlyRefreshToken(response, refresh_token);

        return {
            access_token,
            user: user,
        };
    }

    @UseGuards(GitHubAuthGuard)
    @ApiOperation(github_callback_swagger.operation)
    @ApiResponse(github_callback_swagger.responses.success)
    @ApiResponse(github_callback_swagger.responses.AuthFail)
    @Get('github/callback')
    async githubCallback(@Req() req: any, @Res() res: Response) {
        try {
            // if the user doesn't have a record for that email in DB, we will need to redirect the user to complete his data
            if (req.user?.needs_completion) {
                const session_token = await this.auth_service.createOAuthSession(req.user.user);
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/oauth-complete?session=${encodeURIComponent(session_token)}&provider=github`
                );
            }

            // Check if user authentication failed but no completion required
            if (!req.user) {
                console.log('GitHub authentication failed - no user found');
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`
                );
            }

            // Normal OAuth flow for existing users
            const { access_token, refresh_token } = await this.auth_service.generateTokens(
                req.user.id
            );

            // Set refresh token in HTTP-only cookie
            this.httpOnlyRefreshToken(res, refresh_token);

            // Redirect to frontend with access token
            const frontend_url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontend_url);
        } catch (error) {
            console.log('Github callback error:', error);
            return res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`
            );
        }
    }

    // ###################### OAUTH COMPLETION FLOW ######################

    @ApiOperation(oauth_completion_step1_swagger.operation)
    @ApiBody({ type: OAuthCompletionStep1Dto })
    @ApiOkResponse(oauth_completion_step1_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.BIRTH_DATE_SET)
    @Post('oauth/complete/step1')
    async oauthCompletionStep1(@Body() dto: OAuthCompletionStep1Dto) {
        return this.auth_service.oauthCompletionStep1(dto);
    }

    @ApiOperation(oauth_completion_step2_swagger.operation)
    @ApiBody({ type: OAuthCompletionStep2Dto })
    @ApiCreatedResponse(oauth_completion_step2_swagger.responses.success)
    @ApiConflictErrorResponse(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.OAUTH_USER_REGISTERED)
    @Post('oauth/complete/step2')
    async oauthCompletionStep2(
        @Body() dto: OAuthCompletionStep2Dto,
        @Res({ passthrough: true }) response: Response
    ) {
        const { access_token, refresh_token, user } =
            await this.auth_service.oauthCompletionStep2(dto);

        this.httpOnlyRefreshToken(response, refresh_token);
        return { access_token, user };
    }
}
