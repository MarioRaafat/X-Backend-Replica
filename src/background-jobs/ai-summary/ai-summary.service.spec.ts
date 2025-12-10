import { Test, TestingModule } from '@nestjs/testing';
import { AiSummaryJobService } from './ai-summary.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../constants/queue.constants';
import { GenerateTweetSummaryDto } from './ai-summary.dto';

describe('AiSummaryJobService', () => {
    let service: AiSummaryJobService;

    const mock_queue = {
        add: jest.fn(),
        getWaiting: jest.fn(),
        getActive: jest.fn(),
        getCompleted: jest.fn(),
        getFailed: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiSummaryJobService,
                {
                    provide: getQueueToken(QUEUE_NAMES.AI_SUMMARY),
                    useValue: mock_queue,
                },
            ],
        }).compile();

        service = module.get<AiSummaryJobService>(AiSummaryJobService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('queueGenerateSummary', () => {
        it('should queue a generate summary job with correct parameters', async () => {
            const dto: GenerateTweetSummaryDto = {
                tweet_id: 'tweet-123',
                content: 'This is a test tweet content that is long enough to generate a summary',
            };

            mock_queue.add.mockResolvedValueOnce({ id: '1', data: dto });

            const result = await service.queueGenerateSummary(dto);

            expect(mock_queue.add).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.job_id).toBe('1');
        });

        it('should handle queue errors gracefully', async () => {
            const dto = {
                tweet_id: 'tweet-456',
                content: 'Another test tweet content for summary generation',
            };

            mock_queue.add.mockRejectedValueOnce(new Error('Queue is full'));

            const result = await service.queueGenerateSummary(dto);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Queue is full');
        });
    });
});
