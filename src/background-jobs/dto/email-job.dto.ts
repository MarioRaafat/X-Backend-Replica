import { IsString, IsOptional, IsEmail, ValidateNested, IsArray } from 'class-validator';

export class OtpEmailJobDto {
    @IsEmail()
    email: string;

    @IsString()
    username: string;

    @IsString()
    otp: string;

    @IsString()
    email_type: 'verification' | 'reset_password' | 'update_email';

    @IsOptional()
    @IsString()
    not_me_link?: string;
}