import { IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

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
    @MaxLength(LARGE_MAX_LENGTH)
    not_me_link?: string;
}
