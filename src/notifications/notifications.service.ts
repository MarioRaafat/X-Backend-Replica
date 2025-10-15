import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notifications.entity';
import { BaseNotificationEntity } from './entities/base_notification.entity';
import { Not } from 'typeorm';
import { NotificationTypes } from './enums/notidication_types';

interface NotificationMessage {
  userId: string;
  notification: BaseNotificationEntity;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly key = 'notifications';

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
    private readonly rabbit: RabbitmqService,
  ) {}

  async onModuleInit() {
    await this.rabbit.subscribe(this.key, (data) => this.handleMessage(data));
  }

  async handleMessage(data: NotificationMessage): Promise<void> {
    try {
      const { userId, notification } = data;

      await this.notificationModel.updateOne(
        { user: userId },
        {
          $push: {
            notifications: {
              $each: [notification],
              $position: 0,
              $slice: 50,
            },
          },
        },
        { upsert: true },
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getUserMentionsNotifications(userId: string) {

  }

  async markNotificationsAsSeen(userId: string) {

  }

  async getUnseenCount(userId: string) {

  }

  async getUserNotifications(userId: string): Promise<Notification | null> {
    const userNotifications = await this.notificationModel.findOne({ user: userId }).lean<Notification>().exec();
    return userNotifications;
  }

  // Just for testing, but notifications messages will be sent from other services
  async sendNotification(notification: NotificationMessage): Promise<void> {
    console.log("Send");

    await this.rabbit.publish(this.key, notification);
  }

  // Test function
  async temp(object: any) {
    console.log(object);
    const baseNotification: BaseNotificationEntity = {
      type: NotificationTypes.LIKE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.sendNotification({ userId: object.user, notification: baseNotification });
  }
}
