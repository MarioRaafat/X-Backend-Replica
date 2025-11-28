import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

export class FacebookLoginDTO {
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    facebook_id: string;

    @IsEmail()
    @MaxLength(STRING_MAX_LENGTH)
    email: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    first_name: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    last_name: string;

    @IsOptional()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    avatar_url?: string;
}
