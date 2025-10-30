export const Y_LOGO_URL = 'https://iili.io/KUhrEyN.png';
export const Y_LOGO_HOST_URL = 'https://freeimage.host/';

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
