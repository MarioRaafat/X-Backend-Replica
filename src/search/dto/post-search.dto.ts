import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { SearchQueryDto } from './search-query.dto';
import { Transform } from 'class-transformer';

export class PostsSearchDto extends SearchQueryDto {
    @ApiPropertyOptional({
        description: 'Flag to filter posts that have media (images/videos)',
        example: true,
        type: Boolean,
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    has_media?: boolean;
}
