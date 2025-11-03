import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

@ApiExtraModels()
export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @ApiProperty({ description: 'Page number (starts from 1)', default: 1, required: false })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @ApiProperty({
        description: 'Number of items per page (max 100)',
        default: 10,
        required: false,
    })
    limit?: number = 10;

    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    @ApiProperty({ description: 'Search term', default: '', required: false })
    search?: string;

    @IsOptional()
    @IsIn(['name', 'createdAt', 'updatedAt'])
    @ApiProperty({ description: 'Field to sort by', default: 'createdAt', required: false })
    sort_by?: string = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    @ApiProperty({ description: 'Sort order', default: 'DESC', required: false })
    sort_order?: 'ASC' | 'DESC' = 'DESC';
}
