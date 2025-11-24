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
                        createExchangeToken: jest.fn(),
                        oauthCompletionStep1: jest.fn(),
                        oauthCompletionStep2: jest.fn(),
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

    describe('signupStep1', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.signupStep1 with the given dto and return its result', async () => {
            const mock_dto = { email: 'test@example.com' };
            const mock_result = { message: 'OTP sent to email' };

            mock_auth_service.signupStep1.mockResolvedValue(mock_result as any);

            const result = await controller.signupStep1(mock_dto as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep1).toHaveBeenCalledWith(mock_dto);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep1).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.signupStep1 throws', async () => {
            const mock_dto = { email: 'existing@example.com' };
            mock_auth_service.signupStep1.mockRejectedValue(
                new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS)
            );

            await expect(controller.signupStep1(mock_dto as any)).rejects.toThrow(
                ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep1).toHaveBeenCalledWith(mock_dto);
        });
    });

    describe('signupStep2', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.signupStep2 with the given dto and return its result', async () => {
            const mock_dto = { email: 'test@example.com', otp: '123456' };
            const mock_result = { message: 'Email verified successfully' };

            mock_auth_service.signupStep2.mockResolvedValue(mock_result as any);

            const result = await controller.signupStep2(mock_dto as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep2).toHaveBeenCalledWith(mock_dto);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep2).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.signupStep2 throws', async () => {
            const mock_dto = { email: 'test@example.com', otp: 'invalid' };
            mock_auth_service.signupStep2.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.signupStep2(mock_dto as any)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep2).toHaveBeenCalledWith(mock_dto);
        });
    });

    describe('signupStep3', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.signupStep3, set cookie, and return user data', async () => {
            const mock_dto = { username: 'testuser', password: 'password123' };
            const mock_result = {
                user: { id: 'user123', username: 'testuser' },
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mock_auth_service.signupStep3.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const mock_response = { cookie: jest.fn() };

            const result = await controller.signupStep3(mock_dto as any, mock_response as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep3).toHaveBeenCalledWith(mock_dto);

            expect(mock_set_cookie).toHaveBeenCalledWith(mock_response, mock_result.refresh_token);
            expect(result).toEqual({
                user: mock_result.user,
                access_token: mock_result.access_token,
            });
        });

        it('should throw if auth_service.signupStep3 throws', async () => {
            const mock_dto = { username: 'existing_user', password: 'password123' };
            mock_auth_service.signupStep3.mockRejectedValue(
                new Error(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
            );

            const mock_response = { cookie: jest.fn() };
            await expect(
                controller.signupStep3(mock_dto as any, mock_response as any)
            ).rejects.toThrow(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.signupStep3).toHaveBeenCalledWith(mock_dto);
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mock_dto = { username: 'testuser', password: 'password123' };
            const mock_result = {
                user: { id: 'user123', username: 'testuser' },
                access_token: 'access123',
                refresh_token: 'refresh123',
            };
            mock_auth_service.signupStep3.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn(() => {
                throw new Error('Cookie error');
            });
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await expect(
                controller.signupStep3(mock_dto as any, { cookie: jest.fn() } as any)
            ).rejects.toThrow('Cookie error');
        });
    });

    describe('generateEmailVerification', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.generateEmailVerification with the given email', async () => {
            const mock_response = { message: 'OTP sent' };
            const email = 'test@example.com';
            (mock_auth_service.generateEmailVerification as jest.Mock).mockResolvedValueOnce(
                mock_response
            );

            const result = await controller.generateEmailVerification({ email });

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledWith(email);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const email = 'fail@example.com';
            mock_auth_service.generateEmailVerification.mockRejectedValueOnce(
                new Error(ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL)
            );

            await expect(controller.generateEmailVerification({ email })).rejects.toThrow(
                ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledWith(email);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.generateEmailVerification).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleNotMe', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.handleNotMe with the correct token and return the result', async () => {
            const mock_result = { message: 'deleted account successfully' };
            mock_auth_service.handleNotMe.mockResolvedValue(mock_result as any);

            const result = await controller.handleNotMe('valid-token');

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledWith('valid-token');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledTimes(1);
            expect(result).toBe(mock_result);
        });

        it('should throw if auth_service.handleNotMe throws', async () => {
            mock_auth_service.handleNotMe.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.handleNotMe('bad-token')).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledWith('bad-token');
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.handleNotMe).toHaveBeenCalledTimes(1);
        });
    });

    describe('login', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return access token and user on successful login', async () => {
            const mock_login_dto = { identifier: 'user@example.com', password: '123456' };
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

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.login).toHaveBeenCalledWith(mock_login_dto);

            expect(mock_set_cookie).toHaveBeenCalledWith(mock_response, mock_result.refresh_token);
            expect(result).toEqual({
                access_token: mock_result.access_token,
                user: mock_result.user,
            });
        });

        it('should throw if AuthService.login throws', async () => {
            mock_auth_service.login.mockRejectedValue(new Error(ERROR_MESSAGES.WRONG_PASSWORD));

            const mock_response = { cookie: jest.fn() };
            await expect(
                controller.login({ email: 'bad', password: 'wrong' } as any, mock_response as any)
            ).rejects.toThrow(ERROR_MESSAGES.WRONG_PASSWORD);
            // eslint-disable-next-line @typescript-eslint/unbound-method
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

            // eslint-disable-next-line @typescript-eslint/unbound-method
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
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.refresh).not.toHaveBeenCalled();
        });

        it('should throw if auth_service.refresh throws', async () => {
            const mock_req = { cookies: { refresh_token: 'invalid' } } as any;
            const mock_res = { cookie: jest.fn() } as any;

            mock_auth_service.refresh.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.refresh(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
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

        it('should call auth_service.logout and return its result', async () => {
            const mock_req = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
            const mock_result = { message: 'Successfully logged out' };

            mock_auth_service.logout.mockResolvedValue(mock_result as any);

            const result = await controller.logout(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.logout).toHaveBeenCalledWith('valid-refresh', mock_res);
            expect(result).toEqual(mock_result);
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mock_req = { cookies: {} } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            await expect(controller.logout(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.logout).not.toHaveBeenCalled();
        });

        it('should throw if auth_service.logout throws an error', async () => {
            const mock_req = { cookies: { refresh_token: 'invalid' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            mock_auth_service.logout.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.logout(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.logout).toHaveBeenCalledWith('invalid', mock_res);
        });
    });

    describe('logoutAll', () => {
        it('should call auth_service.logoutAll and return its result', async () => {
            const mock_req = { cookies: { refresh_token: 'valid-refresh' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
            const mock_result = { message: 'Successfully logged out from all devices' };

            mock_auth_service.logoutAll.mockResolvedValue(mock_result as any);

            const result = await controller.logoutAll(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.logoutAll).toHaveBeenCalledWith('valid-refresh', mock_res);
            expect(result).toEqual(mock_result);
        });

        it('should throw BadRequestException if no refresh token is provided', async () => {
            const mock_req = { cookies: {} } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            await expect(controller.logoutAll(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.NO_REFRESH_TOKEN_PROVIDED
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.logoutAll).not.toHaveBeenCalled();
        });

        it('should throw if auth_service.logoutAll throws an error', async () => {
            const mock_req = { cookies: { refresh_token: 'expired-token' } } as any;
            const mock_res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

            mock_auth_service.logoutAll.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.logoutAll(mock_req, mock_res)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.logoutAll).toHaveBeenCalledWith('expired-token', mock_res);
        });
    });

    describe('changePassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.changePassword with correct arguments and return its result', async () => {
            const mock_body = { old_password: 'old123', new_password: 'new123' };
            const mock_user_id = 'user-1';
            const mock_result = { message: 'Password changed successfully' };

            mock_auth_service.changePassword.mockResolvedValue(mock_result as any);

            const result = await controller.changePassword(mock_body as any, mock_user_id);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.changePassword).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.old_password,
                mock_body.new_password
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.changePassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.changePassword throws', async () => {
            const mock_body = { old_password: 'wrong', new_password: 'new' };
            const mock_user_id = 'user-1';

            mock_auth_service.changePassword.mockRejectedValue(
                new Error(ERROR_MESSAGES.WRONG_PASSWORD)
            );

            await expect(controller.changePassword(mock_body as any, mock_user_id)).rejects.toThrow(
                ERROR_MESSAGES.WRONG_PASSWORD
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.changePassword).toHaveBeenCalledWith(
                mock_user_id,
                mock_body.old_password,
                mock_body.new_password
            );
        });
    });

    describe('forgetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.sendResetPasswordEmail with the correct user_id and return its result', async () => {
            const forget_req = {
                identifier: 'user123',
            };
            const mock_result = { message: 'Password reset OTP sent to your email' };

            mock_auth_service.sendResetPasswordEmail.mockResolvedValue(mock_result as any);

            const result = await controller.forgetPassword(forget_req);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.sendResetPasswordEmail).toHaveBeenCalledWith(
                forget_req.identifier
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.sendResetPasswordEmail throws', async () => {
            const forget_req = {
                identifier: 'user-123',
            };
            mock_auth_service.sendResetPasswordEmail.mockRejectedValue(
                new Error(ERROR_MESSAGES.USER_NOT_FOUND)
            );

            await expect(controller.forgetPassword(forget_req)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.sendResetPasswordEmail).toHaveBeenCalledWith(
                forget_req.identifier
            );
        });
    });

    describe('verifyResetPasswordOtp', () => {
        it('should call auth_service.verifyResetPasswordOtp with correct arguments and return its result', async () => {
            const mock_body = { token: 'otp123', identifier: 'user-123' };
            const mock_result = { message: 'OTP verified successfully' };

            mock_auth_service.verifyResetPasswordOtp.mockResolvedValue(mock_result as any);

            const result = await controller.verifyResetPasswordOtp(mock_body);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyResetPasswordOtp).toHaveBeenCalledWith(
                mock_body.identifier,
                mock_body.token
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyResetPasswordOtp).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.verifyResetPasswordOtp throws', async () => {
            const mock_body = { token: 'invalid', identifier: 'user-123' };

            mock_auth_service.verifyResetPasswordOtp.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.verifyResetPasswordOtp(mock_body as any)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyResetPasswordOtp).toHaveBeenCalledWith(
                mock_body.identifier,
                mock_body.token
            );
        });
    });

    describe('resetPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.resetPassword with correct arguments and return its result', async () => {
            const mock_user_id = 'user-123';
            const mock_body = {
                new_password: 'newPass123',
                reset_token: 'reset-token',
                identifier: 'user-123',
            };
            const mock_result = { message: 'Password reset successfully' };

            mock_auth_service.resetPassword.mockResolvedValue(mock_result as any);

            const result = await controller.resetPassword(mock_body as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.resetPassword).toHaveBeenCalledWith(
                mock_body.identifier,
                mock_body.new_password,
                mock_body.reset_token
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.resetPassword).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.resetPassword throws', async () => {
            const mock_body = {
                new_password: 'failPass',
                reset_token: 'bad-token',
                identifier: 'user-123',
            };

            mock_auth_service.resetPassword.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(controller.resetPassword(mock_body as any)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.resetPassword).toHaveBeenCalledWith(
                mock_body.identifier,
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

            const mock_exchange_token = 'exchange_token_123';

            mock_auth_service.createExchangeToken.mockResolvedValue(mock_exchange_token);

            await controller.googleLoginCallback(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createExchangeToken).toHaveBeenCalledWith({
                user_id: 'user123',
                type: 'auth',
            });

            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/success?exchange_token=${encodeURIComponent(mock_exchange_token)}&provider=google`
            );
        });

        it('should redirect to error page if createExchangeToken throws', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn() } as any;

            mock_auth_service.createExchangeToken.mockRejectedValue(new Error('OAuth failed'));

            await controller.googleLoginCallback(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createExchangeToken).toHaveBeenCalledWith({
                user_id: 'user123',
                type: 'auth',
            });

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

            const mock_exchange_token = 'exchange_token_123';

            mock_auth_service.createExchangeToken.mockResolvedValue(mock_exchange_token);

            await controller.facebookLoginCallback(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createExchangeToken).toHaveBeenCalledWith({
                user_id: 'user123',
                type: 'auth',
            });

            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/success?exchange_token=${encodeURIComponent(mock_exchange_token)}&provider=facebook`
            );
        });

        it('should redirect to error page if createExchangeToken throws', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            mock_auth_service.createExchangeToken.mockRejectedValue(new Error('OAuth failed'));

            await controller.facebookLoginCallback(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createExchangeToken).toHaveBeenCalledWith({
                user_id: 'user123',
                type: 'auth',
            });

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

            const mock_exchange_token = 'exchange_token_123';

            mock_auth_service.createExchangeToken.mockResolvedValue(mock_exchange_token);

            await controller.githubCallback(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createExchangeToken).toHaveBeenCalledWith({
                user_id: 'user123',
                type: 'auth',
            });

            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/success?exchange_token=${encodeURIComponent(mock_exchange_token)}&provider=github`
            );
        });

        it('should redirect to error page if createExchangeToken throws', async () => {
            const mock_req = { user: { id: 'user123' } } as any;
            const mock_res = { redirect: jest.fn(), cookie: jest.fn() } as any;

            mock_auth_service.createExchangeToken.mockRejectedValue(new Error('OAuth failed'));

            await controller.githubCallback(mock_req, mock_res);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createExchangeToken).toHaveBeenCalledWith({
                user_id: 'user123',
                type: 'auth',
            });

            expect(mock_res.redirect).toHaveBeenCalledWith(
                `${mock_frontend_url}/auth/error?message=Authentication%20failed`
            );
        });
    });

    describe('checkIdentifier', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.checkIdentifier with the given identifier and return its result', async () => {
            const mock_dto = { identifier: 'testuser' };
            const mock_result = { available: true };

            mock_auth_service.checkIdentifier.mockResolvedValue(mock_result as any);

            const result = await controller.checkIdentifier(mock_dto as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.checkIdentifier).toHaveBeenCalledWith(mock_dto.identifier);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.checkIdentifier).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.checkIdentifier throws', async () => {
            const mock_dto = { identifier: 'existing_user' };
            mock_auth_service.checkIdentifier.mockRejectedValue(
                new Error(ERROR_MESSAGES.USERNAME_NOT_FOUND)
            );

            await expect(controller.checkIdentifier(mock_dto as any)).rejects.toThrow(
                ERROR_MESSAGES.USERNAME_NOT_FOUND
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.checkIdentifier).toHaveBeenCalledWith(mock_dto.identifier);
        });
    });

    describe('updateUsername', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.updateUsername with correct arguments and return its result', async () => {
            const mock_dto = { username: 'newusername' };
            const mock_user_id = 'user123';
            const mock_result = { message: 'Username updated successfully' };

            mock_auth_service.updateUsername.mockResolvedValue(mock_result as any);

            const result = await controller.updateUsername(mock_dto as any, mock_user_id);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.updateUsername).toHaveBeenCalledWith(
                mock_user_id,
                mock_dto.username
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.updateUsername).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.updateUsername throws', async () => {
            const mock_dto = { username: 'existing_user' };
            const mock_user_id = 'user123';
            mock_auth_service.updateUsername.mockRejectedValue(
                new Error(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
            );

            await expect(controller.updateUsername(mock_dto as any, mock_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USERNAME_ALREADY_TAKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.updateUsername).toHaveBeenCalledWith(
                mock_user_id,
                mock_dto.username
            );
        });
    });

    describe('updateEmail', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.updateEmail with correct arguments and return its result', async () => {
            const mock_dto = { new_email: 'newemail@example.com' };
            const mock_user_id = 'user123';
            const mock_result = { message: 'Email update initiated, OTP sent' };

            mock_auth_service.updateEmail.mockResolvedValue(mock_result as any);

            const result = await controller.updateEmail(mock_dto as any, mock_user_id);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.updateEmail).toHaveBeenCalledWith(
                mock_user_id,
                mock_dto.new_email
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.updateEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.updateEmail throws', async () => {
            const mock_dto = { new_email: 'existing@example.com' };
            const mock_user_id = 'user123';
            mock_auth_service.updateEmail.mockRejectedValue(new Error('Email already exists'));

            await expect(controller.updateEmail(mock_dto as any, mock_user_id)).rejects.toThrow(
                'Email already exists'
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.updateEmail).toHaveBeenCalledWith(
                mock_user_id,
                mock_dto.new_email
            );
        });
    });

    describe('verifyUpdateEmail', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.verifyUpdateEmail with correct arguments and return its result', async () => {
            const mock_dto = { new_email: 'newemail@example.com', otp: '123456' };
            const mock_user_id = 'user123';
            const mock_result = { message: 'Email updated successfully' };

            mock_auth_service.verifyUpdateEmail.mockResolvedValue(mock_result as any);

            const result = await controller.verifyUpdateEmail(mock_dto as any, mock_user_id);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyUpdateEmail).toHaveBeenCalledWith(
                mock_user_id,
                mock_dto.new_email,
                mock_dto.otp
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyUpdateEmail).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.verifyUpdateEmail throws', async () => {
            const mock_dto = { new_email: 'newemail@example.com', otp: 'invalid' };
            const mock_user_id = 'user123';
            mock_auth_service.verifyUpdateEmail.mockRejectedValue(
                new Error(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
            );

            await expect(
                controller.verifyUpdateEmail(mock_dto as any, mock_user_id)
            ).rejects.toThrow(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyUpdateEmail).toHaveBeenCalledWith(
                mock_user_id,
                mock_dto.new_email,
                mock_dto.otp
            );
        });
    });

    describe('mobileGoogleAuth', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return needs_completion when user needs to complete OAuth registration', async () => {
            const mock_dto = { access_token: 'google-token' };
            const mock_result = {
                needs_completion: true,
                user: { id: 'user123', email: 'test@example.com' },
            };

            mock_auth_service.verifyGoogleMobileToken.mockResolvedValue(mock_result as any);
            mock_auth_service.createOAuthSession.mockResolvedValue('session-token' as any);

            const mock_response = { cookie: jest.fn() };

            const result = await controller.mobileGoogleAuth(mock_dto as any, mock_response as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyGoogleMobileToken).toHaveBeenCalledWith(
                mock_dto.access_token
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createOAuthSession).toHaveBeenCalledWith(mock_result.user);
            expect(result).toEqual({
                needs_completion: true,
                session_token: 'session-token',
                provider: 'google',
            });
        });

        it('should return access token and user when authentication is successful', async () => {
            const mock_dto = { access_token: 'google-token' };
            const mock_result = {
                user: { id: 'user123', email: 'test@example.com' },
            };
            const mock_tokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mock_auth_service.verifyGoogleMobileToken.mockResolvedValue(mock_result as any);
            mock_auth_service.generateTokens.mockResolvedValue(mock_tokens as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const mock_response = { cookie: jest.fn() };

            const result = await controller.mobileGoogleAuth(mock_dto as any, mock_response as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyGoogleMobileToken).toHaveBeenCalledWith(
                mock_dto.access_token
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith(mock_result.user.id);

            expect(mock_set_cookie).toHaveBeenCalledWith(mock_response, mock_tokens.refresh_token);
            expect(result).toEqual({
                access_token: mock_tokens.access_token,
                user: mock_result.user,
            });
        });

        it('should throw BadRequestException if user data is invalid', async () => {
            const mock_dto = { access_token: 'invalid-token' };
            const mock_result = { user: {} }; // Missing id

            mock_auth_service.verifyGoogleMobileToken.mockResolvedValue(mock_result as any);

            const mock_response = { cookie: jest.fn() };

            await expect(
                controller.mobileGoogleAuth(mock_dto as any, mock_response as any)
            ).rejects.toThrow(ERROR_MESSAGES.GOOGLE_TOKEN_INVALID);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyGoogleMobileToken).toHaveBeenCalledWith(
                mock_dto.access_token
            );
        });
    });

    describe('mobileGitHubAuth', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return needs_completion when user needs to complete OAuth registration', async () => {
            const mock_dto = {
                code: 'github-code',
                redirect_uri: 'http://localhost',
                code_verifier: 'verifier',
            };
            const mock_result = {
                needs_completion: true,
                user: { id: 'user123', email: 'test@example.com' },
            };

            mock_auth_service.verifyGitHubMobileToken.mockResolvedValue(mock_result as any);
            mock_auth_service.createOAuthSession.mockResolvedValue('session-token' as any);

            const mock_response = { cookie: jest.fn() };

            const result = await controller.mobileGitHubAuth(mock_dto as any, mock_response as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyGitHubMobileToken).toHaveBeenCalledWith(
                mock_dto.code,
                mock_dto.redirect_uri,
                mock_dto.code_verifier
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.createOAuthSession).toHaveBeenCalledWith(mock_result.user);
            expect(result).toEqual({
                needs_completion: true,
                session_token: 'session-token',
                provider: 'github',
            });
        });

        it('should return access token and user when authentication is successful', async () => {
            const mock_dto = {
                code: 'github-code',
                redirect_uri: 'http://localhost',
                code_verifier: 'verifier',
            };
            const mock_result = {
                user: { id: 'user123', email: 'test@example.com' },
            };
            const mock_tokens = {
                access_token: 'access123',
                refresh_token: 'refresh123',
            };

            mock_auth_service.verifyGitHubMobileToken.mockResolvedValue(mock_result as any);
            mock_auth_service.generateTokens.mockResolvedValue(mock_tokens as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const mock_response = { cookie: jest.fn() };

            const result = await controller.mobileGitHubAuth(mock_dto as any, mock_response as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyGitHubMobileToken).toHaveBeenCalledWith(
                mock_dto.code,
                mock_dto.redirect_uri,
                mock_dto.code_verifier
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.generateTokens).toHaveBeenCalledWith(mock_result.user.id);

            expect(mock_set_cookie).toHaveBeenCalledWith(mock_response, mock_tokens.refresh_token);
            expect(result).toEqual({
                access_token: mock_tokens.access_token,
                user: mock_result.user,
            });
        });

        it('should throw BadRequestException if user data is invalid', async () => {
            const mock_dto = {
                code: 'invalid-code',
                redirect_uri: 'http://localhost',
                code_verifier: 'verifier',
            };
            const mock_result = { user: {} }; // Missing id

            mock_auth_service.verifyGitHubMobileToken.mockResolvedValue(mock_result as any);

            const mock_response = { cookie: jest.fn() };

            await expect(
                controller.mobileGitHubAuth(mock_dto as any, mock_response as any)
            ).rejects.toThrow(ERROR_MESSAGES.GITHUB_TOKEN_INVALID);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.verifyGitHubMobileToken).toHaveBeenCalledWith(
                mock_dto.code,
                mock_dto.redirect_uri,
                mock_dto.code_verifier
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

        it('should call auth_service.oauthCompletionStep1 with the given dto and return its result', async () => {
            const mock_dto = { session_token: 'session123', birth_date: '1990-01-01' };
            const mock_result = { message: 'Birth date set successfully' };

            mock_auth_service.oauthCompletionStep1.mockResolvedValue(mock_result as any);

            const result = await controller.oauthCompletionStep1(mock_dto as any);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.oauthCompletionStep1).toHaveBeenCalledWith(mock_dto);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.oauthCompletionStep1).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_result);
        });

        it('should throw if auth_service.oauthCompletionStep1 throws', async () => {
            const mock_dto = { session_token: 'invalid-session', birth_date: '1990-01-01' };
            mock_auth_service.oauthCompletionStep1.mockRejectedValue(
                new Error('Invalid OAuth session token')
            );

            await expect(controller.oauthCompletionStep1(mock_dto as any)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_OAUTH_SESSION_TOKEN
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.oauthCompletionStep1).toHaveBeenCalledWith(mock_dto);
        });
    });

    describe('oauthCompletionStep2', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should call auth_service.oauthCompletionStep2, set cookie, and return tokens and user', async () => {
            const mock_dto = { session_token: 'session123', username: 'newuser' };
            const mock_result = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: { id: 'user123', username: 'newuser' },
            };

            mock_auth_service.oauthCompletionStep2.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const mock_response = { cookie: jest.fn() };

            const result = await controller.oauthCompletionStep2(
                mock_dto as any,
                mock_response as any
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.oauthCompletionStep2).toHaveBeenCalledWith(mock_dto);

            expect(mock_set_cookie).toHaveBeenCalledWith(mock_response, mock_result.refresh_token);
            expect(result).toEqual({
                access_token: mock_result.access_token,
                user: mock_result.user,
            });
        });

        it('should throw if auth_service.oauthCompletionStep2 throws', async () => {
            const mock_dto = { session_token: 'session123', username: 'existing_user' };
            mock_auth_service.oauthCompletionStep2.mockRejectedValue(
                new Error(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN)
            );

            const mock_response = { cookie: jest.fn() };
            await expect(
                controller.oauthCompletionStep2(mock_dto as any, mock_response as any)
            ).rejects.toThrow(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mock_auth_service.oauthCompletionStep2).toHaveBeenCalledWith(mock_dto);
        });

        it('should throw if httpOnlyRefreshToken fails', async () => {
            const mock_dto = { session_token: 'session123', username: 'newuser' };
            const mock_result = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: { id: 'user123', username: 'newuser' },
            };
            mock_auth_service.oauthCompletionStep2.mockResolvedValue(mock_result as any);
            const mock_set_cookie = jest.fn(() => {
                throw new Error('Cookie error');
            });
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            await expect(
                controller.oauthCompletionStep2(mock_dto as any, { cookie: jest.fn() } as any)
            ).rejects.toThrow('Cookie error');
        });
    });

    describe('getCaptchaSiteKey', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should return captcha site key', () => {
            const original_env = process.env.CAPTCHA_SITE_KEY;
            process.env.CAPTCHA_SITE_KEY = 'test-site-key';

            const result = controller.getCaptchaSiteKey();

            expect(result).toEqual({ siteKey: 'test-site-key' });

            process.env.CAPTCHA_SITE_KEY = original_env;
        });
    });

    describe('exchangeToken', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should exchange token successfully', async () => {
            const mock_dto = { exchange_token: 'exchange-token' };
            const mock_validation_result = {
                user_id: 'user-1',
                type: 'auth' as const,
            };
            const mock_tokens = {
                access_token: 'access-token',
                refresh_token: 'refresh-token',
            };

            mock_auth_service.validateExchangeToken.mockResolvedValue(mock_validation_result);
            mock_auth_service.generateTokens.mockResolvedValue(mock_tokens as any);
            const mock_set_cookie = jest.fn();
            controller['httpOnlyRefreshToken'] = mock_set_cookie;

            const mock_response = { cookie: jest.fn() };
            const result = await controller.exchangeToken(mock_dto as any, mock_response as any);

            expect(mock_auth_service.validateExchangeToken).toHaveBeenCalledWith('exchange-token');
            expect(result).toEqual({ access_token: 'access-token' });
        });

        it('should throw if exchange token is invalid', async () => {
            const mock_dto = { exchange_token: 'invalid-token' };

            mock_auth_service.validateExchangeToken.mockRejectedValue(new Error('Invalid token'));

            const mock_response = { cookie: jest.fn() };
            await expect(
                controller.exchangeToken(mock_dto as any, mock_response as any)
            ).rejects.toThrow('Invalid token');
        });
    });

    describe('confirmPassword', () => {
        beforeEach(() => jest.clearAllMocks());

        it('should confirm password successfully', async () => {
            const mock_dto = { password: 'correct-password' };
            const mock_user = { id: 'user-1' };
            const mock_result = { valid: true };

            mock_auth_service.confirmPassword.mockResolvedValue(mock_result as any);

            const result = await controller.confirmPassword(mock_dto as any, mock_user as any);

            expect(mock_auth_service.confirmPassword).toHaveBeenCalledWith(mock_dto, 'user-1');
            expect(result).toEqual(mock_result);
        });

        it('should throw if password is incorrect', async () => {
            const mock_dto = { password: 'wrong-password' };
            const mock_user = { id: 'user-1' };

            mock_auth_service.confirmPassword.mockRejectedValue(
                new Error(ERROR_MESSAGES.WRONG_PASSWORD)
            );

            await expect(
                controller.confirmPassword(mock_dto as any, mock_user as any)
            ).rejects.toThrow(ERROR_MESSAGES.WRONG_PASSWORD);
        });
    });
});
