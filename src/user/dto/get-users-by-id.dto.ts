import { IsArray, ArrayNotEmpty, ArrayUnique, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersByIdDto {
  @ApiProperty({
    description: 'List of user IDs to fetch (comma-separated)',
    example:
      '0c059899-f706-4c8f-97d7-ba2e9fc22d6d,0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
    type: String,
  })
  @Transform(({ value }) => value.split(',').map((v) => String(v.trim())))
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  ids: string[];
}
