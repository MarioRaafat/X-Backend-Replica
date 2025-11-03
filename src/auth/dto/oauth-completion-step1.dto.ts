import { IsDateString, IsNotEmpty, IsString, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgeRangeValidator } from '../../validations/birth-date';

export class OAuthCompletionStep1Dto {
    @ApiProperty({
        description: 'OAuth session token',
        example: 'oauth_session_abc123',
    })
    @IsNotEmpty()
    @IsString()
    oauth_session_token: string;

    @ApiProperty({
        description: "Mario's birth date",
        example: '2004-05-22',
        format: 'date',
    })
    @IsNotEmpty()
    @IsDateString()
    @Validate(AgeRangeValidator, [6, 100])
    birth_date: string;
}
