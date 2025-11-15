import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class BasicQueryDto {
    @ApiProperty({
        description: 'Query to search for',
        example: 'cats',
        type: String,
    })
    @IsNotEmpty({ message: 'Query is required' })
    @MaxLength(STRING_MAX_LENGTH)
    query: string;

    @ApiPropertyOptional({
        description: 'Filter results by username (optional)',
        example: 'Alyaali242',
        type: String,
    })
    @IsOptional()
    @IsString()
    @MaxLength(STRING_MAX_LENGTH)
    username?: string;
}
