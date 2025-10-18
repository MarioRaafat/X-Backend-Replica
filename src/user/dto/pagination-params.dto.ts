import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Min, IsInt, Max } from 'class-validator';

export class PaginationParamsDto {
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
  @Max(100)
  page_size?: number = 10;
}
