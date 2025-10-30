import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MobileGoogleAuthDto {
    @ApiProperty({
        description: 'Google access token received from mobile OAuth flow',
        example: 'ya29.a0AfH6SMC...',
    })
    @IsNotEmpty()
    @IsString()
    access_token: string;
}
