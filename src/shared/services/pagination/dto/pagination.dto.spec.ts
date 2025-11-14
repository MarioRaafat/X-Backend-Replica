import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './pagination.dto';

describe('PaginationQueryDto', () => {
    it('should be defined', () => {
        expect(PaginationQueryDto).toBeDefined();
    });

    it('should create an instance with default values', () => {
        const dto = new PaginationQueryDto();
        expect(dto).toBeInstanceOf(PaginationQueryDto);
        expect(dto.page).toBe(1);
        expect(dto.limit).toBe(10);
        expect(dto.sort_by).toBe('createdAt');
        expect(dto.sort_order).toBe('DESC');
    });

    describe('validation', () => {
        it('should validate with default values', async () => {
            const dto = plainToInstance(PaginationQueryDto, {});
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should validate with custom page', async () => {
            const dto = plainToInstance(PaginationQueryDto, { page: 5 });
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.page).toBe(5);
        });

        it('should validate with custom limit', async () => {
            const dto = plainToInstance(PaginationQueryDto, { limit: 50 });
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.limit).toBe(50);
        });

        it('should fail validation with page less than 1', async () => {
            const dto = plainToInstance(PaginationQueryDto, { page: 0 });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const page_error = errors.find((e) => e.property === 'page');
            expect(page_error).toBeDefined();
        });

        it('should fail validation with limit less than 1', async () => {
            const dto = plainToInstance(PaginationQueryDto, { limit: 0 });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const limit_error = errors.find((e) => e.property === 'limit');
            expect(limit_error).toBeDefined();
        });

        it('should fail validation with limit greater than 100', async () => {
            const dto = plainToInstance(PaginationQueryDto, { limit: 101 });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const limit_error = errors.find((e) => e.property === 'limit');
            expect(limit_error).toBeDefined();
        });

        it('should accept valid search string', async () => {
            const dto = plainToInstance(PaginationQueryDto, { search: 'test query' });
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.search).toBe('test query');
        });

        it('should accept valid sort_by values', async () => {
            const valid_sort_by = ['name', 'createdAt', 'updatedAt'];

            for (const sort_by of valid_sort_by) {
                const dto = plainToInstance(PaginationQueryDto, { sort_by: sort_by });
                const errors = await validate(dto);
                expect(errors).toHaveLength(0);
                expect(dto.sort_by).toBe(sort_by);
            }
        });

        it('should fail validation with invalid sort_by', async () => {
            const dto = plainToInstance(PaginationQueryDto, { sort_by: 'invalidField' });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const sort_by_error = errors.find((e) => e.property === 'sort_by');
            expect(sort_by_error).toBeDefined();
        });

        it('should accept valid sort_order values', async () => {
            const asc_dto = plainToInstance(PaginationQueryDto, { sort_order: 'ASC' });
            const desc_dto = plainToInstance(PaginationQueryDto, { sort_order: 'DESC' });

            const asc_errors = await validate(asc_dto);
            const desc_errors = await validate(desc_dto);

            expect(asc_errors).toHaveLength(0);
            expect(desc_errors).toHaveLength(0);
            expect(asc_dto.sort_order).toBe('ASC');
            expect(desc_dto.sort_order).toBe('DESC');
        });

        it('should fail validation with invalid sort_order', async () => {
            const dto = plainToInstance(PaginationQueryDto, { sort_order: 'INVALID' });
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            const sort_order_error = errors.find((e) => e.property === 'sort_order');
            expect(sort_order_error).toBeDefined();
        });

        it('should handle all optional fields together', async () => {
            const dto = plainToInstance(PaginationQueryDto, {
                page: 2,
                limit: 25,
                search: 'test',
                sort_by: 'name',
                sort_order: 'ASC',
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(dto.page).toBe(2);
            expect(dto.limit).toBe(25);
            expect(dto.search).toBe('test');
            expect(dto.sort_by).toBe('name');
            expect(dto.sort_order).toBe('ASC');
        });
    });
});
