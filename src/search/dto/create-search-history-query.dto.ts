import { ApiProperty } from '@nestjs/swagger';

export class CreateSearchHistoryQueryDto {
  @ApiProperty({ description: 'The search query string', example: 'shady shiko' })
  query: string;
}
