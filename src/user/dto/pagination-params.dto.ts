import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationParamsDto {
    @ApiPropertyOptional({
        description: 'Page number for pagination (starting from 1)',
        example: 1,
        type: Number,
    })
    @Transform(({ value }) => (value ? parseInt(value, 10) : 0))
    @IsInt()
    @Min(0)
    page_offset: number = 0;

    @ApiPropertyOptional({
        description: 'Number of results per page',
        example: 10,
        type: Number,
    })
    @Transform(({ value }) => (value ? parseInt(value, 10) : 10))
    @IsInt()
    @Min(1)
    @Max(100)
    page_size: number = 10;
}
