import { PaginationService } from './pagination.service';
import { PaginationQueryDto } from './dto/pagination.dto';
import { BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

describe('PaginationService', () => {
    let pagination_service: PaginationService;

    beforeEach(() => {
        pagination_service = new PaginationService();
    });

    describe('validatePaginationParams', () => {
        it('should not throw for valid parameters', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10, 'name', 'ASC', [
                    'name',
                    'createdAt',
                ]);
            }).not.toThrow();
        });

        it('should throw error for page less than 1', () => {
            expect(() => {
                pagination_service.validatePaginationParams(0, 10);
            }).toThrow(BadRequestException);
        });

        it('should throw error for non-integer page', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1.5, 10);
            }).toThrow(BadRequestException);
        });

        it('should throw error for limit less than 1', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 0);
            }).toThrow(BadRequestException);
        });

        it('should throw error for non-integer limit', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10.5);
            }).toThrow(BadRequestException);
        });

        it('should throw error for invalid sort_by field', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10, 'invalid_field', 'ASC', [
                    'name',
                ]);
            }).toThrow(BadRequestException);
        });

        it('should throw error for invalid sort_order', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10, 'name', 'INVALID', ['name']);
            }).toThrow(BadRequestException);
        });

        it('should accept ASC sort_order', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10, 'name', 'ASC', ['name']);
            }).not.toThrow();
        });

        it('should accept DESC sort_order', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10, 'name', 'DESC', ['name']);
            }).not.toThrow();
        });

        it('should accept lowercase sort_order', () => {
            expect(() => {
                pagination_service.validatePaginationParams(1, 10, 'name', 'asc', ['name']);
            }).not.toThrow();
        });
    });

    describe('paginate', () => {
        let mock_query_builder: any;

        beforeEach(() => {
            mock_query_builder = {
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn(),
            };
        });

        it('should paginate with default parameters', async () => {
            const mock_items = [{ id: 1 }, { id: 2 }];
            mock_query_builder.getManyAndCount.mockResolvedValue([mock_items, 2]);

            const dto: PaginationQueryDto = {};
            const result = await pagination_service.paginate(
                mock_query_builder as SelectQueryBuilder<any>,
                dto,
                'entity'
            );

            expect(mock_query_builder.orderBy).toHaveBeenCalledWith('entity.createdAt', 'DESC');
            expect(mock_query_builder.skip).toHaveBeenCalledWith(0);
            expect(mock_query_builder.take).toHaveBeenCalledWith(10);
            expect(result.data).toEqual(mock_items);
            expect(result.pagination.total_items).toBe(2);
            expect(result.pagination.current_page).toBe(1);
        });

        it('should paginate with custom parameters', async () => {
            const mock_items = [{ id: 3 }, { id: 4 }];
            mock_query_builder.getManyAndCount.mockResolvedValue([mock_items, 100]);

            const dto = { page: 3, limit: 20, sort_by: 'name', sort_order: 'ASC' } as any;
            const result = await pagination_service.paginate(
                mock_query_builder as SelectQueryBuilder<any>,
                dto,
                'entity',
                ['name', 'createdAt']
            );

            expect(mock_query_builder.orderBy).toHaveBeenCalledWith('entity.name', 'ASC');
            expect(mock_query_builder.skip).toHaveBeenCalledWith(40);
            expect(mock_query_builder.take).toHaveBeenCalledWith(20);
            expect(result.pagination.has_next_page).toBe(true);
            expect(result.pagination.has_previous_page).toBe(true);
        });

        it('should calculate has_next_page and has_previous_page correctly', async () => {
            mock_query_builder.getManyAndCount.mockResolvedValue([[{ id: 1 }], 30]);

            const dto = { page: 2, limit: 10 } as any;
            const result = await pagination_service.paginate(
                mock_query_builder as SelectQueryBuilder<any>,
                dto,
                'entity'
            );

            expect(result.pagination.has_next_page).toBe(true);
            expect(result.pagination.has_previous_page).toBe(true);
            expect(result.pagination.total_pages).toBe(3);
        });
    });

    describe('applyCursorPagination', () => {
        let mock_query_builder: any;

        beforeEach(() => {
            mock_query_builder = {
                andWhere: jest.fn().mockReturnThis(),
            };
        });

        it('should not modify query_builder when cursor is undefined', () => {
            const result = pagination_service.applyCursorPagination(
                mock_query_builder as SelectQueryBuilder<any>,
                undefined,
                'tweet'
            );

            expect(mock_query_builder.andWhere).not.toHaveBeenCalled();
            expect(result).toBe(mock_query_builder);
        });

        it('should apply cursor pagination with valid cursor', () => {
            const cursor = '2024-01-15T10:30:00.000Z_123';
            pagination_service.applyCursorPagination(
                mock_query_builder as SelectQueryBuilder<any>,
                cursor,
                'tweet',
                'created_at',
                'tweet_id'
            );

            expect(mock_query_builder.andWhere).toHaveBeenCalledWith(
                "(date_trunc('milliseconds', tweet.created_at) < :cursor_date OR (date_trunc('milliseconds', tweet.created_at) = :cursor_date AND tweet.tweet_id < :cursor_id))",
                expect.objectContaining({
                    cursor_date: new Date('2024-01-15T10:30:00.000Z'),
                    cursor_id: '123',
                })
            );
        });

        it('should handle cursor with default field names', () => {
            const cursor = '2024-01-15T10:30:00.000Z_456';
            pagination_service.applyCursorPagination(
                mock_query_builder as SelectQueryBuilder<any>,
                cursor,
                'user'
            );

            expect(mock_query_builder.andWhere).toHaveBeenCalledWith(
                expect.stringContaining('user.created_at'),
                expect.any(Object)
            );
        });
    });

    describe('generateNextCursor', () => {
        it('should return null for empty array', () => {
            const result = pagination_service.generateNextCursor([]);
            expect(result).toBeNull();
        });

        it('should generate cursor from last item with Date object', () => {
            const items = [
                { id: 1, created_at: new Date('2024-01-15T10:00:00.000Z') },
                { id: 2, created_at: new Date('2024-01-15T11:00:00.000Z') },
            ];

            const result = pagination_service.generateNextCursor(items, 'created_at', 'id');
            expect(result).toBe('2024-01-15T11:00:00.000Z_2');
        });

        it('should generate cursor from last item with string date', () => {
            const items = [
                { id: 1, created_at: '2024-01-15T10:00:00.000Z' },
                { id: 2, created_at: '2024-01-15T11:00:00.000Z' },
            ];

            const result = pagination_service.generateNextCursor(items, 'created_at', 'id');
            expect(result).toBe('2024-01-15T11:00:00.000Z_2');
        });

        it('should return null if timestamp field is missing', () => {
            const items = [{ id: 1 }];
            const result = pagination_service.generateNextCursor(items, 'created_at', 'id');
            expect(result).toBeNull();
        });

        it('should return null if id field is missing', () => {
            const items = [{ created_at: new Date() }];
            const result = pagination_service.generateNextCursor(items, 'created_at', 'id');
            expect(result).toBeNull();
        });

        it('should use custom field names', () => {
            const items = [{ tweet_id: 100, posted_at: new Date('2024-01-15T12:00:00.000Z') }];

            const result = pagination_service.generateNextCursor(items, 'posted_at', 'tweet_id');
            expect(result).toBe('2024-01-15T12:00:00.000Z_100');
        });
    });
});
