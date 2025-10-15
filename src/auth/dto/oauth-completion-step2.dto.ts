import {
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthCompletionStep2Dto {
  @ApiProperty({
    description: 'OAuth session token',
    example: 'oauth_session_abc123',
  })
  @IsNotEmpty()
  @IsString()
  oauth_session_token: string;

  @ApiProperty({
    description: 'Selected username',
    example: 'mariooooo243098563',
  })
  @IsNotEmpty()
  @IsString()
  username: string;
}