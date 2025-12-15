import {
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'ageRange', async: false })
export class AgeRangeValidator implements ValidatorConstraintInterface {
    private age_calculation_result: { age: number; is_valid: boolean; reason?: string } | null =
        null;

    validate(birth_date_string: string, args: ValidationArguments) {
        if (!birth_date_string) {
            this.age_calculation_result = { age: 0, is_valid: false, reason: 'invalid' };
            return false;
        }

        const [min_age, max_age] = args.constraints;
        const birth_date = new Date(birth_date_string);
        const today = new Date();

        // Check if date is valid
        if (Number.isNaN(birth_date.getTime())) {
            this.age_calculation_result = { age: 0, is_valid: false, reason: 'invalid' };
            return false;
        }

        // Check if birth date is in the future
        if (birth_date > today) {
            this.age_calculation_result = { age: 0, is_valid: false, reason: 'future' };
            return false;
        }

        // Calculate age
        let age = today.getFullYear() - birth_date.getFullYear();
        const month_diff = today.getMonth() - birth_date.getMonth();

        if (month_diff < 0 || (month_diff === 0 && today.getDate() < birth_date.getDate())) {
            age--;
        }

        // Store the result for use in error message
        if (age < min_age) {
            this.age_calculation_result = { age, is_valid: false, reason: 'too_young' };
            return false;
        } else if (age > max_age) {
            this.age_calculation_result = { age, is_valid: false, reason: 'too_old' };
            return false;
        } else {
            this.age_calculation_result = { age, is_valid: true };
            return true;
        }
    }

    defaultMessage(args: ValidationArguments) {
        const [min_age, max_age] = args.constraints;

        if (!this.age_calculation_result) {
            return `User age must be between ${min_age} and ${max_age} years`;
        }

        const { reason } = this.age_calculation_result;

        switch (reason) {
            case 'too_young':
                return `You must be at least ${min_age} years old.`;
            case 'too_old':
                return `You must be no more than ${max_age} years old.`;
            case 'future':
                return 'Birth date cannot be in the future';
            case 'invalid':
                return 'Please provide a valid birth date in YYYY-MM-DD format';
            default:
                return `User age must be between ${min_age} and ${max_age} years`;
        }
    }
}
