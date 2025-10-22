import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MobileGitHubAuthDto {
    @ApiProperty({
        description: 'GitHub access token received from mobile OAuth flow',
        example: 'ghp_...',
    })
    @IsNotEmpty()
    @IsString()
    access_token: string;
}