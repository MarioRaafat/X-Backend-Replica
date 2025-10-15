import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitmqService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly key = 'notifications';

  constructor(private readonly rabbit: RabbitmqService) {}

  async onModuleInit() {
    await this.rabbit.subscribe(this.key, (data) => this.handleMessage(data));
  }

  async handleMessage(data: any) {
    console.log('Received:', data);
  }

  async sendNotification(email: string, text: string) {
    await this.rabbit.publish(this.key, { email, text });
  }
}
