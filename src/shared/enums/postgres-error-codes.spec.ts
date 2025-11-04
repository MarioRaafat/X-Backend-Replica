import { PostgresErrorCodes } from './postgres-error-codes';

describe('PostgresErrorCodes Enum', () => {
    it('should have FOREIGN_KEY_VIOLATION value', () => {
        expect(PostgresErrorCodes.FOREIGN_KEY_VIOLATION).toBe('23503');
    });

    it('should have UNIQUE_CONSTRAINT_VIOLATION value', () => {
        expect(PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION).toBe('23505');
    });

    it('should have exactly 2 error codes', () => {
        const codes = Object.values(PostgresErrorCodes);
        expect(codes).toHaveLength(2);
        expect(codes).toContain('23503');
        expect(codes).toContain('23505');
    });

    it('should be usable for error code comparison', () => {
        const error_code = '23503';
        expect(error_code).toBe(PostgresErrorCodes.FOREIGN_KEY_VIOLATION);
    });

    it('should distinguish between different error codes', () => {
        const foreign_key_error = PostgresErrorCodes.FOREIGN_KEY_VIOLATION;
        const unique_constraint_error = PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION;

        expect(foreign_key_error).not.toBe(unique_constraint_error);
        expect(foreign_key_error).toBe('23503');
        expect(unique_constraint_error).toBe('23505');
    });

    it('should be usable in switch statements', () => {
        const test_error_code = '23505' as PostgresErrorCodes;
        let error_message = '';

        switch (test_error_code) {
            case PostgresErrorCodes.FOREIGN_KEY_VIOLATION:
                error_message = 'Foreign key violation';
                break;
            case PostgresErrorCodes.UNIQUE_CONSTRAINT_VIOLATION:
                error_message = 'Unique constraint violation';
                break;
            default:
                error_message = 'Unknown error';
        }

        expect(error_message).toBe('Unique constraint violation');
    });
});
