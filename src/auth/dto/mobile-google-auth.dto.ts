import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

export class MobileGoogleAuthDto {
    @ApiProperty({
        description: 'Google authorization code received from mobile OAuth flow',
        example: '4/0AY0e-g7X...',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    code: string;

    @ApiProperty({
        description: 'Redirect URI used in the mobile OAuth flow',
        example:
            'com.googleusercontent.apps.267742768558-tpurcaab6iqbuvf6vjvnm0hk2t5ckkfu:/oauth2redirect',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    redirect_uri: string;

    @ApiProperty({
        description: 'PKCE code verifier for secure OAuth flow (optional for Google)',
        example: 'EA9IJ6drEEEHGY3bqm2lpYaxBdiGa3j5HJficKD236BovBb9ZUXPhSnmJ4tXlZQB3R6i....',
        required: false,
    })
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    @IsOptional()
    code_verifier?: string;
}
