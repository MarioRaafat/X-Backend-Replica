import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, SendMailOptions, Transporter } from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
    private mail_transport: Transporter;

    constructor(private config_service: ConfigService) {
        this.mail_transport = createTransport({
            host: this.config_service.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
            port: this.config_service.get<number>('EMAIL_PORT', 587),
            secure: this.config_service.get<boolean>('EMAIL_SECURE', false),
            auth: {
                user: this.config_service.get<string>('EMAIL_USER'),
                pass: this.config_service.get<string>('EMAIL_PASS'),
            },
            pool: true,
            maxConnections: 5,
        });
    }

    async sendEmail(
        email_data: SendEmailDto
    ): Promise<{ success: boolean; message: string } | null> {
        const { sender, recipients, subject, html, text } = email_data;

        let sender_address = {
            name: this.config_service.get('EMAIL_FROM_NAME'),
            address: this.config_service.get('EMAIL_USER'),
        };

        if (sender) {
            sender_address = sender;
        }

        const mail_options: SendMailOptions = {
            from: sender_address,
            to: recipients,
            subject,
            html,
            text,
        };

        try {
            await this.mail_transport.sendMail(mail_options);
            return { success: true, message: 'Sending email in a moment' };
        } catch (error) {
            console.log(error);
            return null;
        }
    }
}
