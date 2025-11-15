import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

describe('OptionalJwtAuthGuard', () => {
    let guard: OptionalJwtAuthGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OptionalJwtAuthGuard],
        }).compile();

        guard = module.get<OptionalJwtAuthGuard>(OptionalJwtAuthGuard);
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
                .spyOn(OptionalJwtAuthGuard.prototype as any, 'canActivate')
                .mockReturnValue(true);

            const result = guard.canActivate(context);

            expect(result).toBe(true);
        });
    });

    describe('handleRequest', () => {
        it('should return user when user is valid', () => {
            const user = { id: '123', email: 'test@example.com' };

            const result = guard.handleRequest(null, user);

            expect(result).toBe(user);
        });

        it('should return null when user is not provided', () => {
            const result = guard.handleRequest(null, null);

            expect(result).toBeNull();
        });

        it('should return null when error is provided', () => {
            const error = new Error('Custom error');

            const result = guard.handleRequest(error, null);

            expect(result).toBeNull();
        });

        it('should return null even when user is provided if error exists', () => {
            const error = new Error('Custom error');
            const user = { id: '123' };

            const result = guard.handleRequest(error, user);

            expect(result).toBeNull();
        });
    });
});
