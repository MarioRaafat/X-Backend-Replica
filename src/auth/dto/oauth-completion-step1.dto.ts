import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthCompletionStep1Dto {
    @ApiProperty({
        description: 'OAuth session token',
        example: 'oauth_session_abc123',
    })
    @IsNotEmpty()
    @IsString()
    oauth_session_token: string;

    @ApiProperty({
        description: 'User birth date',
        example: '2004-05-22',
        format: 'date',
    })
    @IsNotEmpty()
    @IsDateString()
    birth_date: string;
}
