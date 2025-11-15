import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt, Max, Min } from 'class-validator';

export class AssignInterestsDto {
    @ApiPropertyOptional({
        description: 'Categories IDs',
        example: [1, 2, 3],
        type: [Number],
    })
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true, message: 'Category ID must be a positive integer' })
    @Max(30, { each: true, message: 'Category ID must not exceed 30' })
    category_ids: number[];
}
