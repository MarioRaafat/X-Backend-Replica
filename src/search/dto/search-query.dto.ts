import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BasicQueryDto } from './basic-query.dto';

export enum PeopleFilter {
    ANYONE = 'anyone',
    FOLLOWING = 'following',
}

export enum LocationFilter {
    ANYWHERE = 'anywhere',
    NEAR_YOU = 'near_you',
}

export class SearchQueryDto extends BasicQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by people (anyone or only people you follow)',
        enum: PeopleFilter,
        example: PeopleFilter.ANYONE,
    })
    @IsOptional()
    @IsEnum(PeopleFilter)
    people?: PeopleFilter;

    @ApiPropertyOptional({
        description: 'Filter by location (anywhere or near your current location)',
        enum: LocationFilter,
        example: LocationFilter.ANYWHERE,
    })
    @IsOptional()
    @IsEnum(LocationFilter)
    location?: LocationFilter;

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
