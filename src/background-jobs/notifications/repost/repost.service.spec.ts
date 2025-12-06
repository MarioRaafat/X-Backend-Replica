import { Test, TestingModule } from '@nestjs/testing';
import { RepostJobService } from './repost.service';

describe('RepostJobService', () => {
    let service: RepostJobService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: RepostJobService,
                    useValue: {
                        addRepostJob: jest.fn(),
                        queueRepostNotification: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RepostJobService>(RepostJobService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
