import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FacebookLoginDTO {
  @IsString()
  facebookId: string;
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
