import { generateOtpEmailHtml } from './otp-email';
import { Y_LOGO_HOST_URL, Y_LOGO_URL } from '../constants/variables';

describe('generateOtpEmailHtml', () => {
    const default_params = {
        title: 'Test Title',
        description: 'Test Description',
        otp: '123456',
        subtitle: 'Test Subtitle',
        subtitle_description: 'Test Subtitle Description',
        username: 'testuser',
    };

    it('should generate HTML email template', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('should include DOCTYPE and html tags', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toContain('<html');
        expect(result).toContain('</html>');
    });

    it('should include the title in the template', () => {
        const custom_title = 'Reset Your Password';
        const result = generateOtpEmailHtml(
            custom_title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(custom_title);
    });

    it('should include the description in the template', () => {
        const custom_description = 'Please use this code to verify your email';
        const result = generateOtpEmailHtml(
            default_params.title,
            custom_description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(custom_description);
    });

    it('should include the OTP code in the template', () => {
        const custom_otp = '987654';
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            custom_otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(custom_otp);
    });

    it('should include the subtitle in the template', () => {
        const custom_subtitle = 'Important Notice';
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            custom_subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(custom_subtitle);
    });

    it('should include the subtitle description in the template', () => {
        const custom_subtitle_desc = 'This code will expire in 10 minutes';
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            custom_subtitle_desc,
            default_params.username
        );

        expect(result).toContain(custom_subtitle_desc);
    });

    it('should include the username in the template', () => {
        const custom_username = 'john_doe';
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            custom_username
        );

        expect(result).toContain(custom_username);
    });

    it('should include Yapper logo URL', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(Y_LOGO_URL);
    });

    it('should include Yapper logo host URL', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(Y_LOGO_HOST_URL);
    });

    it('should include proper HTML structure with head and body', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain('<head>');
        expect(result).toContain('</head>');
        expect(result).toContain('<body>');
        expect(result).toContain('</body>');
    });

    it('should include meta tags for responsive design', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain('<meta charset="UTF-8">');
        expect(result).toContain('viewport');
    });

    it('should include CSS styling', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain('<style>');
        expect(result).toContain('</style>');
        expect(result).toContain('font-family');
    });

    it('should handle empty strings gracefully', () => {
        const result = generateOtpEmailHtml('', '', '', '', '', '');

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result).toContain('<!DOCTYPE html>');
    });

    it('should handle special characters in parameters', () => {
        const result = generateOtpEmailHtml(
            'Title with <special> & "characters"',
            'Description with <tags>',
            '123456',
            'Subtitle',
            'Description',
            'user@example.com'
        );

        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
    });

    it('should include email container div', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain('email-container');
    });

    it('should include table structure for email compatibility', () => {
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain('<table');
        expect(result).toContain('</table>');
        expect(result).toContain('<tr>');
        expect(result).toContain('<td');
    });

    it('should handle long OTP codes', () => {
        const long_otp = '123456789012';
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            long_otp,
            default_params.subtitle,
            default_params.subtitle_description,
            default_params.username
        );

        expect(result).toContain(long_otp);
    });

    it('should handle Unicode characters', () => {
        const unicode_username = 'user_测试_🎉';
        const result = generateOtpEmailHtml(
            default_params.title,
            default_params.description,
            default_params.otp,
            default_params.subtitle,
            default_params.subtitle_description,
            unicode_username
        );

        expect(result).toContain(unicode_username);
    });
});
