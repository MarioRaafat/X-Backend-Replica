import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class TrendsDto {
    @ApiProperty({
        required: true,
        example: 'technology',
        description:
            'Category of trends to retrieve (e.g., technology, sports, entertainment, politics, business, health, science, travel, food, fashion)',
        enum: [
            'technology',
            'sports',
            'entertainment',
            'politics',
            'business',
            'health',
            'science',
            'travel',
            'food',
            'fashion',
            'all',
        ],
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    category: string;
}
