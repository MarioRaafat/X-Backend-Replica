import {
    BadRequestException,
    Controller,
    Get,
    Param,
    Post,
    Req,
    Res,
    UseGuards,
    Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { Body } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordAuthDTO } from './dto/change-password-auth.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPasswordResetOtpDto } from './dto/verify-password-reset-otp.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
    ApiCookieAuth,
    ApiQuery,
    ApiBearerAuth,
    ApiOkResponse,
    ApiCreatedResponse,
} from '@nestjs/swagger';
import { GitHubAuthGuard } from './guards/github.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook.guard';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import {
    ApiBadRequestErrorResponse,
    ApiUnauthorizedErrorResponse,
    ApiForbiddenErrorResponse,
    ApiNotFoundErrorResponse,
    ApiConflictErrorResponse,
    ApiUnprocessableEntityErrorResponse,
    ApiInternalServerError,
} from 'src/decorators/swagger-error-responses.decorator';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from 'src/constants/swagger-messages';
import {
    captchaSwagger,
    changePasswordSwagger,
    facebookCallbackSwagger,
    facebookOauthSwagger,
    generateOTPSwagger,
    githubCallbackSwagger,
    githubOauthSwagger,
    googleCallbackSwagger,
    googleOauthSwagger,
    loginSwagger,
    logoutSwagger,
    logoutAllSwagger,
    notMeSwagger,
    refreshTokenSwagger,
    registerUserSwagger,
    verifyEmailSwagger,
    forgetPasswordSwagger,
    verifyResetOtpSwagger,
    resetPasswordSwagger,
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


    @ApiOperation(registerUserSwagger.operation)
    @ApiBody({ type: RegisterDto })
    @ApiCreatedResponse(registerUserSwagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.PASSWORD_CONFIRMATION_MISMATCH)
    @ApiConflictErrorResponse(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.USER_REGISTERED)
    @Post('signup')
    async signup(@Body() registerDto: RegisterDto) {
        return this.auth_service.register(registerDto);
    }

    @ApiOperation(loginSwagger.operation)
    @ApiBody({ type: LoginDTO })
    @ApiOkResponse(loginSwagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.WRONG_PASSWORD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.EMAIL_NOT_VERIFIED)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_IN)
    @Post('login')
    async login(
        @Body() loginDTO: LoginDTO,
        @Res({ passthrough: true }) response: Response,
    ) {
        const { access_token, refresh_token, user } = await this.auth_service.login(loginDTO);

        this.httpOnlyRefreshToken(response, refresh_token);
        return { access_token, user };
    }

    @ApiOperation(generateOTPSwagger.operation)
    @ApiBody({ type: ResendOtpDto })
    @ApiCreatedResponse(generateOTPSwagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND_OR_VERIFIED)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.OTP_GENERATED)
    @Post('resend-otp')
    async generateEmailVerification(@Body() resendOtpDto: ResendOtpDto) {
        const { email } = resendOtpDto;
        return this.auth_service.generateEmailVerification(email);
    }

    @ApiOperation(verifyEmailSwagger.operation)
    @ApiBody({ type: VerifyEmailDto })
    @ApiOkResponse(verifyEmailSwagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND_OR_VERIFIED)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SAVE_IN_DB)
    @ResponseMessage(SUCCESS_MESSAGES.EMAIL_VERIFIED)
    @Post('email/verify-otp')
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
        const { email, token } = verifyEmailDto;
        return this.auth_service.verifyEmail(email, token);
    }

    @ApiOperation(notMeSwagger.operation)
    @ApiQuery(notMeSwagger.api_query)
    @ApiOkResponse(notMeSwagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.ACCOUNT_ALREADY_VERIFIED)
    @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_REMOVED)
    @Get('not-me')
    async handleNotMe(@Query('token') token: string) {
        return this.auth_service.handleNotMe(token);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(changePasswordSwagger.operation)
    @ApiBody({ type: ChangePasswordAuthDTO })
    @ApiOkResponse(changePasswordSwagger.responses.success)
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
    @ApiOperation(forgetPasswordSwagger.operation)
    @ApiOkResponse(forgetPasswordSwagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiInternalServerError(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_RESET_OTP_SENT)
    @Get('forget-password')
    async forgetPassword(@GetUserId() userId: string) {
        return this.auth_service.sendResetPasswordEmail(userId);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(verifyResetOtpSwagger.operation)
    @ApiBody({ type: VerifyPasswordResetOtpDto })
    @ApiOkResponse(verifyResetOtpSwagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnprocessableEntityErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.OTP_VERIFIED)
    @Post('password/verify-otp')
    async verifyResetPasswordOtp(@Body() verifyPasswordResetOtpDto: VerifyPasswordResetOtpDto, @GetUserId() userId: string) {
        const { token } = verifyPasswordResetOtpDto;
        return this.auth_service.verifyResetPasswordOtp(userId, token);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(resetPasswordSwagger.operation)
    @ApiBody({ type: ResetPasswordDto })
    @ApiOkResponse(resetPasswordSwagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NEW_PASSWORD_SAME_AS_OLD)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.PASSWORD_RESET)
    @Post('reset-password')
    async resetPassword(
        @GetUserId() userId: string,
        @Body() body: ResetPasswordDto,
    ) {
        const { new_password, reset_token } = body;
        return this.auth_service.resetPassword(userId, new_password, reset_token);
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(logoutSwagger.operation)
    @ApiCookieAuth('refresh_token')
    @ApiOkResponse(logoutSwagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_OUT)
    @Post('logout')
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken)
          throw new BadRequestException('No refresh token provided');
        return await this.auth_service.logout(refreshToken, response);
    }

    @ApiBearerAuth('JWT-auth')
    @ApiCookieAuth('refresh_token')
    @UseGuards(JwtAuthGuard)
    @ApiOperation(logoutAllSwagger.operation)
    @ApiOkResponse(logoutAllSwagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.LOGGED_OUT_ALL)
    @Post('logout-all')
    async logoutAll(
        @Req() req: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken)
          throw new BadRequestException('No refresh token provided');
        return await this.auth_service.logoutAll(refreshToken, response);
    }

    @ApiCookieAuth('refresh_token')
    @ApiOperation(refreshTokenSwagger.operation)
    @ApiOkResponse(refreshTokenSwagger.responses.success)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.NEW_ACCESS_TOKEN)
    @Post('refresh')
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = req.cookies['refresh_token'];
        if (!refreshToken)
          throw new BadRequestException('No refresh token provided');

        const { access_token, refresh_token } =
          await this.auth_service.refresh(refreshToken);
        this.httpOnlyRefreshToken(response, refresh_token);
        return { access_token };
    }

    /* 
        ######################### Google OAuth Routes #########################
    */

    @UseGuards(GoogleAuthGuard)
    @ApiOperation(googleOauthSwagger.operation)
    @ApiResponse(googleOauthSwagger.responses.success)
    @ApiResponse(googleOauthSwagger.responses.InternalServerError)
    @Get('google')
    googleLogin() {}


    @UseGuards(GoogleAuthGuard)
    @ApiOperation(googleCallbackSwagger.operation)
    @ApiResponse(googleCallbackSwagger.responses.success)
    @ApiResponse(googleCallbackSwagger.responses.AuthFail)
    @Get('google/callback')
    async googleLoginCallback(@Req() req, @Res() res) {
        try {
            const { access_token, refresh_token } =
              await this.auth_service.generateTokens(req.user.id);

            // Set refresh token in HTTP-only cookie
            this.httpOnlyRefreshToken(res, refresh_token);

            // Redirect to frontend with access token
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontendUrl);
          } catch (error) {
            console.error('Google OAuth callback error:', error);
            return res.redirect(
              `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`,
            );
        }
    }

    /* 
        ######################### Facebook OAuth Routes #########################
    */

    @UseGuards(FacebookAuthGuard)
    @ApiOperation(facebookOauthSwagger.operation)
    @ApiResponse(facebookOauthSwagger.responses.success)
    @ApiResponse(facebookOauthSwagger.responses.InternalServerError)
    @Get('facebook')
    facebookLogin() {}

    @UseGuards(FacebookAuthGuard)
    @ApiOperation(facebookCallbackSwagger.operation)
    @ApiResponse(facebookCallbackSwagger.responses.success)
    @ApiResponse(facebookCallbackSwagger.responses.AuthFail)
    @Get('facebook/callback')
    async facebookLoginCallback(@Req() req, @Res() res) {
        try {
            const { access_token, refresh_token } =
              await this.auth_service.generateTokens(req.user.id);

            // Set refresh token in HTTP-only cookie
            this.httpOnlyRefreshToken(res, refresh_token);

            // Redirect to frontend with access token
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            return res.redirect(frontendUrl);
        } catch (error) {
            console.error('Facebook OAuth callback error:', error);
            return res.redirect(
              `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`,
            );
        }
    }

    /* 
        ######################### GitHub OAuth Routes #########################
    */

    @UseGuards(GitHubAuthGuard)
    @ApiOperation(githubOauthSwagger.operation)
    @ApiResponse(githubOauthSwagger.responses.success)
    @ApiResponse(githubOauthSwagger.responses.InternalServerError)
    @Get('github')
    async githubLogin() {}


    @UseGuards(GitHubAuthGuard)
    @ApiOperation(githubCallbackSwagger.operation)
    @ApiResponse(githubCallbackSwagger.responses.success)
    @ApiResponse(githubCallbackSwagger.responses.AuthFail)
    @Get('github/callback')
    async githubCallback(
        @Req() req: any,
        @Res({ passthrough: true }) response: Response,
    ) {
        try {
            const { access_token, refresh_token } =
              await this.auth_service.generateTokens(req.user.id);
            this.httpOnlyRefreshToken(response, refresh_token);

            // Redirect to frontend with access token
            const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success?token=${encodeURIComponent(access_token)}`;
            response.redirect(frontendUrl);
        } catch (error) {
            console.error('GitHub OAuth callback error:', error);
            return response.redirect(
              `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=Authentication%20failed`,
            );
        }
    }

    /* 
        ######################### ReCAPTCHA Routes #########################
    */

    @ApiOperation(captchaSwagger.operation)
    @ApiResponse(captchaSwagger.responses.success)
    @ResponseMessage('ReCAPTCHA site key retrieved successfully')
    @Get('captcha/site-key')
    getCaptchaSiteKey() {
        return {
          siteKey: process.env.RECAPTCHA_SITE_KEY || '',
        };
    }
}
