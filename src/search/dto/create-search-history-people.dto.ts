import { ApiProperty } from '@nestjs/swagger';

export class CreateSearchHistoryPeopleDto {
  @ApiProperty({ description: 'User id for people search', example: 12 })
  userId: number;
}
