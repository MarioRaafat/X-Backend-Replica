import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class TrendsDto {
    @ApiProperty({
        required: false,
        example: 'Sports',
        description: 'Category of trends to retrieve (e.g.,sports, entertainment)',
        enum: ['Sports', 'Entertainment', 'News'],
    })
    @IsString()
    @IsOptional()
    @MaxLength(STRING_MAX_LENGTH)
    category: string;

    @ApiProperty({
        default: 30,

        example: 30,
        required: false,

        description: 'Return Specific Number of hashtags',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    @Max(30)
    limit?: number = 30;
}
