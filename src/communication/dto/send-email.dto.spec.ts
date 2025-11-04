import { SendEmailDto } from './send-email.dto';

describe('SendEmailDto', () => {
    let dto: SendEmailDto;

    beforeEach(() => {
        dto = new SendEmailDto();
    });

    it('should be defined', () => {
        expect(dto).toBeDefined();
    });

    it('should allow setting sender', () => {
        dto.sender = { name: 'Test Sender', address: 'sender@example.com' };
        expect(dto.sender).toBeDefined();
        expect(dto.sender.address).toBe('sender@example.com');
    });

    it('should allow setting recipients', () => {
        dto.recipients = [
            { name: 'Recipient 1', address: 'recipient1@example.com' },
            { name: 'Recipient 2', address: 'recipient2@example.com' },
        ];
        expect(dto.recipients).toHaveLength(2);
        expect(dto.recipients[0].address).toBe('recipient1@example.com');
    });

    it('should allow setting subject', () => {
        dto.subject = 'Test Subject';
        expect(dto.subject).toBe('Test Subject');
    });

    it('should allow setting html', () => {
        dto.html = '<p>Test HTML content</p>';
        expect(dto.html).toBe('<p>Test HTML content</p>');
    });

    it('should allow setting text', () => {
        dto.text = 'Test plain text content';
        expect(dto.text).toBe('Test plain text content');
    });

    it('should allow undefined sender', () => {
        dto.sender = undefined;
        expect(dto.sender).toBeUndefined();
    });

    it('should allow undefined text', () => {
        dto.text = undefined;
        expect(dto.text).toBeUndefined();
    });

    it('should create a complete email DTO', () => {
        dto.sender = { name: 'Admin', address: 'admin@example.com' };
        dto.recipients = [{ name: 'User', address: 'user@example.com' }];
        dto.subject = 'Welcome';
        dto.html = '<h1>Welcome!</h1>';
        dto.text = 'Welcome!';

        expect(dto.sender?.name).toBe('Admin');
        expect(dto.recipients).toHaveLength(1);
        expect(dto.subject).toBe('Welcome');
        expect(dto.html).toBe('<h1>Welcome!</h1>');
        expect(dto.text).toBe('Welcome!');
    });
});
