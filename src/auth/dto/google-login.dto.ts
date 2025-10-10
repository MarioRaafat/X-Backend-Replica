import { PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDTO {
  @IsString()
  google_id: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}
