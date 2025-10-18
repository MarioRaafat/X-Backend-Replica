export const ERROR_MESSAGES = {
    // auth
    WRONG_PASSWORD: 'Wrong password',
    PASSWORD_CONFIRMATION_MISMATCH: 'Confirmation password must match password',
    NEW_PASSWORD_SAME_AS_OLD: 'New password must be different from the old password',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    EMAIL_NOT_VERIFIED: 'Email not verified yet. Please check your inbox',
    SOCIAL_LOGIN_REQUIRED: 'User registered with social login. Please use social login to access your account',
    CAPTCHA_VERIFICATION_FAILED: 'CAPTCHA verification failed. Please try again',
    ACCOUNT_ALREADY_VERIFIED: 'Account was already verified',
    SIGNUP_SESSION_NOT_FOUND: 'Signup session not found or expired. Please start registration again',
    SIGNUP_SESSION_ALREADY_EXISTS: 'Signup session already exists. Please verify your email or start over',

    // OAuth completion
    INVALID_OAUTH_SESSION_TOKEN: 'Invalid OAuth session token',
    USERNAME_ALREADY_TAKEN: 'Username is already taken',
    USER_NOT_FOUND_OAUTH_COMPLETION_REQUIRED: 'User not found, OAuth completion required',

    // user
    USER_NOT_FOUND: 'User not found',
    USER_NOT_FOUND_OR_VERIFIED: 'User not found or already verified',

    // communication
    FAILED_TO_SEND_OTP_EMAIL: 'Failed to send OTP email',
    OTP_REQUEST_WAIT: 'Please wait a minute before requesting a new code',

    // database
    FAILED_TO_SAVE_IN_DB: 'Failed to save the data to database',
    FAILED_TO_UPDATE_IN_DB: 'Failed to update the data in database',

    // file upload
    FILE_TOO_LARGE: 'File size exceeds the maximum limit',
    INVALID_FILE_TYPE: 'Invalid file type. Only images and videos are allowed',
    NO_FILE_PROVIDED: 'No file provided',

    // links & Tokens
    INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
    INVALID_OR_EXPIRED_LINK: 'Invalid or expired link',
    NO_REFRESH_TOKEN_PROVIDED: 'No refresh token provided',

    // server
    INTERNAL_SERVER_ERROR: 'Internal server error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    // auth
    USER_REGISTERED: 'User successfully registered. Check email for verification',
    SIGNUP_STEP1_COMPLETED: 'Information saved. Check email for verification code',
    SIGNUP_STEP2_COMPLETED: 'Email verified successfully. Please complete your registration',
    SIGNUP_STEP3_COMPLETED: 'Registration completed successfully. You are now logged in',
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

    // OAuth completion
    BIRTH_DATE_SET: 'Birth date set successfully',
    OAUTH_USER_REGISTERED: 'OAuth user registered successfully',

    // file upload
    IMAGE_UPLOADED: 'Image uploaded successfully',
    VIDEO_UPLOADED: 'Video uploaded successfully',

    // tweets
    TWEET_CREATED: 'Tweet created successfully',
    TWEETS_RETRIEVED: 'Tweets retrieved successfully',
    TWEET_RETRIEVED: 'Tweet retrieved successfully',
    TWEET_UPDATED: 'Tweet updated successfully',
    TWEET_DELETED: 'Tweet deleted successfully',
    TWEET_REPOSTED: 'Tweet reposted successfully',
    TWEET_QUOTED: 'Tweet quoted successfully',
    TWEET_LIKED: 'Tweet liked successfully',
    TWEET_UNLIKED: 'Tweet unliked successfully',
    TWEET_LIKES_RETRIEVED: 'Tweet likes retrieved successfully',
    QUOTE_TWEET_UPDATED: 'Quote tweet updated successfully',
} as const;