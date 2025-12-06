import { Test, TestingModule } from '@nestjs/testing';
import { QuoteJobService } from './quote.service';

describe('QuoteJobService', () => {
    let service: QuoteJobService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: QuoteJobService,
                    useValue: {
                        addQuoteJob: jest.fn(),
                        queueQuoteNotification: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<QuoteJobService>(QuoteJobService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
