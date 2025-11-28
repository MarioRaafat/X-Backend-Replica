import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

jest.mock('nodemailer');

describe('EmailService', () => {
    let service: EmailService;
    let config_service: jest.Mocked<ConfigService>;
    let mock_transporter: any;

    beforeEach(async () => {
        mock_transporter = {
            sendMail: jest.fn(),
        };

        (createTransport as jest.Mock).mockReturnValue(mock_transporter);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, default_value?: any) => {
                            const config = {
                                EMAIL_HOST: 'smtp.test.com',
                                EMAIL_PORT: 587,
                                EMAIL_SECURE: false,
                                EMAIL_USER: 'test@test.com',
                                EMAIL_PASS: 'test-password',
                                EMAIL_FROM_NAME: 'Test Sender',
                            };
                            return config[key] ?? default_value;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<EmailService>(EmailService);
        config_service = module.get(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('constructor', () => {
        it('should create mail transport with correct configuration', () => {
            expect(createTransport).toHaveBeenCalledWith({
                host: 'smtp.test.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'test@test.com',
                    pass: 'test-password',
                },
                pool: true,
                maxConnections: 5,
            });
        });
    });

    describe('sendEmail', () => {
        it('should send email successfully with default sender', async () => {
            mock_transporter.sendMail.mockResolvedValue({ messageId: '123' });

            const email_data: SendEmailDto = {
                recipients: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
                text: 'Test Text',
            };

            const result = await service.sendEmail(email_data);

            expect(result).toEqual({
                success: true,
                message: 'Sending email in a moment',
            });

            expect(mock_transporter.sendMail).toHaveBeenCalledWith({
                from: {
                    name: 'Test Sender',
                    address: 'test@test.com',
                },
                to: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
                text: 'Test Text',
            });
        });

        it('should send email successfully with custom sender', async () => {
            mock_transporter.sendMail.mockResolvedValue({ messageId: '456' });

            const email_data: SendEmailDto = {
                sender: {
                    name: 'Custom Sender',
                    address: 'custom@test.com',
                },
                recipients: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
                text: 'Test Text',
            };

            const result = await service.sendEmail(email_data);

            expect(result).toEqual({
                success: true,
                message: 'Sending email in a moment',
            });

            expect(mock_transporter.sendMail).toHaveBeenCalledWith({
                from: {
                    name: 'Custom Sender',
                    address: 'custom@test.com',
                },
                to: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
                text: 'Test Text',
            });
        });

        it('should send email to multiple recipients', async () => {
            mock_transporter.sendMail.mockResolvedValue({ messageId: '789' });

            const email_data: SendEmailDto = {
                recipients: [
                    { name: 'Recipient 1', address: 'recipient1@test.com' },
                    { name: 'Recipient 2', address: 'recipient2@test.com' },
                ],
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
            };

            const result = await service.sendEmail(email_data);

            expect(result).toEqual({
                success: true,
                message: 'Sending email in a moment',
            });

            expect(mock_transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: [
                        { name: 'Recipient 1', address: 'recipient1@test.com' },
                        { name: 'Recipient 2', address: 'recipient2@test.com' },
                    ],
                })
            );
        });

        it('should return null when sending email fails', async () => {
            const error = new Error('SMTP connection failed');
            mock_transporter.sendMail.mockRejectedValue(error);

            const console_spy = jest.spyOn(console, 'log').mockImplementation();

            const email_data: SendEmailDto = {
                recipients: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
            };

            const result = await service.sendEmail(email_data);

            expect(result).toBeNull();
            expect(console_spy).toHaveBeenCalledWith(error);

            console_spy.mockRestore();
        });

        it('should handle email with only html content', async () => {
            mock_transporter.sendMail.mockResolvedValue({ messageId: '999' });

            const email_data: SendEmailDto = {
                recipients: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'HTML Only',
                html: '<p>HTML content only</p>',
            };

            const result = await service.sendEmail(email_data);

            expect(result).toEqual({
                success: true,
                message: 'Sending email in a moment',
            });

            expect(mock_transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: '<p>HTML content only</p>',
                    text: undefined,
                })
            );
        });

        it('should handle email with only text content', async () => {
            mock_transporter.sendMail.mockResolvedValue({ messageId: '888' });

            const email_data: SendEmailDto = {
                recipients: [{ name: 'Recipient', address: 'recipient@test.com' }],
                subject: 'Text Only',
                html: '', // html is required, so use empty string
                text: 'Text content only',
            };

            const result = await service.sendEmail(email_data);

            expect(result).toEqual({
                success: true,
                message: 'Sending email in a moment',
            });

            expect(mock_transporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: 'Text content only',
                    html: '',
                })
            );
        });
    });
});
