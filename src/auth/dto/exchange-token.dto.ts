import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH } from 'src/constants/variables';

export class ExchangeTokenDto {
    @ApiProperty({
        description: 'One-time exchange token received from OAuth callback redirect',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(LARGE_MAX_LENGTH)
    exchange_token: string;
}
