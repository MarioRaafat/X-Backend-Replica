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
                        register: jest.fn(),
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

    // describe('signup', () => {

    //   beforeEach(() => jest.clearAllMocks());

    //   const dto: RegisterDto = {
    //      email: 'john@example.com',
    //      password: 'StrongPass123',
    //      firstName: 'John',
    //      lastName: 'Doe',
    //    } as RegisterDto;

    //   it('should call authService.register with the correct DTO and return result', async () => {

    //     const mockResult = {
    //       message: 'User successfully registered. Check email for verification',
    //     };

    //     (mockAuthService.register as jest.Mock).mockResolvedValue(mockResult);

    //     const result = await controller.signup(dto);

    //     expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    //     expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    //     expect(result).toEqual(mockResult);
    //   });

    //   it('should throw if authService.register throws', async () => {
    //   const dto = { email: 'error@example.com', password: '123456' } as any;
    //   mockAuthService.register.mockRejectedValueOnce(new Error('Service failed'));

    //   await expect(controller.signup(dto)).rejects.toThrow('Service failed');
    //   expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    //   expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    //   });

    // });

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
                new Error('Service failed')
            );

            await expect(controller.generateEmailVerification({ email })).rejects.toThrow(
                'Service failed'
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
            mockAuthService.handleNotMe.mockRejectedValue(new Error('Invalid or expired link'));

            await expect(controller.handleNotMe('bad-token')).rejects.toThrow(
                'Invalid or expired link'
            );
            expect(mockAuthService.handleNotMe).toHaveBeenCalledWith('bad-token');
            expect(mockAuthService.handleNotMe).toHaveBeenCalledTimes(1);
        });
    });

    describe('login', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return access token and user on successful login', async () => {
            const mockLoginDto = { email: 'user@example.com', password: '123456' };
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
            mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

            const mockResponse = { cookie: jest.fn() };
            await expect(
                controller.login({ email: 'bad', password: 'wrong' } as any, mockResponse as any)
            ).rejects.toThrow('Invalid credentials');
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

            mockAuthService.refresh.mockRejectedValue(new Error('Invalid refresh token'));

            await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(
                'Invalid refresh token'
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

            mockAuthService.logout.mockRejectedValue(new Error('Invalid or expired refresh token'));

            await expect(controller.logout(mockReq, mockRes)).rejects.toThrow(
                'Invalid or expired refresh token'
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
                new Error('Invalid or expired refresh token')
            );

            await expect(controller.logoutAll(mockReq, mockRes)).rejects.toThrow(
                'Invalid or expired refresh token'
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

            mockAuthService.changePassword.mockRejectedValue(new Error('Invalid old password'));

            await expect(controller.changePassword(mockBody as any, mockUserId)).rejects.toThrow(
                'Invalid old password'
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
            const mockUserId = 'user-123';
            const mockResult = { message: 'Password reset OTP sent to your email' };

            mockAuthService.sendResetPasswordEmail.mockResolvedValue(mockResult as any);

            const result = await controller.forgetPassword(mockUserId);

            expect(mockAuthService.sendResetPasswordEmail).toHaveBeenCalledWith(mockUserId);
            expect(mockAuthService.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.sendResetPasswordEmail throws', async () => {
            const mockUserId = 'user-123';
            mockAuthService.sendResetPasswordEmail.mockRejectedValue(new Error('User not found'));

            await expect(controller.forgetPassword(mockUserId)).rejects.toThrow('User not found');

            expect(mockAuthService.sendResetPasswordEmail).toHaveBeenCalledWith(mockUserId);
        });
    });

    describe('verifyResetPasswordOtp', () => {
        it('should call authService.verifyResetPasswordOtp with correct arguments and return its result', async () => {
            const mockBody = { token: 'otp123' };
            const mockUserId = 'user-123';
            const mockResult = { message: 'OTP verified successfully' };

            mockAuthService.verifyResetPasswordOtp.mockResolvedValue(mockResult as any);

            const result = await controller.verifyResetPasswordOtp(mockBody as any, mockUserId);

            expect(mockAuthService.verifyResetPasswordOtp).toHaveBeenCalledWith(
                mockUserId,
                mockBody.token
            );
            expect(mockAuthService.verifyResetPasswordOtp).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.verifyResetPasswordOtp throws', async () => {
            const mockBody = { token: 'invalid' };
            const mockUserId = 'user-123';

            mockAuthService.verifyResetPasswordOtp.mockRejectedValue(
                new Error('Invalid or expired OTP')
            );

            await expect(
                controller.verifyResetPasswordOtp(mockBody as any, mockUserId)
            ).rejects.toThrow('Invalid or expired OTP');

            expect(mockAuthService.verifyResetPasswordOtp).toHaveBeenCalledWith(
                mockUserId,
                mockBody.token
            );
        });
    });

    describe('resetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.resetPassword with correct arguments and return its result', async () => {
            const mockUserId = 'user-123';
            const mockBody = { new_password: 'newPass123', reset_token: 'reset-token' };
            const mockResult = { message: 'Password reset successfully' };

            mockAuthService.resetPassword.mockResolvedValue(mockResult as any);

            const result = await controller.resetPassword(mockUserId, mockBody as any);

            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
                mockUserId,
                mockBody.new_password,
                mockBody.reset_token
            );
            expect(mockAuthService.resetPassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockResult);
        });

        it('should throw if authService.resetPassword throws', async () => {
            const mockUserId = 'user-123';
            const mockBody = { new_password: 'failPass', reset_token: 'bad-token' };

            mockAuthService.resetPassword.mockRejectedValue(
                new Error('Invalid or expired reset token')
            );

            await expect(controller.resetPassword(mockUserId, mockBody as any)).rejects.toThrow(
                'Invalid or expired reset token'
            );

            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
                mockUserId,
                mockBody.new_password,
                mockBody.reset_token
            );
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
});
