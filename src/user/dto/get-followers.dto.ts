import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationParamsDto } from './pagination-params.dto';

export class GetFollowersDto extends PaginationParamsDto {
    @ApiPropertyOptional({
        description: 'Following Filter',
        example: false,
        type: Boolean,
    })
    @IsOptional()
    @IsBoolean()
    following?: boolean = false;
}
