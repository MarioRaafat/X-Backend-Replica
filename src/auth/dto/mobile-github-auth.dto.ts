import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MobileGitHubAuthDto {
    @ApiProperty({
        description: 'GitHub authorization code received from mobile OAuth flow',
        example: 'a1b2c3d4e5f6g7h8i9j0',
    })
    @IsNotEmpty()
    @IsString()
    code: string;

    @ApiProperty({
        description: 'Redirect URI used in the mobile OAuth flow',
        example: 'myapp://auth/callback',
    })
    @IsNotEmpty()
    @IsString()
    redirect_uri: string;

    @ApiProperty({
        description: 'PKCE code verifier for secure OAuth flow (required when using PKCE)',
        example: 'EA9IJ6drEEEHGY3bqm2lpYaxBdiGa3j5HJficKD236BovBb9ZUXPhSnmJ4tXlZQB3R6i....',
        required: false,
    })
    @IsString()
    code_verifier: string;
}
