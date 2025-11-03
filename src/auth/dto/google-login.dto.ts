import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class GoogleLoginDTO {
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    google_id: string;

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
    @MaxLength(500)
    avatar_url?: string;
}
