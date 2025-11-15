import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaginationMetaDto {
    @ApiProperty({ description: 'Current page number', example: 1 })
    current_page: number;

    @ApiProperty({ description: 'Total number of pages', example: 5 })
    total_pages: number;

    @ApiProperty({ description: 'Total number of items', example: 50 })
    total_items: number;

    @ApiProperty({ description: 'Number of items per page', example: 10 })
    items_per_page: number;

    @ApiProperty({ description: 'Whether there is a next page', example: true })
    has_next_page: boolean;

    @ApiProperty({
        description: 'Whether there is a previous page',
        example: false,
    })
    has_previous_page: boolean;
}

@ApiExtraModels()
export class PaginationResponseDto<T> {
    @ApiProperty({ description: 'Array of data items', isArray: true })
    @Type(() => Object, {
        discriminator: {
            property: '__type',
            subTypes: [{ value: Object, name: 'object' }],
        },
    })
    data: T[];

    @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
    @Type(() => PaginationMetaDto)
    pagination: PaginationMetaDto;
}
