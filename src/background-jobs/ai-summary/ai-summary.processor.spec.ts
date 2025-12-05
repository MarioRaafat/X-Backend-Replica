import { Test, TestingModule } from '@nestjs/testing';
import { AiSummaryProcessor } from './ai-summary.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TweetSummary } from 'src/tweets/entities/tweet-summary.entity';

describe('AiSummaryProcessor', () => {
    let processor: AiSummaryProcessor;

    const mockTweetSummaryRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiSummaryProcessor,
                {
                    provide: getRepositoryToken(TweetSummary),
                    useValue: mockTweetSummaryRepository,
                },
            ],
        }).compile();

        processor = module.get<AiSummaryProcessor>(AiSummaryProcessor);
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });
});
