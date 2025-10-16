import { IsArray, ArrayNotEmpty, ArrayUnique, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersByUsernameDto {
  @ApiProperty({
    description: 'List of usernames to fetch (comma-separated)',
    example: 'alyaa242,amira#9,hagar#3,Esraa#1',
    type: String,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  usernames: string[];
}
