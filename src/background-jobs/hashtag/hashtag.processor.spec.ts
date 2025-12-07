import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bull';
import { HashtagProcessor } from './hashtag.processor';
import { TrendService } from '../../trend/trend.service';
import type { HashtagJobDto } from './hashtag-job.dto';

describe('HashtagProcessor', () => {
    let processor: HashtagProcessor;
    let mock_trend_service: jest.Mocked<TrendService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HashtagProcessor,
                {
                    provide: TrendService,
                    useValue: {
                        insertCandidateHashtags: jest.fn(),
                        insertCandidateCategories: jest.fn(),
                        updateHashtagCounts: jest.fn(),
                    },
                },
            ],
        }).compile();

        processor = module.get<HashtagProcessor>(HashtagProcessor);
        mock_trend_service = module.get(TrendService);
    });

    describe('handleUpdateHashtags', () => {
        it('should process hashtag update job successfully', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#trending': { Sports: 100, News: 80 },
                    '#popular': { Entertainment: 90 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-123',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            mock_trend_service.insertCandidateHashtags.mockResolvedValue(undefined);
            mock_trend_service.insertCandidateCategories.mockResolvedValue(undefined);
            mock_trend_service.updateHashtagCounts.mockResolvedValue(undefined);

            await processor.handleUpdateHashtags(mock_job);

            expect(mock_trend_service.insertCandidateHashtags).toHaveBeenCalledWith(mock_job_data);
            expect(mock_trend_service.insertCandidateCategories).toHaveBeenCalledWith(
                mock_job_data
            );
            expect(mock_trend_service.updateHashtagCounts).toHaveBeenCalledWith(mock_job_data);
        });

        it('should handle empty hashtags object', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {},
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-456',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            mock_trend_service.insertCandidateHashtags.mockResolvedValue(undefined);
            mock_trend_service.insertCandidateCategories.mockResolvedValue(undefined);
            mock_trend_service.updateHashtagCounts.mockResolvedValue(undefined);

            await processor.handleUpdateHashtags(mock_job);

            expect(mock_trend_service.insertCandidateHashtags).toHaveBeenCalledWith(mock_job_data);
            expect(mock_trend_service.insertCandidateCategories).toHaveBeenCalledWith(
                mock_job_data
            );
            expect(mock_trend_service.updateHashtagCounts).toHaveBeenCalledWith(mock_job_data);
        });

        it('should handle multiple hashtags with multiple categories', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#viral': { Sports: 150, News: 120, Entertainment: 100 },
                    '#hot': { News: 200 },
                    '#trending': { Entertainment: 180, Sports: 160 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-789',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            mock_trend_service.insertCandidateHashtags.mockResolvedValue(undefined);
            mock_trend_service.insertCandidateCategories.mockResolvedValue(undefined);
            mock_trend_service.updateHashtagCounts.mockResolvedValue(undefined);

            await processor.handleUpdateHashtags(mock_job);

            expect(mock_trend_service.insertCandidateHashtags).toHaveBeenCalledWith(mock_job_data);
            expect(mock_trend_service.insertCandidateCategories).toHaveBeenCalledWith(
                mock_job_data
            );
            expect(mock_trend_service.updateHashtagCounts).toHaveBeenCalledWith(mock_job_data);
        });

        it('should throw error when insertCandidateHashtags fails', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 50 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-fail-1',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            const error = new Error('Insert hashtags failed');
            mock_trend_service.insertCandidateHashtags.mockRejectedValue(error);

            await expect(processor.handleUpdateHashtags(mock_job)).rejects.toThrow(
                'Insert hashtags failed'
            );
        });

        it('should throw error when insertCandidateCategories fails', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 50 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-fail-2',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            const error = new Error('Insert categories failed');
            mock_trend_service.insertCandidateHashtags.mockResolvedValue(undefined);
            mock_trend_service.insertCandidateCategories.mockRejectedValue(error);

            await expect(processor.handleUpdateHashtags(mock_job)).rejects.toThrow(
                'Insert categories failed'
            );
        });

        it('should throw error when updateHashtagCounts fails', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 50 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-fail-3',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            const error = new Error('Update counts failed');
            mock_trend_service.insertCandidateHashtags.mockResolvedValue(undefined);
            mock_trend_service.insertCandidateCategories.mockResolvedValue(undefined);
            mock_trend_service.updateHashtagCounts.mockRejectedValue(error);

            await expect(processor.handleUpdateHashtags(mock_job)).rejects.toThrow(
                'Update counts failed'
            );
        });

        it('should handle hashtags with single category', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#news': { News: 250 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-single',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            mock_trend_service.insertCandidateHashtags.mockResolvedValue(undefined);
            mock_trend_service.insertCandidateCategories.mockResolvedValue(undefined);
            mock_trend_service.updateHashtagCounts.mockResolvedValue(undefined);

            await processor.handleUpdateHashtags(mock_job);

            expect(mock_trend_service.insertCandidateHashtags).toHaveBeenCalledWith(mock_job_data);
            expect(mock_trend_service.insertCandidateCategories).toHaveBeenCalledWith(
                mock_job_data
            );
            expect(mock_trend_service.updateHashtagCounts).toHaveBeenCalledWith(mock_job_data);
        });

        it('should maintain order of service calls', async () => {
            const mock_job_data: HashtagJobDto = {
                hashtags: {
                    '#test': { Sports: 100 },
                },
                timestamp: Date.now(),
            };

            const mock_job = {
                id: 'job-order',
                data: mock_job_data,
            } as Job<HashtagJobDto>;

            const call_order: string[] = [];

            mock_trend_service.insertCandidateHashtags.mockImplementation(() => {
                call_order.push('insertCandidateHashtags');
                return Promise.resolve();
            });

            mock_trend_service.insertCandidateCategories.mockImplementation(() => {
                call_order.push('insertCandidateCategories');
                return Promise.resolve();
            });

            mock_trend_service.updateHashtagCounts.mockImplementation(() => {
                call_order.push('updateHashtagCounts');
                return Promise.resolve();
            });

            await processor.handleUpdateHashtags(mock_job);

            expect(call_order).toEqual([
                'insertCandidateHashtags',
                'insertCandidateCategories',
                'updateHashtagCounts',
            ]);
        });
    });
});
