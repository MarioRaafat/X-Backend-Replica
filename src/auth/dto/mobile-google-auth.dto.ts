import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LARGE_MAX_LENGTH } from 'src/constants/variables';

export class MobileGoogleAuthDto {
    @ApiProperty({
        description: 'Google access token received from mobile OAuth flow',
        example: 'ya29.a0AfH6SMC...',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    access_token: string;
}
