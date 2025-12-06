import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'Refresh token (optional - can be provided in body or cookie)',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        required: false,
    })
    @IsOptional()
    @IsString()
    refresh_token?: string;
}
