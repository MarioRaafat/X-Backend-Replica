export const Y_LOGO_URL =
    'https://yapperdev.blob.core.windows.net/profile-images/25a3ccdd-0437-4e88-9bcb-028f1de2d7c4-1763920269595-Y_Logo.jpg';
export const Y_LOGO_HOST_URL = 'https://yapperdev.blob.core.windows.net/profile-images/';

export const STRING_MAX_LENGTH = 100;
export const LARGE_MAX_LENGTH = 3000;
export const POST_CONTENT_LENGTH = 280;
export const MESSAGE_CONTENT_LENGTH = 300;
export const OTP_LENGTH = 6;

// ------------------------- Email Templates ------------------------- //
export const verification_email_object = (otp: string, link: string) => ({
    subject: `${otp} is your Y verification code`,
    title: 'Confirm your email address',
    description: 'Please enter this verification code to get started on Yapper:',
    subtitle: 'Getting a lot of emails?',
    subtitle_description: `
        If you feel this is not your account or you didn't request this, you can let us know by clicking
            <a href=${link} 
                title="click here to report it"
                style="color: #1d9bf0; text-decoration: none;"
                target="_blank">Not my account</a>.
    `,
});

export const reset_password_email_object = (username: string) => ({
    subject: 'Password reset request',
    title: 'Reset your password?',
    description: `If you requested a password reset for @${username}, use the confirmation code below to complete the process. If you didn't make this request, ignore this email.`,
    subtitle: '',
    subtitle_description: ``,
});
