import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LARGE_MAX_LENGTH, STRING_MAX_LENGTH } from 'src/constants/variables';

export class OAuthCompletionStep2Dto {
    @ApiProperty({
        description: 'OAuth session token',
        example: 'oauth_session_abc123',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    oauth_session_token: string;

    @ApiProperty({
        description: 'Selected username',
        example: 'mariooooo243098563',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    username: string;
}
