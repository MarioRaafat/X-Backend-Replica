import { IsArray, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersByIdDto {
  @ApiProperty({
    description: 'List of user IDs to fetch (comma-separated)',
    example: '1,2,3',
    type: String,
  })
  @Transform(({ value }) => value.split(',').map((v) => Number(v.trim())))
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  ids: number[];
}
