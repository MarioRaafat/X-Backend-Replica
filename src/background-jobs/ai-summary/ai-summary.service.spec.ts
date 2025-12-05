import { Test, TestingModule } from '@nestjs/testing';
import { AiSummaryJobService } from './ai-summary.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from '../constants/queue.constants';

describe('AiSummaryJobService', () => {
    let service: AiSummaryJobService;

    const mockQueue = {
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
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<AiSummaryJobService>(AiSummaryJobService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
