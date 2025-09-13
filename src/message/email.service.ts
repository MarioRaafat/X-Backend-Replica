import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter, SendMailOptions } from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private mailTransport: Transporter;

  constructor(private configService: ConfigService) {
    this.mailTransport = createTransport({
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: this.configService.get<boolean>('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      pool: true,
      maxConnections: 5,
    });
  }

  async sendEmail(
    data: SendEmailDto,
  ): Promise<{ success: boolean; message: string } | null> {
    const { sender, recipients, subject, html, text } = data;

    let senderAdd = {
      name: this.configService.get('EMAIL_FROM_NAME'),
      address: this.configService.get('EMAIL_USER'),
    };

    if (sender) {
      senderAdd = sender;
    }

    const mailOptions: SendMailOptions = {
      from: senderAdd,
      to: recipients,
      subject,
      html,
      text,
    };

    try {
      await this.mailTransport.sendMail(mailOptions);
      return { success: true, message: 'Sending email in a moment' };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
