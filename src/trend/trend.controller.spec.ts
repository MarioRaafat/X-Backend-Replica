import { Test, TestingModule } from '@nestjs/testing';
import { TrendController } from './trend.controller';
import { TrendService } from './trend.service';
import { TrendsDto } from './dto/trends.dto';

describe('TrendController', () => {
    let controller: TrendController;
    let service: TrendService;

    const mock_trend_service = {
        getTrending: jest.fn(),
        getHashtagCategories: jest.fn(),
        insertCandidateHashtags: jest.fn(),
        insertCandidateCategories: jest.fn(),
        updateHashtagCounts: jest.fn(),
        calculateTrend: jest.fn(),
        calculateHashtagScore: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TrendController],
            providers: [
                {
                    provide: TrendService,
                    useValue: mock_trend_service,
                },
            ],
        }).compile();

        controller = module.get<TrendController>(TrendController);
        service = module.get<TrendService>(TrendService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getTrending', () => {
        it('should return trending data without category or limit', async () => {
            const mock_response = {
                data: [
                    {
                        hashtag: '#javascript',
                        posts_count: 1500,
                        rank: 1,
                        category: 'News',
                    },
                    {
                        hashtag: '#typescript',
                        posts_count: 1200,
                        rank: 2,
                        category: 'Entertainment',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            expect(service.getTrending).toHaveBeenCalledWith(undefined, undefined);
            expect(result).toEqual(mock_response);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].hashtag).toBe('#javascript');
        });

        it('should return trending data for specific category', async () => {
            const trends_dto: TrendsDto = { category: 'Sports', limit: 20 };
            const mock_response = {
                data: [
                    {
                        hashtag: '#football',
                        posts_count: 2000,
                        rank: 1,
                        category: 'Sports',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending(trends_dto);

            expect(service.getTrending).toHaveBeenCalledWith('Sports', 20);
            expect(result.data[0].category).toBe('Sports');
        });

        it('should pass only category when limit not provided', async () => {
            const trends_dto: TrendsDto = { category: 'News' };
            const mock_response = { data: [] };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            await controller.getTrending(trends_dto);

            expect(service.getTrending).toHaveBeenCalledWith('News', undefined);
        });

        it('should handle custom limit', async () => {
            const trends_dto: TrendsDto = { limit: 50 };
            const mock_response = { data: [] };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            await controller.getTrending(trends_dto);

            expect(service.getTrending).toHaveBeenCalledWith(undefined, 50);
        });

        it('should return empty data when no trends found', async () => {
            const mock_response = { data: [] };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            expect(result.data).toEqual([]);
        });

        it('should pass both category and limit to service', async () => {
            const trends_dto: TrendsDto = {
                category: 'Entertainment',
                limit: 15,
            };
            const mock_response = { data: [] };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            await controller.getTrending(trends_dto);

            expect(service.getTrending).toHaveBeenCalledWith('Entertainment', 15);
        });

        it('should handle undefined trends_dto', async () => {
            const mock_response = { data: [] };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending(undefined);

            expect(service.getTrending).toHaveBeenCalledWith(undefined, undefined);
            expect(result.data).toEqual([]);
        });

        it('should return trends with all required fields', async () => {
            const mock_response = {
                data: [
                    {
                        hashtag: '#nodejs',
                        posts_count: 1000,
                        rank: 1,
                        category: 'News',
                    },
                    {
                        hashtag: '#react',
                        posts_count: 950,
                        rank: 2,
                        category: 'Only on Yapper',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            result.data.forEach((trend) => {
                expect(trend).toHaveProperty('hashtag');
                expect(trend).toHaveProperty('posts_count');
                expect(trend).toHaveProperty('rank');
                expect(trend).toHaveProperty('category');
            });
        });

        it('should preserve order and ranking from service', async () => {
            const mock_response = {
                data: [
                    { hashtag: '#first', posts_count: 1000, rank: 1, category: 'News' },
                    { hashtag: '#second', posts_count: 900, rank: 2, category: 'News' },
                    { hashtag: '#third', posts_count: 800, rank: 3, category: 'News' },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            expect(result.data[0].rank).toBe(1);
            expect(result.data[1].rank).toBe(2);
            expect(result.data[2].rank).toBe(3);
        });

        it('should handle service errors', async () => {
            const error = new Error('Service error');

            mock_trend_service.getTrending.mockRejectedValue(error);

            await expect(controller.getTrending()).rejects.toThrow('Service error');
        });
    });
});
