import { ValidationArguments } from 'class-validator';
import { AgeRangeValidator } from './birth-date';

describe('AgeRangeValidator', () => {
    let validator: AgeRangeValidator;

    beforeEach(() => {
        validator = new AgeRangeValidator();
    });

    describe('validate', () => {
        it('should return true for valid adult date (18+ years old)', () => {
            const valid_date = new Date();
            valid_date.setFullYear(valid_date.getFullYear() - 20);
            const date_string = valid_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(true);
        });

        it('should return true for exactly 18 years old', () => {
            const valid_date = new Date();
            valid_date.setFullYear(valid_date.getFullYear() - 18);
            valid_date.setDate(valid_date.getDate() - 1);
            const date_string = valid_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(true);
        });

        it('should return false for minor (under 18)', () => {
            const invalid_date = new Date();
            invalid_date.setFullYear(invalid_date.getFullYear() - 17);
            const date_string = invalid_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(false);
        });

        it('should return false for future date', () => {
            const future_date = new Date();
            future_date.setFullYear(future_date.getFullYear() + 1);
            const date_string = future_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(false);
        });

        it('should return false for today (age 0)', () => {
            const today = new Date();
            const date_string = today.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(false);
        });

        it('should return false for empty string', () => {
            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate('', args);

            expect(result).toBe(false);
        });

        it('should return false for null value', () => {
            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(null as any, args);

            expect(result).toBe(false);
        });

        it('should return false for invalid date string', () => {
            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate('invalid-date', args);

            expect(result).toBe(false);
        });

        it('should return false for very old date (150+ years)', () => {
            const very_old_date = new Date();
            very_old_date.setFullYear(very_old_date.getFullYear() - 151);
            const date_string = very_old_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(false);
        });

        it('should return true for exactly 150 years old', () => {
            const boundary_date = new Date();
            boundary_date.setFullYear(boundary_date.getFullYear() - 150);
            const date_string = boundary_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(true);
        });

        it('should return true for valid date 25 years ago', () => {
            const valid_date = new Date();
            valid_date.setFullYear(valid_date.getFullYear() - 25);
            const date_string = valid_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(true);
        });

        it('should handle leap year dates correctly', () => {
            const date_string = '1996-02-29'; // Leap year date

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const result = validator.validate(date_string, args);

            expect(result).toBe(true);
        });
    });

    describe('defaultMessage', () => {
        it('should return error message for too young', () => {
            const young_date = new Date();
            young_date.setFullYear(young_date.getFullYear() - 10);
            const date_string = young_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            validator.validate(date_string, args);
            const message = validator.defaultMessage(args);

            expect(message).toBe('You must be at least 18 years old.');
        });

        it('should return error message for too old', () => {
            const old_date = new Date();
            old_date.setFullYear(old_date.getFullYear() - 151);
            const date_string = old_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            validator.validate(date_string, args);
            const message = validator.defaultMessage(args);

            expect(message).toBe('You must be no more than 150 years old.');
        });

        it('should return error message for future date', () => {
            const future_date = new Date();
            future_date.setFullYear(future_date.getFullYear() + 1);
            const date_string = future_date.toISOString().split('T')[0];

            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            validator.validate(date_string, args);
            const message = validator.defaultMessage(args);

            expect(message).toBe('Birth date cannot be in the future');
        });

        it('should return error message for invalid format', () => {
            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            validator.validate('invalid', args);
            const message = validator.defaultMessage(args);

            expect(message).toBe('Please provide a valid birth date in YYYY-MM-DD format');
        });

        it('should return default message when no validation has been run', () => {
            const args = {
                constraints: [18, 150],
            } as ValidationArguments;

            const message = validator.defaultMessage(args);

            expect(message).toBe('User age must be between 18 and 150 years');
        });
    });
});
