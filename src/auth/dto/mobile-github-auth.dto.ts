import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class MobileGitHubAuthDto {
    @ApiProperty({
        description: 'GitHub authorization code received from mobile OAuth flow',
        example: 'a1b2c3d4e5f6g7h8i9j0',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(500)
    code: string;

    @ApiProperty({
        description: 'Redirect URI used in the mobile OAuth flow',
        example: 'myapp://auth/callback',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    redirect_uri: string;

    @ApiProperty({
        description: 'PKCE code verifier for secure OAuth flow (required when using PKCE)',
        example: 'EA9IJ6drEEEHGY3bqm2lpYaxBdiGa3j5HJficKD236BovBb9ZUXPhSnmJ4tXlZQB3R6i....',
        required: false,
    })
    @IsString()
    @MaxLength(500)
    code_verifier: string;
}
