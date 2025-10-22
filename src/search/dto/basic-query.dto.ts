import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BasicQueryDto {
    @ApiProperty({
        description: 'Query to search for',
        example: 'cats',
        type: String,
    })
    @IsNotEmpty({ message: 'Query is required' })
    query: string;

    @ApiPropertyOptional({
        description: 'Filter results by username (optional)',
        example: 'Alyaali242',
        type: String,
    })
    @IsOptional()
    @IsString()
    username?: string;
}
