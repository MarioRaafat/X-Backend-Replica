import { Test, TestingModule } from '@nestjs/testing';
import { AiSummaryProcessor } from './ai-summary.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TweetSummary } from 'src/tweets/entities/tweet-summary.entity';
import type { Job } from 'bull';

describe('AiSummaryProcessor', () => {
    let processor: AiSummaryProcessor;
    let tweet_summary_repository: any;
    let original_env: NodeJS.ProcessEnv;

    const mock_tweet_summary_repository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mock_job = {
        data: {
            tweet_id: 'tweet-123',
            content: 'This is a test tweet content',
        },
    } as Job<any>;

    beforeAll(() => {
        // Save original environment
        original_env = { ...process.env };
    });

    afterAll(() => {
        // Restore original environment
        process.env = original_env;
    });

    beforeEach(async () => {
        // Set test env vars
        process.env.GROQ_API_KEY = 'test-api-key';
        process.env.ENABLE_GROQ = 'true';
        process.env.MODEL_NAME = 'llama-3.3-70b-versatile';

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiSummaryProcessor,
                {
                    provide: getRepositoryToken(TweetSummary),
                    useValue: mock_tweet_summary_repository,
                },
            ],
        }).compile();

        processor = module.get<AiSummaryProcessor>(AiSummaryProcessor);
        tweet_summary_repository = module.get(getRepositoryToken(TweetSummary));

        // Reset all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleGenerateSummary', () => {
        it('should return existing summary if already exists', async () => {
            const existing_summary = {
                id: 1,
                tweet_id: 'tweet-123',
                summary: 'Existing summary',
            };

            mock_tweet_summary_repository.findOne.mockResolvedValue(existing_summary);

            const result = await processor.handleGenerateSummary(mock_job);

            expect(result).toEqual({
                success: true,
                summary: 'Existing summary',
            });
            expect(mock_tweet_summary_repository.findOne).toHaveBeenCalledWith({
                where: { tweet_id: 'tweet-123' },
            });
            expect(mock_tweet_summary_repository.create).not.toHaveBeenCalled();
        });

        it('should skip generation if Groq is disabled', async () => {
            const original_enable_groq = process.env.ENABLE_GROQ;
            delete process.env.ENABLE_GROQ;
            mock_tweet_summary_repository.findOne.mockResolvedValue(null);

            const result = await processor.handleGenerateSummary(mock_job);

            expect(result).toEqual({
                success: false,
                reason: 'Groq disabled',
            });
            expect(mock_tweet_summary_repository.save).not.toHaveBeenCalled();

            // Restore
            if (original_enable_groq) process.env.ENABLE_GROQ = original_enable_groq;
        });

        it('should skip generation if MODEL_NAME is not set', async () => {
            const original_model_name = process.env.MODEL_NAME;
            delete process.env.MODEL_NAME;
            mock_tweet_summary_repository.findOne.mockResolvedValue(null);

            const result = await processor.handleGenerateSummary(mock_job);

            expect(result).toEqual({
                success: false,
                reason: 'Groq disabled',
            });
            expect(mock_tweet_summary_repository.save).not.toHaveBeenCalled();

            // Restore
            if (original_model_name) process.env.MODEL_NAME = original_model_name;
        });

        it('should handle database errors when finding existing summary', async () => {
            mock_tweet_summary_repository.findOne.mockRejectedValue(new Error('DB Error'));

            await expect(processor.handleGenerateSummary(mock_job)).rejects.toThrow('DB Error');
        });

        it('should handle database errors when saving summary', async () => {
            mock_tweet_summary_repository.findOne.mockResolvedValue(null);
            mock_tweet_summary_repository.save.mockRejectedValue(new Error('Save Error'));

            await expect(processor.handleGenerateSummary(mock_job)).rejects.toThrow();
        });

        it('should process job data correctly', async () => {
            const existing_summary = {
                id: 1,
                tweet_id: 'tweet-456',
                summary: 'Another summary',
            };

            const custom_job = {
                data: {
                    tweet_id: 'tweet-456',
                    content: 'Different tweet content',
                },
            } as Job<any>;

            mock_tweet_summary_repository.findOne.mockResolvedValue(existing_summary);

            const result = await processor.handleGenerateSummary(custom_job);

            expect(result).toEqual({
                success: true,
                summary: 'Another summary',
            });
            expect(mock_tweet_summary_repository.findOne).toHaveBeenCalledWith({
                where: { tweet_id: 'tweet-456' },
            });
        });
    });
});
