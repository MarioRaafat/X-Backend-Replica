import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notifications.entity';
import { NotificationsGateway } from './notifications.gateway';
import { User } from '../user/entities/user.entity';
import { Tweet } from '../tweets/entities/tweet.entity';
import { ClearJobService } from '../background-jobs/notifications/clear/clear.service';
import { FCMService } from '../expo/expo.service';
import { MessagesGateway } from '../messages/messages.gateway';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let notification_model: jest.Mocked<Model<Notification>>;

    const mock_notification = {
        user: 'user-123',
        notifications: [
            {
                type: 'follow',
                follower_id: 'user-456',
                follower_name: 'John Doe',
                created_at: new Date(),
                seen: false,
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getModelToken(Notification.name),
                    useValue: {
                        updateOne: jest.fn(),
                        findOne: jest.fn(),
                        find: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: NotificationsGateway,
                    useValue: {
                        setNotificationsService: jest.fn(),
                        sendNotificationToUser: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Tweet),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: ClearJobService,
                    useValue: {
                        queueClearNotification: jest.fn(),
                    },
                },
                {
                    provide: FCMService,
                    useValue: {
                        sendNotificationToUserDevice: jest.fn(),
                        addUserDeviceToken: jest.fn(),
                        removeUserDeviceToken: jest.fn(),
                    },
                },
                {
                    provide: MessagesGateway,
                    useValue: {
                        sendMessageNotificationToUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        notification_model = module.get(getModelToken(Notification.name));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
