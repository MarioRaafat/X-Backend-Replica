import { IsArray, IsEmail, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class OtpEmailJobDto {
    @IsEmail()
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    username: string;

    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    otp: string;

    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    email_type: 'verification' | 'reset_password' | 'update_email';

    @IsOptional()
    @IsString()
    @MaxLength(500)
    not_me_link?: string;
}
