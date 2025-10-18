import { IsArray, ArrayNotEmpty, ArrayUnique, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersByUsernameDto {
  @ApiProperty({
    description: 'List of usernames to fetch',
    example: ['alyaa242', 'amira#9', 'hagar#3', 'Esraa#1'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  usernames: string[];
}
