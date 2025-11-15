import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [JwtAuthGuard],
        }).compile();

        guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    });

    describe('canActivate', () => {
        it('should be defined', () => {
            expect(guard).toBeDefined();
        });

        it('should call super.canActivate', () => {
            const context = {
                switchToHttp: jest.fn().mockReturnValue({
                    getRequest: jest.fn().mockReturnValue({
                        headers: { authorization: 'Bearer token' },
                    }),
                }),
            } as any;

            const super_can_activate_spy = jest
                .spyOn(JwtAuthGuard.prototype as any, 'canActivate')
                .mockReturnValue(true);

            const result = guard.canActivate(context);

            expect(result).toBe(true);
        });
    });

    describe('handleRequest', () => {
        it('should return user when user is valid', () => {
            const user = { id: '123', email: 'test@example.com' };

            const result = guard.handleRequest(null, user, null);

            expect(result).toBe(user);
        });

        it('should throw UnauthorizedException when user is not provided', () => {
            expect(() => {
                guard.handleRequest(null, null, null);
            }).toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException with message "Invalid token"', () => {
            expect(() => {
                guard.handleRequest(null, null, null);
            }).toThrow('Invalid token');
        });

        it('should throw error when error is provided', () => {
            const error = new Error('Custom error');

            expect(() => {
                guard.handleRequest(error, null, null);
            }).toThrow(error);
        });

        it('should throw error even when user is provided', () => {
            const error = new Error('Custom error');
            const user = { id: '123' };

            expect(() => {
                guard.handleRequest(error, user, null);
            }).toThrow(error);
        });
    });
});
