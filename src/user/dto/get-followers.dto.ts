import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationParamsDto } from './pagination-params.dto';
import { Transform } from 'class-transformer';

export class GetFollowersDto extends PaginationParamsDto {
    @ApiPropertyOptional({
        description: 'Following Filter',
        example: false,
        type: Boolean,
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    following?: boolean;
}
