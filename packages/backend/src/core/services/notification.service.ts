import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private channel: amqp.Channel;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const connection = await amqp.connect(
        this.configService.get('RABBITMQ_URL') || 'amqp://localhost',
      );
      this.channel = await connection.createChannel();

      // Ensure queues exist
      await this.channel.assertQueue('route-notifications', { durable: true });
      await this.channel.assertQueue('shipment-notifications', { durable: true });

      console.log('NotificationService connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async sendRouteNotification(emailData: EmailMessage) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    this.channel.sendToQueue(
      'route-notifications',
      Buffer.from(JSON.stringify(emailData)),
      { persistent: true },
    );
  }

  async sendShipmentNotification(emailData: EmailMessage) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    this.channel.sendToQueue(
      'shipment-notifications',
      Buffer.from(JSON.stringify(emailData)),
      { persistent: true },
    );
  }
} 