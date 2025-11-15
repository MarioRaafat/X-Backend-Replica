import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { SearchQueryDto } from './search-query.dto';

export class PostsSearchDto extends SearchQueryDto {
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
