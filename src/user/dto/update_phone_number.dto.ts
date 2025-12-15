import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';

export class UpdatePhoneNumberDto {
    @ApiProperty({
        description: 'Phone number (optional)',
        example: '+1234567890',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @IsPhoneNumber()
    phone_number?: string;
}
