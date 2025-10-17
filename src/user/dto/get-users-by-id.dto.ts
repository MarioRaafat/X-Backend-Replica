import { IsArray, ArrayNotEmpty, ArrayUnique, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersByIdDto {
  @ApiProperty({
    description: 'List of user IDs to fetch',
    example: [
      '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
      '0b064811-f706-4c8f-97d7-ba2e9fc22d6d#3',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  user_ids: string[];
}
