// rabbitmq.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchange = 'app_exchange';

  async onModuleInit() {
    this.connection = await amqp.connect(`amqp://${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'direct', { durable: true });
    console.log('RabbitMQ connected');
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(key: string, message: any) {
    const buffer = Buffer.from(JSON.stringify(message));
    this.channel.publish(this.exchange, key, buffer, { persistent: true });
    console.log(`Message published to ${key}`, message);
  }

  async subscribe(key: string, callback: (msg: any) => Promise<void> | void) {
    const queue = `${key}_queue`;
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, this.exchange, key);

    await this.channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        const content = JSON.parse(msg.content.toString());
        try {
          await callback(content);
          this.channel.ack(msg);
        } catch (err) {
          console.error('Error processing message:', err);
          this.channel.nack(msg, false, true);
        }
      },
      { noAck: false },
    );
    
    console.log(`Listening on queue ${queue}`);
  }
}
