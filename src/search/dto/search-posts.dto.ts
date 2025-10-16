import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class SearchPostsDto {
  @ApiProperty({
    description: 'Query to search for',
    example: 'cats',
    type: String,
  })
  @IsNotEmpty({ message: 'Query is required' })
  query: string;

  @ApiPropertyOptional({
    description: 'Flag to filter posts that have media (images/videos)',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  has_media?: boolean;

  @ApiPropertyOptional({
    description: 'Flag to compact media posts',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  is_compact?: boolean;
}
