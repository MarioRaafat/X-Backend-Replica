import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
    category: string;
}
