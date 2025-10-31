import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class AssignInterestsDto {
    @ApiPropertyOptional({
        description: 'Categories IDs',
        example: [1, 2, 3],
        type: [Number],
    })
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    category_ids: number[];
}
