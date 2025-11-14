import { PaginationMetaDto, PaginationResponseDto } from './paginationRespone.dto';

describe('PaginationMetaDto', () => {
    it('should be defined', () => {
        expect(PaginationMetaDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new PaginationMetaDto();
        expect(dto).toBeInstanceOf(PaginationMetaDto);
    });

    it('should have all pagination properties', () => {
        const dto = new PaginationMetaDto();
        dto.current_page = 1;
        dto.total_pages = 5;
        dto.total_items = 50;
        dto.items_per_page = 10;
        dto.has_next_page = true;
        dto.has_previous_page = false;

        expect(dto.current_page).toBe(1);
        expect(dto.total_pages).toBe(5);
        expect(dto.total_items).toBe(50);
        expect(dto.items_per_page).toBe(10);
        expect(dto.has_next_page).toBe(true);
        expect(dto.has_previous_page).toBe(false);
    });

    it('should handle last page', () => {
        const dto = new PaginationMetaDto();
        dto.current_page = 5;
        dto.total_pages = 5;
        dto.total_items = 50;
        dto.items_per_page = 10;
        dto.has_next_page = false;
        dto.has_previous_page = true;

        expect(dto.has_next_page).toBe(false);
        expect(dto.has_previous_page).toBe(true);
    });

    it('should handle first page', () => {
        const dto = new PaginationMetaDto();
        dto.current_page = 1;
        dto.total_pages = 10;
        dto.has_next_page = true;
        dto.has_previous_page = false;

        expect(dto.has_next_page).toBe(true);
        expect(dto.has_previous_page).toBe(false);
    });
});

describe('PaginationResponseDto', () => {
    it('should be defined', () => {
        expect(PaginationResponseDto).toBeDefined();
    });

    it('should create an instance', () => {
        const dto = new PaginationResponseDto<any>();
        expect(dto).toBeInstanceOf(PaginationResponseDto);
    });

    it('should have data and pagination properties', () => {
        const dto = new PaginationResponseDto<string>();
        dto.data = ['item1', 'item2', 'item3'];
        dto.pagination = new PaginationMetaDto();

        expect(dto.data).toBeDefined();
        expect(Array.isArray(dto.data)).toBe(true);
        expect(dto.pagination).toBeInstanceOf(PaginationMetaDto);
    });

    it('should handle generic type data', () => {
        interface ITestItem {
            id: number;
            name: string;
        }

        const dto = new PaginationResponseDto<ITestItem>();
        dto.data = [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
        ];
        dto.pagination = {
            current_page: 1,
            total_pages: 1,
            total_items: 2,
            items_per_page: 10,
            has_next_page: false,
            has_previous_page: false,
        };

        expect(dto.data).toHaveLength(2);
        expect(dto.data[0].id).toBe(1);
        expect(dto.pagination.total_items).toBe(2);
    });

    it('should handle empty arrays', () => {
        interface ITestItem {
            id: number;
        }

        const empty_data: ITestItem[] = [];
        const empty_meta: PaginationMetaDto = {
            current_page: 1,
            total_pages: 0,
            total_items: 0,
            items_per_page: 10,
            has_next_page: false,
            has_previous_page: false,
        };

        const response = new PaginationResponseDto<ITestItem>();
        response.data = empty_data;
        response.pagination = empty_meta;

        expect(response.data).toEqual([]);
        expect(response.pagination.total_items).toBe(0);
    });

    it('should work with different data types', () => {
        const string_dto = new PaginationResponseDto<string>();
        string_dto.data = ['a', 'b', 'c'];

        const number_dto = new PaginationResponseDto<number>();
        number_dto.data = [1, 2, 3];

        expect(string_dto.data).toEqual(['a', 'b', 'c']);
        expect(number_dto.data).toEqual([1, 2, 3]);
    });
});
