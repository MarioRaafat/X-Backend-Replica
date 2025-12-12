import { Test, TestingModule } from '@nestjs/testing';
import { TrendController } from './trend.controller';
import { TrendService } from './trend.service';
import { FakeTrendService } from './fake-trend.service';
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

    const mock_fake_trend_service = {
        fakeTrends: jest.fn(),
        deleteFakeTrends: jest.fn(),
        insertTrendBotIfNotExists: jest.fn(),
        createFakeTrendTweets: jest.fn(),
        selectRandomHashtags: jest.fn(),
        getRandomHashtagSelection: jest.fn(),
        getHashtagsByCategory: jest.fn(),
        getRandomItems: jest.fn(),
        buildTweetContent: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TrendController],
            providers: [
                {
                    provide: TrendService,
                    useValue: mock_trend_service,
                },
                {
                    provide: FakeTrendService,
                    useValue: mock_fake_trend_service,
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
                        text: '#javascript',
                        posts_count: 1500,
                        trend_rank: 1,
                        category: 'News',
                        reference_id: 'javascript',
                    },
                    {
                        text: '#typescript',
                        posts_count: 1200,
                        trend_rank: 2,
                        category: 'Entertainment',
                        reference_id: 'typescript',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            expect(service.getTrending).toHaveBeenCalledWith(undefined, undefined);
            expect(result).toEqual(mock_response);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].text).toBe('#javascript');
        });

        it('should return trending data for specific category', async () => {
            const trends_dto: TrendsDto = { category: 'Sports', limit: 20 };
            const mock_response = {
                data: [
                    {
                        text: '#football',
                        posts_count: 2000,
                        trend_rank: 1,
                        category: 'Sports',
                        reference_id: 'football',
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
            const trends_dto: TrendsDto = { category: 'Entertainment', limit: 50 };
            const mock_response = { data: [] };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            await controller.getTrending(trends_dto);

            expect(service.getTrending).toHaveBeenCalledWith('Entertainment', 50);
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
                        text: '#nodejs',
                        posts_count: 1000,
                        trend_rank: 1,
                        category: 'News',
                        reference_id: 'nodejs',
                    },
                    {
                        text: '#react',
                        posts_count: 950,
                        trend_rank: 2,
                        category: 'Only on Yapper',
                        reference_id: 'react',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            result.data.forEach((trend) => {
                expect(trend).toHaveProperty('text');
                expect(trend).toHaveProperty('posts_count');
                expect(trend).toHaveProperty('trend_rank');
                expect(trend).toHaveProperty('category');
                expect(trend).toHaveProperty('reference_id');
            });
        });

        it('should preserve order and ranking from service', async () => {
            const mock_response = {
                data: [
                    {
                        text: '#first',
                        posts_count: 1000,
                        trend_rank: 1,
                        category: 'News',
                        reference_id: 'first',
                    },
                    {
                        text: '#second',
                        posts_count: 900,
                        trend_rank: 2,
                        category: 'News',
                        reference_id: 'second',
                    },
                    {
                        text: '#third',
                        posts_count: 800,
                        trend_rank: 3,
                        category: 'News',
                        reference_id: 'third',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            expect(result.data[0].trend_rank).toBe(1);
            expect(result.data[1].trend_rank).toBe(2);
            expect(result.data[2].trend_rank).toBe(3);
        });

        it('should handle service errors', async () => {
            const error = new Error('Service error');

            mock_trend_service.getTrending.mockRejectedValue(error);

            await expect(controller.getTrending()).rejects.toThrow('Service error');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large limit parameter', async () => {
            const large_limit = 1000;
            const mock_response = {
                data: [],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending({ limit: large_limit } as TrendsDto);

            expect(result).toEqual(mock_response);
            expect(mock_trend_service.getTrending).toHaveBeenCalledWith(undefined, large_limit);
        });

        it('should handle zero limit parameter', async () => {
            const mock_response = {
                data: [],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending({ limit: 0 } as TrendsDto);

            expect(result).toEqual(mock_response);
        });

        it('should handle negative limit as absolute value', async () => {
            const mock_response = {
                data: [],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending({ limit: -10 } as TrendsDto);

            expect(result).toEqual(mock_response);
        });

        it('should handle null/undefined category gracefully', async () => {
            const mock_response = {
                data: [
                    {
                        text: '#javascript',
                        posts_count: 1500,
                        trend_rank: 1,
                        category: 'News',
                        reference_id: 'javascript',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending({ category: null, limit: 10 } as any);

            expect(result).toEqual(mock_response);
            expect(mock_trend_service.getTrending).toHaveBeenCalledWith(null, 10);
        });

        it('should handle special characters in category parameter', async () => {
            const mock_response = {
                data: [],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const special_category = '#$%@!';
            const result = await controller.getTrending({
                category: special_category,
                limit: 10,
            } as TrendsDto);

            expect(result).toEqual(mock_response);
            expect(mock_trend_service.getTrending).toHaveBeenCalledWith(special_category, 10);
        });
    });

    describe('Response Validation', () => {
        it('should return response with all required fields', async () => {
            const mock_response = {
                data: [
                    {
                        text: '#javascript',
                        posts_count: 1500,
                        trend_rank: 1,
                        category: 'News',
                        reference_id: 'javascript',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending();

            expect(result).toHaveProperty('data');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data[0]).toHaveProperty('text');
            expect(result.data[0]).toHaveProperty('posts_count');
            expect(result.data[0]).toHaveProperty('trend_rank');
            expect(result.data[0]).toHaveProperty('category');
            expect(result.data[0]).toHaveProperty('reference_id');
        });

        it('should maintain consistent data structure across multiple calls', async () => {
            const mock_response = {
                data: [
                    {
                        text: '#test1',
                        posts_count: 100,
                        trend_rank: 1,
                        category: 'Sports',
                        reference_id: 'test1',
                    },
                    {
                        text: '#test2',
                        posts_count: 90,
                        trend_rank: 2,
                        category: 'News',
                        reference_id: 'test2',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result1 = await controller.getTrending();
            const result2 = await controller.getTrending({
                category: 'News',
                limit: 5,
            } as TrendsDto);

            expect(result1.data).toHaveLength(2);
            expect(result2.data).toHaveLength(2);
            expect(result1.data[0]).toHaveProperty('text');
            expect(result2.data[0]).toHaveProperty('text');
        });

        it('should return empty data array when no trends match filter', async () => {
            const mock_response = {
                data: [],
            };

            mock_trend_service.getTrending.mockResolvedValue(mock_response);

            const result = await controller.getTrending({
                category: 'Sports',
                limit: 10,
            } as TrendsDto);

            expect(result.data).toEqual([]);
            expect(result.data.length).toBe(0);
        });
    });

    describe('Service Integration', () => {
        it('should pass category parameter correctly to service', async () => {
            const test_category = 'Entertainment';
            mock_trend_service.getTrending.mockResolvedValue({
                data: [],
            });

            await controller.getTrending({ category: test_category, limit: 10 } as TrendsDto);

            expect(mock_trend_service.getTrending).toHaveBeenCalledWith(test_category, 10);
        });

        it('should pass limit parameter correctly to service', async () => {
            const test_limit = 25;
            mock_trend_service.getTrending.mockResolvedValue({
                data: [],
            });

            await controller.getTrending({ category: 'News', limit: test_limit } as TrendsDto);

            expect(mock_trend_service.getTrending).toHaveBeenCalledWith('News', test_limit);
        });

        it('should handle service returning empty data', async () => {
            const empty_response = {
                data: [],
            };

            mock_trend_service.getTrending.mockResolvedValue(empty_response);

            const result = await controller.getTrending();

            expect(result.data).toEqual([]);
            expect(result.data.length).toBe(0);
        });

        it('should not modify service response', async () => {
            const original_response = {
                data: [
                    {
                        text: '#original',
                        posts_count: 500,
                        trend_rank: 1,
                        category: 'News',
                        reference_id: 'original',
                    },
                ],
            };

            mock_trend_service.getTrending.mockResolvedValue(original_response);

            const result = await controller.getTrending();

            // Verify response is returned as-is without modification
            expect(result).toEqual(original_response);
            expect(result.data[0].text).toBe('#original');
            expect(result.data[0].reference_id).toBe('original');
        });
    });
});
