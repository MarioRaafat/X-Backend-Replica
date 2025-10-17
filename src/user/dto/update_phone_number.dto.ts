import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsPhoneNumber } from 'class-validator';

export class UpdatePhoneNumberDto {
  @ApiProperty({
    description: 'Phone number (optional)',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  phone_number?: string;
}
