// rabbitmq.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchange = 'app_exchange';

  async onModuleInit() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'direct', { durable: true });
      console.log('RabbitMQ connected successfully');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error.message);
      console.log('Application will continue without RabbitMQ messaging');
      // Set connection and channel to null so other methods can check
      this.connection = null;
      this.channel = null;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error.message);
    }
  }

  async publish(key: string, message: any) {
    if (!this.channel) {
      console.warn('RabbitMQ not available, skipping message publication');
      return;
    }
    
    try {
      const buffer = Buffer.from(JSON.stringify(message));
      this.channel.publish(this.exchange, key, buffer, { persistent: true });
      console.log(`Message published to ${key}`, message);
    } catch (error) {
      console.error(`Failed to publish message to ${key}:`, error.message);
    }
  }

  async subscribe(key: string, callback: (msg: any) => Promise<void> | void) {
    if (!this.channel) {
      console.warn('RabbitMQ not available, skipping subscription setup');
      return;
    }

    try {
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
    } catch (error) {
      console.error(`Failed to set up subscription for ${key}:`, error.message);
    }
  }
}
