import { Test, TestingModule } from '@nestjs/testing';
import { FcmController } from './fcm.controller';
import { FCMService } from './fcm.service';

describe('FcmController', () => {
    let controller: FcmController;

    const mock_fcm_service = {
        sendNotificationToUserDevice: jest.fn(),
        addUserDeviceToken: jest.fn(),
        removeUserDeviceToken: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FcmController],
            providers: [
                {
                    provide: FCMService,
                    useValue: mock_fcm_service,
                },
            ],
        }).compile();

        controller = module.get<FcmController>(FcmController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
