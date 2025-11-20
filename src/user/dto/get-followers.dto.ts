import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CursorPaginationDto } from './cursor-pagination-params.dto';

export class GetFollowersDto extends CursorPaginationDto {
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
