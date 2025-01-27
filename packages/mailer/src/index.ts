import * as amqp from 'amqplib';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function connectQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();

    // Define queues
    await channel.assertQueue('route-notifications', { durable: true });
    await channel.assertQueue('shipment-notifications', { durable: true });

    console.log('Connected to RabbitMQ');

    // Process route notifications
    channel.consume('route-notifications', async (data) => {
      if (data) {
        const emailData: EmailMessage = JSON.parse(data.content.toString());
        try {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            ...emailData,
          });
          channel.ack(data);
          console.log('Route notification email sent successfully');
        } catch (error) {
          console.error('Error sending route notification email:', error);
          // Nack the message to retry later
          channel.nack(data, false, true);
        }
      }
    });

    // Process shipment notifications
    channel.consume('shipment-notifications', async (data) => {
      if (data) {
        const emailData: EmailMessage = JSON.parse(data.content.toString());
        try {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            ...emailData,
          });
          channel.ack(data);
          console.log('Shipment notification email sent successfully');
        } catch (error) {
          console.error('Error sending shipment notification email:', error);
          // Nack the message to retry later
          channel.nack(data, false, true);
        }
      }
    });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    // Retry connection after delay
    setTimeout(connectQueue, 5000);
  }
}

connectQueue(); 