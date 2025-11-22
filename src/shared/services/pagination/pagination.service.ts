import { BadRequestException, Injectable } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto } from './dto/pagination.dto';
import { PaginationResponseDto } from './dto/paginationRespone.dto';

@Injectable()
export class PaginationService {
    /**
     * Validates pagination parameters
     * @param page - Page number (starts from 1)
     * @param limit - Number of items per page
     * @param sort_by - Field to sort by
     * @param sort_order - Sort order (ASC or DESC)
     * @param valid_sort_fields - Array of valid fields which can be used for sorting
     */
    public validatePaginationParams(
        page?: number,
        limit?: number,
        sort_by?: string,
        sort_order?: string,
        valid_sort_fields: string[] = ['name', 'createdAt', 'updatedAt']
    ): void {
        if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
            throw new BadRequestException('Page number must be a positive integer');
        }

        if (limit !== undefined && (limit < 1 || !Number.isInteger(limit))) {
            throw new BadRequestException(`Limit must be greater than 1 `);
        }

        if (sort_by && !valid_sort_fields.includes(sort_by)) {
            throw new BadRequestException(
                `Invalid sortBy field. Allowed values: ${valid_sort_fields.join(', ')}`
            );
        }

        if (sort_order && !['ASC', 'DESC'].includes(sort_order.toUpperCase())) {
            throw new BadRequestException('Invalid sortOrder value. Allowed values: ASC, DESC');
        }
    }

    /**
     * Applies pagination to a TypeORM query builder
     * @param query_builder - TypeORM query builder
     * @param dto - Pagination query DTO
     * @param alias - Entity alias in the query
     * @param validSortFields - Valid fields for sorting
     * @returns Promise with paginated results and metadata
     */
    public async paginate<T extends ObjectLiteral>(
        query_builder: SelectQueryBuilder<T>,
        dto: PaginationQueryDto,
        alias: string,
        valid_sort_fields: string[] = ['name', 'createdAt', 'updatedAt']
    ): Promise<PaginationResponseDto<T>> {
        const { page = 1, limit = 10, sort_by = 'createdAt', sort_order = 'DESC' } = dto as any;

        // Validate pagination parameters
        this.validatePaginationParams(page, limit, sort_by, sort_order, valid_sort_fields);

        // Calculate skip value (how many records to skip)
        const skip = (page - 1) * limit;

        // Apply sorting

        const valid_sort_field = valid_sort_fields.includes(sort_by) ? sort_by : 'createdAt';
        const valid_sort_order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query_builder.orderBy(`${alias}.${valid_sort_field}`, valid_sort_order);

        // Apply pagination
        query_builder.skip(skip).take(limit);

        // Execute query and get results
        const [items, total_items] = await query_builder.getManyAndCount();
        const total_pages = Math.ceil(total_items / limit);

        // Return paginated response
        return {
            data: items,
            pagination: {
                total_items,
                total_pages,
                current_page: page,
                items_per_page: limit,
                has_next_page: page < total_pages,
                has_previous_page: page > 1,
            },
        };
    }

    /**
     * Applies cursor-based pagination to a query builder
     * @param query_builder - TypeORM query builder
     * @param cursor - Cursor string in format "timestamp_id"
     * @param alias - Entity alias used in the query
     * @param timestamp_field - Field name for timestamp (e.g., 'created_at')
     * @param id_field - Field name for ID (e.g., 'tweet_id', 'id')
     */
    public applyCursorPagination<T extends ObjectLiteral>(
        query_builder: SelectQueryBuilder<T>,
        cursor: string | undefined,
        alias: string,
        timestamp_field: string = 'created_at',
        id_field: string = 'id'
    ): SelectQueryBuilder<T> {
        if (cursor) {
            const [cursor_timestamp, cursor_id] = cursor.split('_');
            if (cursor_timestamp && cursor_id) {
                const cursor_date = new Date(cursor_timestamp);
                query_builder.andWhere(
                    `(date_trunc('milliseconds', ${alias}.${timestamp_field}) < :cursor_date OR (date_trunc('milliseconds', ${alias}.${timestamp_field}) = :cursor_date AND ${alias}.${id_field} < :cursor_id))`,
                    {
                        cursor_date,
                        cursor_id,
                    }
                );
            }
        }
        return query_builder;
    }

    /**
     * Generates cursor for next page
     * @param items - Array of items from the current page
     * @param timestamp_field - Field name for timestamp
     * @param id_field - Field name for ID
     * @returns Cursor string or null if no items
     */
    public generateNextCursor<T>(
        items: T[],
        timestamp_field: string = 'created_at',
        id_field: string = 'id'
    ): string | null {
        if (items.length === 0) return null;

        const last_item = items[items.length - 1];
        const timestamp = last_item[timestamp_field];
        const id = last_item[id_field];

        if (!timestamp || !id) return null;

        const timestamp_iso =
            timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();

        return `${timestamp_iso}_${id}`;
    }
}
