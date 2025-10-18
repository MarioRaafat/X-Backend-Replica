import {
    BadRequestException,
    Controller,
    Get,
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
import { GetUserId } from 'src/decorators/get-userId.decorator';
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
    github_oauth_swagger,
    google_callback_swagger,
    google_oauth_swagger,
    login_swagger,
    logout_All_swagger,
    logout_swagger,
    not_me_swagger,
    oauth_completion_step1_swagger,
    oauth_completion_step2_swagger,
    refresh_token_swagger,
    reset_password_swagger,
    signup_step1_swagger,
    signup_step2_swagger,
    signup_step3_swagger,
    verify_email_swagger,
    verify_reset_otp_swagger,
} from './auth.swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly auth_service: AuthService) {}

    private httpOnlyRefreshToken(response: Response, refresh: string) {
        response.cookie('refresh_token', refresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
        const { user_id, access_token, refresh_token } = await this.auth_service.signupStep3(dto);

        this.httpOnlyRefreshToken(response, refresh_token);
        return { user_id, access_token };
    }

    @ApiOperation(login_swagger.operation)
    @ApiBody({ type: LoginDTO })
    @ApiOkResponse(login_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.WRONG_PASSWORD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.EMAIL_NOT_VERIFIED)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_IN)
    @Post('login')
    async login(@Body() loginDTO: LoginDTO, @Res({ passthrough: true }) response: Response) {
        const { access_token, refresh_token, user } = await this.auth_service.login(loginDTO);

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
    async generateEmailVerification(@Body() resendOtpDto: ResendOtpDto) {
        const { email } = resendOtpDto;
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
    async changePassword(@Body() body: ChangePasswordAuthDTO, @GetUserId() userId: string) {
        const { old_password, new_password } = body;
        return this.auth_service.changePassword(userId, old_password, new_password);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(forget_password_swagger.operation)
    @ApiOkResponse(forget_password_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_RESET_OTP_SENT)
    @Get('forget-password')
    async forgetPassword(@GetUserId() userId: string) {
        return this.auth_service.sendResetPasswordEmail(userId);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(verify_reset_otp_swagger.operation)
    @ApiBody({ type: VerifyPasswordResetOtpDto })
    @ApiOkResponse(verify_reset_otp_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnprocessableEntityErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.OTP_VERIFIED)
    @Post('password/verify-otp')
    async verifyResetPasswordOtp(
        @Body() verifyPasswordResetOtpDto: VerifyPasswordResetOtpDto,
        @GetUserId() userId: string
    ) {
        const { token } = verifyPasswordResetOtpDto;
        return this.auth_service.verifyResetPasswordOtp(userId, token);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(reset_password_swagger.operation)
    @ApiBody({ type: ResetPasswordDto })
    @ApiOkResponse(reset_password_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_RESET)
    @Post('reset-password')
    async resetPassword(@GetUserId() userId: string, @Body() body: ResetPasswordDto) {
        const { new_password, reset_token } = body;
        return this.auth_service.resetPassword(userId, new_password, reset_token);
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
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) throw new BadRequestException('No refresh token provided');
        return await this.auth_service.logout(refreshToken, response);
    }

    @ApiBearerAuth('JWT-auth')
    @ApiCookieAuth('refresh_token')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(logout_All_swagger.operation)
    @ApiOkResponse(logout_All_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_OUT_ALL)
    @Post('logout-all')
    async logoutAll(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) throw new BadRequestException('No refresh token provided');
        return await this.auth_service.logoutAll(refreshToken, response);
    }

    @ApiCookieAuth('refresh_token')
    @ApiOperation(refresh_token_swagger.operation)
    @ApiOkResponse(refresh_token_swagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.NEW_ACCESS_TOKEN)
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken) throw new BadRequestException('No refresh token provided');

        const { access_token, refresh_token } = await this.auth_service.refresh(refreshToken);
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

    /* 
        ######################### Google OAuth Routes #########################
    */

    @UseGuards(GoogleAuthGuard)
    @ApiOperation(google_oauth_swagger.operation)
    @ApiResponse(google_oauth_swagger.responses.success)
    @ApiResponse(google_oauth_swagger.responses.InternalServerError)
    @Get('google')
    googleLogin() {}

    @UseGuards(GoogleAuthGuard)
    @ApiOperation(google_callback_swagger.operation)
    @ApiResponse(google_callback_swagger.responses.success)
    @ApiResponse(google_callback_swagger.responses.AuthFail)
    @Get('google/callback')
    async googleLoginCallback(@Req() req, @Res() res) {
        try {
            // if the user doesn't have a record for that email in DB, we will need to redirect the user to complete his data
            if (req.user?.needs_completion) {
                const sessionToken = await this.auth_service.createOAuthSession(req.user.user);
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/oauth-complete?session=${encodeURIComponent(sessionToken)}&provider=google`
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
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontendUrl);
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
                const sessionToken = await this.auth_service.createOAuthSession(req.user.user);
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/oauth-complete?session=${encodeURIComponent(sessionToken)}&provider=facebook`
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
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontendUrl);
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

    @UseGuards(GitHubAuthGuard)
    @ApiOperation(github_callback_swagger.operation)
    @ApiResponse(github_callback_swagger.responses.success)
    @ApiResponse(github_callback_swagger.responses.AuthFail)
    @Get('github/callback')
    async githubCallback(@Req() req: any, @Res() res: Response) {
        try {
            // if the user doesn't have a record for that email in DB, we will need to redirect the user to complete his data
            if (req.user?.needs_completion) {
                const sessionToken = await this.auth_service.createOAuthSession(req.user.user);
                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/oauth-complete?session=${encodeURIComponent(sessionToken)}&provider=github`
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
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontendUrl);
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
