import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
    @ApiProperty({
        description: 'Refresh token (optional - can be provided in body or cookie)',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        required: false,
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    refresh_token?: string;
}
