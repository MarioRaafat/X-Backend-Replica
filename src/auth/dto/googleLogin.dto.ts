import { PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDTO {
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;
}
