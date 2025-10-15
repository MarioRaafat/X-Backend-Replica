import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class SignupStep2Dto {
  @ApiProperty({
    description: 'Email address that the OTP was sent to',
    example: 'bahgot@gmail.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'OTP token received in email',
    example: '123456',
    type: String,
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @Length(6, 6, { message: 'Token must be exactly 6 characters' })
  token: string;
}
