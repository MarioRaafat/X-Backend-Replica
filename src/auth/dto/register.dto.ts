import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsString,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email',
    example: 'bahgot@gmail.com',
    format: 'email'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password - must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    example: 'Mario0o0o!#$@2252004',
    minLength: 8
  })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
  })
  password: string;

  @ApiProperty({
    description: 'Confirm password - must match the password',
    example: 'Mario0o0o!#$@2252004'
  })
  @IsNotEmpty()
  confirmPassword: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Amira'
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Alyaa'
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890'
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'reCAPTCHA response token from frontend widget',
    example: '03AGdBq25SxXT-pmSeBXjzScW-EiocHwwpwqJRCAC...',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  captchaToken: string;
}
