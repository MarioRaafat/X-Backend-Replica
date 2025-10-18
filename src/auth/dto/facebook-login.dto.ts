import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FacebookLoginDTO {
    @IsString()
    facebook_id: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    first_name: string;

    @IsNotEmpty()
    @IsString()
    last_name: string;

    @IsOptional()
    @IsString()
    avatar_url?: string;
}
