import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsString,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email',
    example: 'bahgot@gmail.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'User password - must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    example: 'Mario0o0o!#$@2252004',
    minLength: 8,
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
    example: 'Mario0o0o!#$@2252004',
  })
  @IsNotEmpty()
  confirm_password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Amira',
  })
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Alyaa',
  })
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiProperty({
    description: 'User username',
    example: 'amira_alyaa_123',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber()
  @IsOptional()
  phone_number: string;

  @ApiProperty({
    description: 'User birth date',
    example: '1990-01-01',
  })
  @IsNotEmpty()
  @IsString()
  birth_date: string;

  @ApiProperty({
    description: 'reCAPTCHA response token from frontend widget',
    example: '03AGdBq25SxXT-pmSeBXjzScW-EiocHwwpwqJRCAC...',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  captcha_token: string;
}
