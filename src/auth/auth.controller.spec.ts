import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

describe('AuthController', () => {
    let controller: AuthController;
    let mock_auth_service: jest.Mocked<AuthService>;

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
        mock_auth_service = module.get(AuthService);

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

    //     const mock_result = {
    //       message: 'User successfully registered. Check email for verification',
    //     };

    //     (mock_auth_service.register as jest.Mock).mockResolvedValue(mock_result);

    //     const result = await controller.signup(dto);

    //     expect(mock_auth_service.register).toHaveBeenCalledTimes(1);
    //     expect(mock_auth_service.register).toHaveBeenCalledWith(dto);
    //     expect(result).toEqual(mock_result);
    //   });

    //   it('should throw if authService.register throws', async () => {
    //   const dto = { email: 'error@example.com', password: '123456' } as any;
    //   mock_auth_service.register.mockRejectedValueOnce(new Error('Service failed'));

    //   await expect(controller.signup(dto)).rejects.toThrow('Service failed');
    //   expect(mock_auth_service.register).toHaveBeenCalledTimes(1);
    //   expect(mock_auth_service.register).toHaveBeenCalledWith(dto);
    //   });

    // });

    describe('generateEmailVerification', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.generateEmailVerification with the given email', async () => {
            const mock_response = { message: 'OTP sent' };
            const email = 'test@example.com';
            (mock_auth_service.generateEmailVerification as jest.Mock).mockResolvedValueOnce(
                mock_response
            );

            const result = await controller.generateEmailVerification({ email });

            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledWith(email);
            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const email = 'fail@example.com';
            mock_auth_service.generateEmailVerification.mockRejectedValueOnce(
                new Error('Service failed')
            );

            await expect(controller.generateEmailVerification({ email })).rejects.toThrow(
                'Service failed'
            );

            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledWith(email);
            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleNotMe', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.handleNotMe with the correct token and return the result', async () => {
            const mock_result = { message: 'deleted account successfully' };
            mock_auth_service.handleNotMe.mockResolvedValue(mock_result as any);

            const result = await controller.handleNotMe('valid-token');

            expect(mock_auth_service.handleNotMe).toHaveBeenCalledWith('valid-token');
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledTimes(1);
            expect(result).toBe(mock_result);
        });

        it('should throw if authService.handleNotMe throws', async () => {
            mock_auth_service.handleNotMe.mockRejectedValue(new Error('Invalid or expired link'));

            await expect(controller.handleNotMe('bad-token')).rejects.toThrow(
                'Invalid or expired link'
            );
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledWith('bad-token');
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledTimes(1);
        });
    });

    describe('login', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return access token and user on successful login', async () => {
            const mock_login_dto = { email: 'user@example.com', password: '123456' };
            const mock_result = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: { id: 1, email: 'user@example.com' },
            };

            mock_auth_service.login.mockResolvedValue(mock_result as any);

            const mock_set_cookie = jest.fn();
            const original_method = controller['httpOnlyRefreshToken'];
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const mock_response = { cookie: jest.fn() };

            const result = await controller.login(mock_login_dto as any, mock_response as any);

            expect(mock_auth_service.login).toHaveBeenCalledWith(mock_login_dto);
            expect(mock_set_cookie).toHaveBeenCalledWith(mock_response, mock_result.refresh_token);
            expect(result).toEqual({
                access_token: mock_result.access_token,
                user: mock_result.user,
            });
        });

        it('should throw if AuthService.login throws', async () => {
            mock_auth_service.login.mockRejectedValue(new Error('Invalid credentials'));

            const mock_response = { cookie: jest.fn() };
            await expect(
                controller.login({ email: 'bad', password: 'wrong' } as any, mock_response as any)
            ).rejects.toThrow('Invalid credentials');
            expect(mock_auth_service.login).toHaveBeenCalledWith({
                email: 'bad',
                password: 'wrong',
            });
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mock_login_dto = { email: 'x', password: 'x' };
            const mock_result = { access_token: 'a', refresh_token: 'r', user: {} };
            mock_auth_service.login.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn(() => {
                throw new Error('Cookie set failed');
            });
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await expect(
                controller.login(mock_login_dto as any, { cookie: jest.fn() } as any)
            ).rejects.toThrow('Cookie set failed');
        });
    });

    describe('refresh', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should generate a new access token when valid refresh token is provided', async () => {
            const mock_req = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mock_res = { cookie: jest.fn() } as any;

            const mock_result = {
                access_token: 'new-access',
                refresh_token: 'new-refresh',
            };

            mock_auth_service.refresh.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const result = await controller.refresh(mock_req, mock_res);

            expect(mock_auth_service.refresh).toHaveBeenCalledWith('valid-refresh');
            expect(mock_set_cookie).toHaveBeenCalledWith(mock_res, 'new-refresh');
            expect(result).toEqual({ access_token: 'new-access' });
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mock_req = { cookies: {} } as any;
            const mock_res = { cookie: jest.fn() } as any;

            await expect(controller.refresh(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );
            expect(mock_auth_service.refresh).not.toHaveBeenCalled();
        });

        it('should throw if authService.refresh throws', async () => {
            const mock_req = { cookies: { refresh_token: 'invalid' } } as any;
            const mock_res = { cookie: jest.fn() } as any;

            mock_auth_service.refresh.mockRejectedValue(new Error('Invalid refresh token'));

            await expect(controller.refresh(mock_req, mock_res)).rejects.toThrow(
                'Invalid refresh token'
            );

            expect(mock_auth_service.refresh).toHaveBeenCalledWith('invalid');
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mock_req = { cookies: { refresh_token: 'valid' } } as any;
            const mock_res = { cookie: jest.fn() } as any;

            const mock_result = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };
            mock_auth_service.refresh.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn(() => {
                throw new Error('Cookie error');
            });
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await expect(controller.refresh(mock_req, mock_res)).rejects.toThrow('Cookie error');
        });
    });

    describe('logout', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.logout and return its result', async () => {
            const mock_req = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
            const mock_result = { message: 'Successfully logged out' };

            mock_auth_service.logout.mockResolvedValue(mock_result as any);

            const result = await controller.logout(mock_req, mock_res);

            expect(mock_auth_service.logout).toHaveBeenCalledWith('valid-refresh', mock_res);
            expect(result).toEqual(mock_result);
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mock_req = { cookies: {} } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            await expect(controller.logout(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );

            expect(mock_auth_service.logout).not.toHaveBeenCalled();
        });

        it('should throw if authService.logout throws an error', async () => {
            const mock_req = { cookies: { refresh_token: 'invalid' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            mock_auth_service.logout.mockRejectedValue(
                new Error('Invalid or expired refresh token')
            );

            await expect(controller.logout(mock_req, mock_res)).rejects.toThrow(
                'Invalid or expired refresh token'
            );

            expect(mock_auth_service.logout).toHaveBeenCalledWith('invalid', mock_res);
        });
    });

    describe('logoutAll', () => {
        it('should call authService.logoutAll and return its result', async () => {
            const mock_req = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
            const mock_result = { message: 'Successfully logged out from all devices' };

            mock_auth_service.logoutAll.mockResolvedValue(mock_result as any);

            const result = await controller.logoutAll(mock_req, mock_res);

            expect(mock_auth_service.logoutAll).toHaveBeenCalledWith('valid-refresh', mock_res);
            expect(result).toEqual(mock_result);
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mock_req = { cookies: {} } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            await expect(controller.logoutAll(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );

            expect(mock_auth_service.logoutAll).not.toHaveBeenCalled();
        });

        it('should throw if authService.logoutAll throws an error', async () => {
            const mock_req = { cookies: { refresh_token: 'expired-token' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            mock_auth_service.logoutAll.mockRejectedValue(
                new Error('Invalid or expired refresh token')
            );

            await expect(controller.logoutAll(mock_req, mock_res)).rejects.toThrow(
                'Invalid or expired refresh token'
            );

            expect(mock_auth_service.logoutAll).toHaveBeenCalledWith('expired-token', mock_res);
        });
    });

    describe('changePassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.changePassword with correct arguments and return its result', async () => {
            const mock_body = { old_password: 'old123', new_password: 'new123' };
            const mock_user_id = 'user-1';
            const mock_result = { message: 'Password changed successfully' };

            mock_auth_service.changePassword.mockResolvedValue(mock_result as any);

            const result = await controller.changePassword(mock_body as any, mock_user_id);

            expect(mock_auth_service.changePassword).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.old_password,
                mock_body.new_password
            );
            expect(mock_auth_service.changePassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if authService.changePassword throws', async () => {
            const mock_body = { old_password: 'wrong', new_password: 'new' };
            const mock_user_id = 'user-1';

            mock_auth_service.changePassword.mockRejectedValue(new Error('Invalid old password'));

            await expect(controller.changePassword(mock_body as any, mock_user_id)).rejects.toThrow(
                'Invalid old password'
            );

            expect(mock_auth_service.changePassword).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.old_password,
                mock_body.new_password
            );
        });
    });

    describe('forgetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.sendResetPasswordEmail with the correct userId and return its result', async () => {
            const mock_user_id = 'user-123';
            const mock_result = { message: 'Password reset OTP sent to your email' };

            mock_auth_service.sendResetPasswordEmail.mockResolvedValue(mock_result as any);

            const result = await controller.forgetPassword(mock_user_id);

            expect(mock_auth_service.sendResetPasswordEmail).toHaveBeenCalledWith(mock_user_id);
            expect(mock_auth_service.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if authService.sendResetPasswordEmail throws', async () => {
            const mock_user_id = 'user-123';
            mock_auth_service.sendResetPasswordEmail.mockRejectedValue(new Error('User not found'));

            await expect(controller.forgetPassword(mock_user_id)).rejects.toThrow('User not found');

            expect(mock_auth_service.sendResetPasswordEmail).toHaveBeenCalledWith(mock_user_id);
        });
    });

    describe('verifyResetPasswordOtp', () => {
        it('should call authService.verifyResetPasswordOtp with correct arguments and return its result', async () => {
            const mock_body = { token: 'otp123' };
            const mock_user_id = 'user-123';
            const mock_result = { message: 'OTP verified successfully' };

            mock_auth_service.verifyResetPasswordOtp.mockResolvedValue(mock_result as any);

            const result = await controller.verifyResetPasswordOtp(mock_body as any, mock_user_id);

            expect(mock_auth_service.verifyResetPasswordOtp).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.token
            );
            expect(mock_auth_service.verifyResetPasswordOtp).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if authService.verifyResetPasswordOtp throws', async () => {
            const mock_body = { token: 'invalid' };
            const mock_user_id = 'user-123';

            mock_auth_service.verifyResetPasswordOtp.mockRejectedValue(
                new Error('Invalid or expired OTP')
            );

            await expect(
                controller.verifyResetPasswordOtp(mock_body as any, mock_user_id)
            ).rejects.toThrow('Invalid or expired OTP');

            expect(mock_auth_service.verifyResetPasswordOtp).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.token
            );
        });
    });

    describe('resetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call authService.resetPassword with correct arguments and return its result', async () => {
            const mock_user_id = 'user-123';
            const mock_body = { new_password: 'newPass123', reset_token: 'reset-token' };
            const mock_result = { message: 'Password reset successfully' };

            mock_auth_service.resetPassword.mockResolvedValue(mock_result as any);

            const result = await controller.resetPassword(mock_user_id, mock_body as any);

            expect(mock_auth_service.resetPassword).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.new_password,
                mock_body.reset_token
            );
            expect(mock_auth_service.resetPassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if authService.resetPassword throws', async () => {
            const mock_user_id = 'user-123';
            const mock_body = { new_password: 'failPass', reset_token: 'bad-token' };

            mock_auth_service.resetPassword.mockRejectedValue(
                new Error('Invalid or expired reset token')
            );

            await expect(controller.resetPassword(mock_user_id, mock_body as any)).rejects.toThrow(
                'Invalid or expired reset token'
            );

            expect(mock_auth_service.resetPassword).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.new_password,
                mock_body.reset_token
            );
        });
    });

    describe('googleLoginCallback', () => {
        const mock_frontend_url = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = mock_frontend_url;
        });

        it('should generate tokens, set cookie, and redirect to success URL', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            const mock_tokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mock_auth_service.generateTokens.mockResolvedValue(mock_tokens as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await controller.googleLoginCallback(mock_req, mock_res);

            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith('user123');
            expect(mock_set_cookie).toHaveBeenCalledWith(mock_res, mock_tokens.refresh_token);
            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/success?token=${mock_tokens.access_token}`
            );
        });

        it('should redirect to error page if generateTokens throws', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn() } as any;

            mock_auth_service.generateTokens.mockRejectedValue(new Error('OAuth failed'));

            await controller.googleLoginCallback(mock_req, mock_res);

            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith('user123');
            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/error?message=Authentication%20failed`
            );
        });
    });

    describe('facebookLoginCallback', () => {
        const mock_frontend_url = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = mock_frontend_url;
        });

        it('should generate tokens, set cookie, and redirect to success URL', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            const mock_tokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mock_auth_service.generateTokens.mockResolvedValue(mock_tokens as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await controller.facebookLoginCallback(mock_req, mock_res);

            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith('user123');
            expect(mock_set_cookie).toHaveBeenCalledWith(mock_res, mock_tokens.refresh_token);
            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/success?token=${mock_tokens.access_token}`
            );
        });

        it('should redirect to error page if generateTokens throws', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            mock_auth_service.generateTokens.mockRejectedValue(new Error('OAuth failed'));

            await controller.facebookLoginCallback(mock_req, mock_res);

            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith('user123');
            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/error?message=Authentication%20failed`
            );
        });
    });

    describe('githubCallback', () => {
        const mock_frontend_url = 'http://localhost:3001';

        beforeEach(() => {
            process.env.FRONTEND_URL = mock_frontend_url;
        });

        it('should generate tokens, set cookie, and redirect to success URL', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            const mock_tokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mock_auth_service.generateTokens.mockResolvedValue(mock_tokens as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await controller.githubCallback(mock_req, mock_res);

            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith('user123');
            expect(mock_set_cookie).toHaveBeenCalledWith(mock_res, mock_tokens.refresh_token);
            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/success?token=${mock_tokens.access_token}`
            );
        });

        it('should redirect to error page if generateTokens throws', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            mock_auth_service.generateTokens.mockRejectedValue(new Error('OAuth failed'));

            await controller.githubCallback(mock_req, mock_res);

            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith('user123');
            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/error?message=Authentication%20failed`
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
