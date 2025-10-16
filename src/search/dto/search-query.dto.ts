import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, Min, IsInt, IsString } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Query to search for',
    example: 'cats',
    type: String,
  })
  @IsNotEmpty({ message: 'Query is required' })
  query: string;

  @ApiPropertyOptional({
    description: 'Filter results by username (optional)',
    example: 'Alyaali242',
    type: String,
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (starting from 1)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page_offset?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page_size?: number = 10;
}
