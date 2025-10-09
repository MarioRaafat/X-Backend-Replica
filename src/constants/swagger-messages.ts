export const ERROR_MESSAGES = {
    // Authentication
    WRONG_PASSWORD: 'Wrong password',
    PASSWORD_CONFIRMATION_MISMATCH: 'Confirmation password must match password',
    NEW_PASSWORD_SAME_AS_OLD: 'New password must be different from the old password',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    EMAIL_NOT_VERIFIED: 'Email not verified yet. Please check your inbox',
    SOCIAL_LOGIN_REQUIRED: 'User registered with social login. Please use social login to access your account',
    CAPTCHA_VERIFICATION_FAILED: 'CAPTCHA verification failed. Please try again',
    ACCOUNT_ALREADY_VERIFIED: 'Account was already verified',

    // user
    USER_NOT_FOUND: 'User not found',
    USER_NOT_FOUND_OR_VERIFIED: 'User not found or already verified',

    // communication
    FAILED_TO_SEND_OTP_EMAIL: 'Failed to send OTP email',

    // database
    FAILED_TO_SAVE_IN_DB: 'Failed to save the data to database',
    FAILED_TO_UPDATE_IN_DB: 'Failed to update the data in database',

    // links & Tokens
    INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
    INVALID_OR_EXPIRED_LINK: 'Invalid or expired link',
    NO_REFRESH_TOKEN_PROVIDED: 'No refresh token provided',

    // server
    INTERNAL_SERVER_ERROR: 'Internal server error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    USER_REGISTERED: 'User successfully registered. Check email for verification',
    LOGGED_IN: 'Logged in Successfully!',
    EMAIL_VERIFIED: 'Email verified successfully',
    OTP_GENERATED: 'OTP generated and sent successfully',
    OTP_VERIFIED: 'OTP verified successfully, you can now reset your password',
    NEW_ACCESS_TOKEN: 'New access token generated',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_RESET_OTP_SENT: 'Password reset OTP sent to your email',
    PASSWORD_RESET: 'Password reset successfully',
    CAPTCHA_SITE_KEY: 'ReCAPTCHA site key retrieved successfully',
    LOGGED_OUT: 'Successfully logged out from this device',
    LOGGED_OUT_ALL: 'Successfully logged out from all devices',
    ACCOUNT_REMOVED: 'Account successfully removed due to unauthorized access report',
} as const;