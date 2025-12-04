import { Test, TestingModule } from '@nestjs/testing';
import { HashtagJobService } from './hashtag.service';

describe('HashtagJobService', () => {
    let service: HashtagJobService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HashtagJobService],
        }).compile();

        service = module.get<HashtagJobService>(HashtagJobService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
