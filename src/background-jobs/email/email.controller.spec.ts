import { Test, TestingModule } from '@nestjs/testing';
import { EmailJobsController } from './email.controller';
import { EmailJobsService } from './email.service';

describe('EmailJobsController', () => {
    let controller: EmailJobsController;
    let mock_service: jest.Mocked<EmailJobsService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EmailJobsController],
            providers: [
                {
                    provide: EmailJobsService,
                    useValue: {
                        getEmailQueueStats: jest.fn(),
                        pauseEmailQueue: jest.fn(),
                        resumeEmailQueue: jest.fn(),
                        cleanEmailQueue: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<EmailJobsController>(EmailJobsController);
        mock_service = module.get(EmailJobsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getEmailQueueStats', () => {
        it('should return email queue statistics', async () => {
            const mock_stats = {
                waiting: 5,
                active: 2,
                completed: 100,
                failed: 3,
            };

            mock_service.getEmailQueueStats.mockResolvedValue(mock_stats);

            const result = await controller.getEmailQueueStats();

            expect(result).toEqual({ data: mock_stats });
            expect(mock_service.getEmailQueueStats).toHaveBeenCalled();
        });

        it('should handle empty queue stats', async () => {
            const empty_stats = {
                waiting: 0,
                active: 0,
                completed: 0,
                failed: 0,
            };

            mock_service.getEmailQueueStats.mockResolvedValue(empty_stats);

            const result = await controller.getEmailQueueStats();

            expect(result).toEqual({ data: empty_stats });
        });
    });

    describe('pauseEmailQueue', () => {
        it('should pause email queue successfully', async () => {
            const mock_result = {
                success: true,
                message: 'Email queue paused',
            };

            mock_service.pauseEmailQueue.mockResolvedValue(mock_result);

            const result = await controller.pauseEmailQueue();

            expect(result).toEqual(mock_result);
            expect(mock_service.pauseEmailQueue).toHaveBeenCalled();
        });
    });

    describe('resumeEmailQueue', () => {
        it('should resume email queue successfully', async () => {
            const mock_result = {
                success: true,
                message: 'Email queue resumed',
            };

            mock_service.resumeEmailQueue.mockResolvedValue(mock_result);

            const result = await controller.resumeEmailQueue();

            expect(result).toEqual(mock_result);
            expect(mock_service.resumeEmailQueue).toHaveBeenCalled();
        });
    });

    describe('cleanEmailQueue', () => {
        it('should clean email queue successfully', async () => {
            const mock_result = {
                success: true,
                message: 'Cleaned 50 jobs',
                cleaned_count: 50,
            };

            mock_service.cleanEmailQueue.mockResolvedValue(mock_result);

            const result = await controller.cleanEmailQueue();

            expect(result).toEqual(mock_result);
            expect(mock_service.cleanEmailQueue).toHaveBeenCalled();
        });

        it('should handle zero cleaned jobs', async () => {
            const mock_result = {
                success: true,
                message: 'No jobs to clean',
                cleaned_count: 0,
            };

            mock_service.cleanEmailQueue.mockResolvedValue(mock_result);

            const result = await controller.cleanEmailQueue();

            expect(result).toEqual(mock_result);
        });
    });
});
