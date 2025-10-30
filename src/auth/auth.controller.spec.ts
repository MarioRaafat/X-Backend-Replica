import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

describe('AuthController', () => {
    let controller: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        signupStep1: jest.fn(),
                        signupStep2: jest.fn(),
                        signupStep3: jest.fn(),
                        login: jest.fn(),
                        refresh: jest.fn(),
                        generateEmailVerification: jest.fn(),
                        verifyEmail: jest.fn(),
                        handleNotMe: jest.fn(),
                        logout: jest.fn(),
                        logoutAll: jest.fn(),
                        changePassword: jest.fn(),
                        sendResetPasswordEmail: jest.fn(),
                        verifyResetPasswordOtp: jest.fn(),
                        resetPassword: jest.fn(),
                        generateTokens: jest.fn(),
                        checkIdentifier: jest.fn(),
                        updateUsername: jest.fn(),
                        updateEmail: jest.fn(),
                        verifyUpdateEmail: jest.fn(),
                        verifyGoogleMobileToken: jest.fn(),
                        verifyGitHubMobileToken: jest.fn(),
                        createOAuthSession: jest.fn(),
                        oauthCompletionStep1: jest.fn(),
                        oauthCompletionStep2: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        mockAuthService = module.get(AuthService);

        // Add a stub for httpOnlyRefreshToken if it does not exist
        if (typeof (controller as any).httpOnlyRefreshToken !== 'function') {
            (controller as any).httpOnlyRefreshToken = jest.fn();
        }
    });

    describe('signupStep1', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.signupStep1 with the given dto and return its result', async () => {
            const mockDto = { email: 'test@example.com' };
            const mockResult = { message: 'OTP sent to email' };

            mockAuthService.signupStep1.mockResolvedValue(mockResult as any);

            const result = await controller.signupStep1(mockDto as any);

            expect(mockAuthService.signupStep1).toHaveBeenCalledWith(mockDto);
            expect(mockAuthService.signupStep1).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.signupStep1 throws', async () => {
            const mockDto = { email: 'existing@example.com' };
            mockAuthService.signupStep1.mockRejectedValue(new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS));

            await expect(controller.signupStep1(mockDto as any)).rejects.toThrow(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);

            expect(mockAuthService.signupStep1).toHaveBeenCalledWith(mockDto);
        });
    });

    describe('signupStep2', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.signupStep2 with the given dto and return its result', async () => {
            const mockDto = { email: 'test@example.com', otp: '123456' };
            const mockResult = { message: 'Email verified successfully' };

            mockAuthService.signupStep2.mockResolvedValue(mockResult as any);

            const result = await controller.signupStep2(mockDto as any);

            expect(mockAuthService.signupStep2).toHaveBeenCalledWith(mockDto);
            expect(mockAuthService.signupStep2).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.signupStep2 throws', async () => {
            const mockDto = { email: 'test@example.com', otp: 'invalid' };
            mockAuthService.signupStep2.mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            await expect(controller.signupStep2(mockDto as any)).rejects.toThrow(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);

            expect(mockAuthService.signupStep2).toHaveBeenCalledWith(mockDto);
        });
    });

    describe('signupStep3', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.signupStep3, set cookie, and return user data', async () => {
            const mockDto = { username: 'testuser', password: 'password123' };
            const mockResult = {
                user_id: 'user123',
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mockAuthService.signupStep3.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.signupStep3(mockDto as any, mockResponse as any);

            expect(mockAuthService.signupStep3).toHaveBeenCalledWith(mockDto);
            expect(mockSetCookie).toHaveBeenCalledWith(mockResponse, mockResult.refresh_token);
            expect(result).toEqual({
                user_id: mockResult.user_id,
                access_token: mockResult.access_token,
            });
        });

        it('should throw if authService.signupStep3 throws', async () => {
            const mockDto = { username: 'existinguser', password: 'password123' };
            mockAuthService.signupStep3.mockRejectedValue(new Error(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN));

            const mockResponse = { cookie: jest.fn() };
            await expect(controller.signupStep3(mockDto as any, mockResponse as any)).rejects.toThrow(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);

            expect(mockAuthService.signupStep3).toHaveBeenCalledWith(mockDto);
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mockDto = { username: 'testuser', password: 'password123' };
            const mockResult = {
                user_id: 'user123',
                access_token: 'access123',
                refresh_token: 'refresh123',
            };
            mockAuthService.signupStep3.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn(() => {
                throw new Error('Cookie error');
            });
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await expect(
                controller.signupStep3(mockDto as any, { cookie: jest.fn() } as any)
            ).rejects.toThrow('Cookie error');
        });
    });

    describe('generateEmailVerification', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.generateEmailVerification with the given email', async () => {
            const mockResponse = { message: 'OTP sent' };
            const email = 'test@example.com';
            (mockAuthService.generateEmailVerification as jest.Mock).mockResolvedValueOnce(
                mockResponse
            );

            const result = await controller.generateEmailVerification({ email });

            expect(mockAuthService.generateEmailVerification).toHaveBeenCalledWith(email);
            expect(mockAuthService.generateEmailVerification).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResponse);
        });

        it('should throw if service throws', async () => {
            const email = 'fail@example.com';
            mockAuthService.generateEmailVerification.mockRejectedValueOnce(
                new Error(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
            );

            await expect(controller.generateEmailVerification({ email })).rejects.toThrow(
                ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL
            );

            expect(mockAuthService.generateEmailVerification).toHaveBeenCalledWith(email);
            expect(mockAuthService.generateEmailVerification).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleNotMe', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.handleNotMe with the correct token and return the result', async () => {
            const mockResult = { message: 'deleted account successfully' };
            mockAuthService.handleNotMe.mockResolvedValue(mockResult as any);

            const result = await controller.handleNotMe('valid-token');

            expect(mockAuthService.handleNotMe).toHaveBeenCalledWith('valid-token');
            expect(mockAuthService.handleNotMe).toHaveBeenCalledTimes(1);
            expect(result).toBe(mockResult);
        });

        it('should throw if authService.handleNotMe throws', async () => {
            mockAuthService.handleNotMe.mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            await expect(controller.handleNotMe('bad-token')).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );
            expect(mockAuthService.handleNotMe).toHaveBeenCalledWith('bad-token');
            expect(mockAuthService.handleNotMe).toHaveBeenCalledTimes(1);
        });
    });

    describe('login', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return access token and user on successful login', async () => {
            const mockLoginDto = { identifier: 'user@example.com', password: '123456' };
            const mockResult = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: { id: 1, email: 'user@example.com' },
            };

            mockAuthService.login.mockResolvedValue(mockResult as any);

            const mockSetCookie = jest.fn();
            const originalMethod = controller['httpOnlyRefreshToken'];
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.login(mockLoginDto as any, mockResponse as any);

            expect(mockAuthService.login).toHaveBeenCalledWith(mockLoginDto);
            expect(mockSetCookie).toHaveBeenCalledWith(mockResponse, mockResult.refresh_token);
            expect(result).toEqual({
                access_token: mockResult.access_token,
                user: mockResult.user,
            });
        });

        it('should throw if AuthService.login throws', async () => {
            mockAuthService.login.mockRejectedValue(new Error(ERROR_MESSAGES.WRONG_PASSWORD));

            const mockResponse = { cookie: jest.fn() };
            await expect(
                controller.login({ email: 'bad', password: 'wrong' } as any, mockResponse as any)
            ).rejects.toThrow(ERROR_MESSAGES.WRONG_PASSWORD);
            expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'bad', password: 'wrong' });
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mockLoginDto = { email: 'x', password: 'x' };
            const mockResult = { access_token: 'a', refresh_token: 'r', user: {} };
            mockAuthService.login.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn(() => {
                throw new Error('Cookie set failed');
            });
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await expect(
                controller.login(mockLoginDto as any, { cookie: jest.fn() } as any)
            ).rejects.toThrow('Cookie set failed');
        });
    });

    describe('refresh', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should generate a new access token when valid refresh token is provided', async () => {
            const mockReq = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mockRes = { cookie: jest.fn() } as any;

            const mockResult = {
                access_token: 'new-access',
                refresh_token: 'new-refresh',
            };

            mockAuthService.refresh.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            const result = await controller.refresh(mockReq, mockRes);

            expect(mockAuthService.refresh).toHaveBeenCalledWith('valid-refresh');
            expect(mockSetCookie).toHaveBeenCalledWith(mockRes, 'new-refresh');
            expect(result).toEqual({ access_token: 'new-access' });
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mockReq = { cookies: {} } as any;
            const mockRes = { cookie: jest.fn() } as any;

            await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );
            expect(mockAuthService.refresh).not.toHaveBeenCalled();
        });

        it('should throw if authService.refresh throws', async () => {
            const mockReq = { cookies: { refresh_token: 'invalid' } } as any;
            const mockRes = { cookie: jest.fn() } as any;

            mockAuthService.refresh.mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            expect(mockAuthService.refresh).toHaveBeenCalledWith('invalid');
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mockReq = { cookies: { refresh_token: 'valid' } } as any;
            const mockRes = { cookie: jest.fn() } as any;

            const mockResult = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };
            mockAuthService.refresh.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn(() => {
                throw new Error('Cookie error');
            });
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow('Cookie error');
        });
    });

    describe('logout', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.logout and return its result', async () => {
            const mockReq = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
            const mockResult = { message: 'Successfully logged out' };

            mockAuthService.logout.mockResolvedValue(mockResult as any);

            const result = await controller.logout(mockReq, mockRes);

            expect(mockAuthService.logout).toHaveBeenCalledWith('valid-refresh', mockRes);
            expect(result).toEqual(mockResult);
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mockReq = { cookies: {} } as any;
            const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            await expect(controller.logout(mockReq, mockRes)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );

            expect(mockAuthService.logout).not.toHaveBeenCalled();
        });

        it('should throw if authService.logout throws an error', async () => {
            const mockReq = { cookies: { refresh_token: 'invalid' } } as any;
            const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            mockAuthService.logout.mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            await expect(controller.logout(mockReq, mockRes)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            expect(mockAuthService.logout).toHaveBeenCalledWith('invalid', mockRes);
        });
    });

    describe('logoutAll', () => {
        it('should call authService.logoutAll and return its result', async () => {
            const mockReq = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
            const mockResult = { message: 'Successfully logged out from all devices' };

            mockAuthService.logoutAll.mockResolvedValue(mockResult as any);

            const result = await controller.logoutAll(mockReq, mockRes);

            expect(mockAuthService.logoutAll).toHaveBeenCalledWith('valid-refresh', mockRes);
            expect(result).toEqual(mockResult);
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mockReq = { cookies: {} } as any;
            const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            await expect(controller.logoutAll(mockReq, mockRes)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );

            expect(mockAuthService.logoutAll).not.toHaveBeenCalled();
        });

        it('should throw if authService.logoutAll throws an error', async () => {
            const mockReq = { cookies: { refresh_token: 'expired-token' } } as any;
            const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            mockAuthService.logoutAll.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.logoutAll(mockReq, mockRes)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            expect(mockAuthService.logoutAll).toHaveBeenCalledWith('expired-token', mockRes);
        });
    });

    describe('changePassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.changePassword with correct arguments and return its result', async () => {
            const mockBody = { old_password: 'old123', new_password: 'new123' };
            const mockUserId = 'user-1';
            const mockResult = { message: 'Password changed successfully' };

            mockAuthService.changePassword.mockResolvedValue(mockResult as any);

            const result = await controller.changePassword(mockBody as any, mockUserId);

            expect(mockAuthService.changePassword).toHaveBeenCalledWith(
                mockUserId,
                mockBody.old_password,
                mockBody.new_password
            );
            expect(mockAuthService.changePassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.changePassword throws', async () => {
            const mockBody = { old_password: 'wrong', new_password: 'new' };
            const mockUserId = 'user-1';

            mockAuthService.changePassword.mockRejectedValue(new Error(ERROR_MESSAGES.WRONG_PASSWORD));

            await expect(controller.changePassword(mockBody as any, mockUserId)).rejects.toThrow(
                ERROR_MESSAGES.WRONG_PASSWORD
            );

            expect(mockAuthService.changePassword).toHaveBeenCalledWith(
                mockUserId,
                mockBody.old_password,
                mockBody.new_password
            );
        });
    });

    describe('forgetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.sendResetPasswordEmail with the correct userId and return its result', async () => {
            const forget_req = {
                identifier: 'user123',
            };
            const mockResult = { message: 'Password reset OTP sent to your email' };

            mockAuthService.sendResetPasswordEmail.mockResolvedValue(mockResult as any);

            const result = await controller.forgetPassword(forget_req);

            expect(mockAuthService.sendResetPasswordEmail).toHaveBeenCalledWith(forget_req.identifier);
            expect(mockAuthService.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.sendResetPasswordEmail throws', async () => {
            const forget_req = {
                identifier: 'user-123',
            };
            mockAuthService.sendResetPasswordEmail.mockRejectedValue(new Error(ERROR_MESSAGES.USER_NOT_FOUND));

            await expect(controller.forgetPassword(forget_req)).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(mockAuthService.sendResetPasswordEmail).toHaveBeenCalledWith(forget_req.identifier);
        });
    });

    describe('verifyResetPasswordOtp', () => {
        it('should call authService.verifyResetPasswordOtp with correct arguments and return its result', async () => {
            const mockBody = { token: 'otp123', identifier: 'user-123' };
            const mockResult = { message: 'OTP verified successfully' };

            mockAuthService.verifyResetPasswordOtp.mockResolvedValue(mockResult as any);

            const result = await controller.verifyResetPasswordOtp(mockBody);

            expect(mockAuthService.verifyResetPasswordOtp).toHaveBeenCalledWith(mockBody.identifier, mockBody.token);
            expect(mockAuthService.verifyResetPasswordOtp).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.verifyResetPasswordOtp throws', async () => {
            const mockBody = { token: 'invalid', identifier: 'user-123' };

            mockAuthService.verifyResetPasswordOtp.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(
                controller.verifyResetPasswordOtp(mockBody as any)
            ).rejects.toThrow(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);

            expect(mockAuthService.verifyResetPasswordOtp).toHaveBeenCalledWith(mockBody.identifier, mockBody.token);
        });
    });

    describe('resetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.resetPassword with correct arguments and return its result', async () => {
            const mockUserId = 'user-123';
            const mockBody = { new_password: 'newPass123', reset_token: 'reset-token', identifier: 'user-123' };
            const mockResult = { message: 'Password reset successfully' };

            mockAuthService.resetPassword.mockResolvedValue(mockResult as any);

            const result = await controller.resetPassword(mockBody as any);

            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(mockBody.identifier, mockBody.new_password, mockBody.reset_token);
            expect(mockAuthService.resetPassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.resetPassword throws', async () => {
            const mockBody = { new_password: 'failPass', reset_token: 'bad-token', identifier: 'user-123' };

            mockAuthService.resetPassword.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.resetPassword(mockBody as any)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(mockBody.identifier, mockBody.new_password, mockBody.reset_token);
        });
    });

    describe('googleLoginCallback', () => {
        const mockFrontendUrl = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = mockFrontendUrl;
        });

        it('should generate tokens, set cookie, and redirect to success URL', async () => {
            const mockReq = { user: { id: 'user123' } } as any;
            const mockRes = { redirect: jest.fn(), cookie: jest.fn() } as any;

            const mockTokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mockAuthService.generateTokens.mockResolvedValue(mockTokens as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await controller.googleLoginCallback(mockReq, mockRes);

            expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user123');
            expect(mockSetCookie).toHaveBeenCalledWith(mockRes, mockTokens.refresh_token);
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${mockFrontendUrl}/auth/success?token=${mockTokens.access_token}`
            );
        });

        it('should redirect to error page if generateTokens throws', async () => {
            const mockReq = { user: { id: 'user123' } } as any;
            const mockRes = { redirect: jest.fn() } as any;

            mockAuthService.generateTokens.mockRejectedValue(new Error('OAuth failed'));

            await controller.googleLoginCallback(mockReq, mockRes);

            expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user123');
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${mockFrontendUrl}/auth/error?message=Authentication%20failed`
            );
        });
    });

    describe('facebookLoginCallback', () => {
        const mockFrontendUrl = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = mockFrontendUrl;
        });

        it('should generate tokens, set cookie, and redirect to success URL', async () => {
            const mockReq = { user: { id: 'user123' } } as any;
            const mockRes = { redirect: jest.fn(), cookie: jest.fn() } as any;

            const mockTokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mockAuthService.generateTokens.mockResolvedValue(mockTokens as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await controller.facebookLoginCallback(mockReq, mockRes);

            expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user123');
            expect(mockSetCookie).toHaveBeenCalledWith(mockRes, mockTokens.refresh_token);
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${mockFrontendUrl}/auth/success?token=${mockTokens.access_token}`
            );
        });

        it('should redirect to error page if generateTokens throws', async () => {
            const mockReq = { user: { id: 'user123' } } as any;
            const mockRes = { redirect: jest.fn(), cookie: jest.fn() } as any;

            mockAuthService.generateTokens.mockRejectedValue(new Error('OAuth failed'));

            await controller.facebookLoginCallback(mockReq, mockRes);

            expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user123');
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${mockFrontendUrl}/auth/error?message=Authentication%20failed`
            );
        });
    });

    describe('githubCallback', () => {
        const mockFrontendUrl = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = mockFrontendUrl;
        });

        it('should generate tokens, set cookie, and redirect to success URL', async () => {
            const mockReq = { user: { id: 'user123' } } as any;
            const mockRes = { redirect: jest.fn(), cookie: jest.fn() } as any;

            const mockTokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mockAuthService.generateTokens.mockResolvedValue(mockTokens as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await controller.githubCallback(mockReq, mockRes);

            expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user123');
            expect(mockSetCookie).toHaveBeenCalledWith(mockRes, mockTokens.refresh_token);
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${mockFrontendUrl}/auth/success?token=${mockTokens.access_token}`
            );
        });

        it('should redirect to error page if generateTokens throws', async () => {
            const mockReq = { user: { id: 'user123' } } as any;
            const mockRes = { redirect: jest.fn(), cookie: jest.fn() } as any;

            mockAuthService.generateTokens.mockRejectedValue(new Error('OAuth failed'));

            await controller.githubCallback(mockReq, mockRes);

            expect(mockAuthService.generateTokens).toHaveBeenCalledWith('user123');
            expect(mockRes.redirect).toHaveBeenCalledWith(
                `${mockFrontendUrl}/auth/error?message=Authentication%20failed`
            );
        });
    });

    describe('checkIdentifier', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.checkIdentifier with the given identifier and return its result', async () => {
            const mockDto = { identifier: 'testuser' };
            const mockResult = { available: true };

            mockAuthService.checkIdentifier.mockResolvedValue(mockResult as any);

            const result = await controller.checkIdentifier(mockDto as any);

            expect(mockAuthService.checkIdentifier).toHaveBeenCalledWith(mockDto.identifier);
            expect(mockAuthService.checkIdentifier).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.checkIdentifier throws', async () => {
            const mockDto = { identifier: 'existinguser' };
            mockAuthService.checkIdentifier.mockRejectedValue(new Error(ERROR_MESSAGES.USERNAME_NOT_FOUND));

            await expect(controller.checkIdentifier(mockDto as any)).rejects.toThrow(ERROR_MESSAGES.USERNAME_NOT_FOUND);

            expect(mockAuthService.checkIdentifier).toHaveBeenCalledWith(mockDto.identifier);
        });
    });

    describe('updateUsername', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.updateUsername with correct arguments and return its result', async () => {
            const mockDto = { username: 'newusername' };
            const mockUserId = 'user123';
            const mockResult = { message: 'Username updated successfully' };

            mockAuthService.updateUsername.mockResolvedValue(mockResult as any);

            const result = await controller.updateUsername(mockDto as any, mockUserId);

            expect(mockAuthService.updateUsername).toHaveBeenCalledWith(mockUserId, mockDto.username);
            expect(mockAuthService.updateUsername).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.updateUsername throws', async () => {
            const mockDto = { username: 'existinguser' };
            const mockUserId = 'user123';
            mockAuthService.updateUsername.mockRejectedValue(new Error(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN));

            await expect(controller.updateUsername(mockDto as any, mockUserId)).rejects.toThrow(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);

            expect(mockAuthService.updateUsername).toHaveBeenCalledWith(mockUserId, mockDto.username);
        });
    });

    describe('updateEmail', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.updateEmail with correct arguments and return its result', async () => {
            const mockDto = { new_email: 'newemail@example.com' };
            const mockUserId = 'user123';
            const mockResult = { message: 'Email update initiated, OTP sent' };

            mockAuthService.updateEmail.mockResolvedValue(mockResult as any);

            const result = await controller.updateEmail(mockDto as any, mockUserId);

            expect(mockAuthService.updateEmail).toHaveBeenCalledWith(mockUserId, mockDto.new_email);
            expect(mockAuthService.updateEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.updateEmail throws', async () => {
            const mockDto = { new_email: 'existing@example.com' };
            const mockUserId = 'user123';
            mockAuthService.updateEmail.mockRejectedValue(new Error('Email already exists'));

            await expect(controller.updateEmail(mockDto as any, mockUserId)).rejects.toThrow('Email already exists');

            expect(mockAuthService.updateEmail).toHaveBeenCalledWith(mockUserId, mockDto.new_email);
        });
    });

    describe('verifyUpdateEmail', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.verifyUpdateEmail with correct arguments and return its result', async () => {
            const mockDto = { new_email: 'newemail@example.com', otp: '123456' };
            const mockUserId = 'user123';
            const mockResult = { message: 'Email updated successfully' };

            mockAuthService.verifyUpdateEmail.mockResolvedValue(mockResult as any);

            const result = await controller.verifyUpdateEmail(mockDto as any, mockUserId);

            expect(mockAuthService.verifyUpdateEmail).toHaveBeenCalledWith(
                mockUserId,
                mockDto.new_email,
                mockDto.otp
            );
            expect(mockAuthService.verifyUpdateEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.verifyUpdateEmail throws', async () => {
            const mockDto = { new_email: 'newemail@example.com', otp: 'invalid' };
            const mockUserId = 'user123';
            mockAuthService.verifyUpdateEmail.mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN));

            await expect(controller.verifyUpdateEmail(mockDto as any, mockUserId)).rejects.toThrow(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);

            expect(mockAuthService.verifyUpdateEmail).toHaveBeenCalledWith(
                mockUserId,
                mockDto.new_email,
                mockDto.otp
            );
        });
    });

    describe('mobileGoogleAuth', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return needs_completion when user needs to complete OAuth registration', async () => {
            const mockDto = { access_token: 'google-token' };
            const mockResult = {
                needs_completion: true,
                user: { id: 'user123', email: 'test@example.com' },
            };

            mockAuthService.verifyGoogleMobileToken.mockResolvedValue(mockResult as any);
            mockAuthService.createOAuthSession.mockResolvedValue('session-token' as any);

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.mobileGoogleAuth(mockDto as any, mockResponse as any);

            expect(mockAuthService.verifyGoogleMobileToken).toHaveBeenCalledWith(mockDto.access_token);
            expect(mockAuthService.createOAuthSession).toHaveBeenCalledWith(mockResult.user);
            expect(result).toEqual({
                needs_completion: true,
                session_token: 'session-token',
                provider: 'google',
            });
        });

        it('should return access token and user when authentication is successful', async () => {
            const mockDto = { access_token: 'google-token' };
            const mockResult = {
                user: { id: 'user123', email: 'test@example.com' },
            };
            const mockTokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mockAuthService.verifyGoogleMobileToken.mockResolvedValue(mockResult as any);
            mockAuthService.generateTokens.mockResolvedValue(mockTokens as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.mobileGoogleAuth(mockDto as any, mockResponse as any);

            expect(mockAuthService.verifyGoogleMobileToken).toHaveBeenCalledWith(mockDto.access_token);
            expect(mockAuthService.generateTokens).toHaveBeenCalledWith(mockResult.user.id);
            expect(mockSetCookie).toHaveBeenCalledWith(mockResponse, mockTokens.refresh_token);
            expect(result).toEqual({
                access_token: mockTokens.access_token,
                user: mockResult.user,
            });
        });

        it('should throw BadRequestException if user data is invalid', async () => {
            const mockDto = { access_token: 'invalid-token' };
            const mockResult = { user: {} }; // Missing id

            mockAuthService.verifyGoogleMobileToken.mockResolvedValue(mockResult as any);

            const mockResponse = { cookie: jest.fn() };

            await expect(controller.mobileGoogleAuth(mockDto as any, mockResponse as any)).rejects.toThrow(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID);

            expect(mockAuthService.verifyGoogleMobileToken).toHaveBeenCalledWith(mockDto.access_token);
        });
    });

    describe('mobileGitHubAuth', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return needs_completion when user needs to complete OAuth registration', async () => {
            const mockDto = { code: 'github-code', redirect_uri: 'http://localhost', code_verifier: 'verifier' };
            const mockResult = {
                needs_completion: true,
                user: { id: 'user123', email: 'test@example.com' },
            };

            mockAuthService.verifyGitHubMobileToken.mockResolvedValue(mockResult as any);
            mockAuthService.createOAuthSession.mockResolvedValue('session-token' as any);

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.mobileGitHubAuth(mockDto as any, mockResponse as any);

            expect(mockAuthService.verifyGitHubMobileToken).toHaveBeenCalledWith(
                mockDto.code,
                mockDto.redirect_uri,
                mockDto.code_verifier
            );
            expect(mockAuthService.createOAuthSession).toHaveBeenCalledWith(mockResult.user);
            expect(result).toEqual({
                needs_completion: true,
                session_token: 'session-token',
                provider: 'github',
            });
        });

        it('should return access token and user when authentication is successful', async () => {
            const mockDto = { code: 'github-code', redirect_uri: 'http://localhost', code_verifier: 'verifier' };
            const mockResult = {
                user: { id: 'user123', email: 'test@example.com' },
            };
            const mockTokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mockAuthService.verifyGitHubMobileToken.mockResolvedValue(mockResult as any);
            mockAuthService.generateTokens.mockResolvedValue(mockTokens as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.mobileGitHubAuth(mockDto as any, mockResponse as any);

            expect(mockAuthService.verifyGitHubMobileToken).toHaveBeenCalledWith(
                mockDto.code,
                mockDto.redirect_uri,
                mockDto.code_verifier
            );
            expect(mockAuthService.generateTokens).toHaveBeenCalledWith(mockResult.user.id);
            expect(mockSetCookie).toHaveBeenCalledWith(mockResponse, mockTokens.refresh_token);
            expect(result).toEqual({
                access_token: mockTokens.access_token,
                user: mockResult.user,
            });
        });

        it('should throw BadRequestException if user data is invalid', async () => {
            const mockDto = { code: 'invalid-code', redirect_uri: 'http://localhost', code_verifier: 'verifier' };
            const mockResult = { user: {} }; // Missing id

            mockAuthService.verifyGitHubMobileToken.mockResolvedValue(mockResult as any);

            const mockResponse = { cookie: jest.fn() };

            await expect(controller.mobileGitHubAuth(mockDto as any, mockResponse as any)).rejects.toThrow(ERROR_MESSAGES.GITHUB_TOKEN_INVALID);

            expect(mockAuthService.verifyGitHubMobileToken).toHaveBeenCalledWith(
                mockDto.code,
                mockDto.redirect_uri,
                mockDto.code_verifier
            );
        });
    });

    describe('getCaptchaSiteKey', () => {
        it('should return the site key from environment variables', () => {
            process.env.RECAPTCHA_SITE_KEY = 'test-site-key';

            const result = controller.getCaptchaSiteKey();

            expect(result).toEqual({ siteKey: 'test-site-key' });
        });

        it('should return an empty string if RECAPTCHA_SITE_KEY is not set', () => {
            delete process.env.RECAPTCHA_SITE_KEY;

            const result = controller.getCaptchaSiteKey();

            expect(result).toEqual({ siteKey: '' });
        });
    });

    describe('oauthCompletionStep1', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.oauthCompletionStep1 with the given dto and return its result', async () => {
            const mockDto = { session_token: 'session123', birth_date: '1990-01-01' };
            const mockResult = { message: 'Birth date set successfully' };

            mockAuthService.oauthCompletionStep1.mockResolvedValue(mockResult as any);

            const result = await controller.oauthCompletionStep1(mockDto as any);

            expect(mockAuthService.oauthCompletionStep1).toHaveBeenCalledWith(mockDto);
            expect(mockAuthService.oauthCompletionStep1).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.oauthCompletionStep1 throws', async () => {
            const mockDto = { session_token: 'invalid-session', birth_date: '1990-01-01' };
            mockAuthService.oauthCompletionStep1.mockRejectedValue(new Error('Invalid OAuth session token'));

            await expect(controller.oauthCompletionStep1(mockDto as any)).rejects.toThrow(ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN);

            expect(mockAuthService.oauthCompletionStep1).toHaveBeenCalledWith(mockDto);
        });
    });

    describe('oauthCompletionStep2', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.oauthCompletionStep2, set cookie, and return tokens and user', async () => {
            const mockDto = { session_token: 'session123', username: 'newuser' };
            const mockResult = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: { id: 'user123', username: 'newuser' },
            };

            mockAuthService.oauthCompletionStep2.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            const mockResponse = { cookie: jest.fn() };

            const result = await controller.oauthCompletionStep2(mockDto as any, mockResponse as any);

            expect(mockAuthService.oauthCompletionStep2).toHaveBeenCalledWith(mockDto);
            expect(mockSetCookie).toHaveBeenCalledWith(mockResponse, mockResult.refresh_token);
            expect(result).toEqual({
                access_token: mockResult.access_token,
                user: mockResult.user,
            });
        });

        it('should throw if authService.oauthCompletionStep2 throws', async () => {
            const mockDto = { session_token: 'session123', username: 'existinguser' };
            mockAuthService.oauthCompletionStep2.mockRejectedValue(new Error(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN));

            const mockResponse = { cookie: jest.fn() };
            await expect(controller.oauthCompletionStep2(mockDto as any, mockResponse as any)).rejects.toThrow(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);

            expect(mockAuthService.oauthCompletionStep2).toHaveBeenCalledWith(mockDto);
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mockDto = { session_token: 'session123', username: 'newuser' };
            const mockResult = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: { id: 'user123', username: 'newuser' },
            };
            mockAuthService.oauthCompletionStep2.mockResolvedValue(mockResult as any);
            const mockSetCookie = jest.fn(() => {
                throw new Error('Cookie error');
            });
            controller['httpOnlyRefreshToken'] = mockSetCookie;

            await expect(
                controller.oauthCompletionStep2(mockDto as any, { cookie: jest.fn() } as any)
            ).rejects.toThrow('Cookie error');
        });
    });
});
