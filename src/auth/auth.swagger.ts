import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

// OAuth Response Constants
const getOAuthResponseDescription = (provider: 'Google' | 'GitHub' | 'Facebook') => `
**Two Possible Responses:**
1. **Existing User**: ${provider} account linked to existing user - Returns user data with access_token and refresh_token (direct login)
2. **New User**: New ${provider} account - Returns session_token requiring OAuth completion flow (birth date + username)
`;

const OAUTH_RESPONSE_EXISTING_USER = {
    description: 'Existing user - successfully logged in',
    example: {
        data: {
            user: {
                id: 'd102dadc-0b17-4e83-812b-00103b606a1f',
                email: 'lionel_messi10@gmail.com',
                name: 'Messi 3amk',
                username: 'lionel_messi',
                birth_date: '1987-06-24',
                avatar_url: 'https://media.cnn.com/api/v1/images/stellar/prod/221218184732-messi-wc-trophy.jpg?c=16x9&q=h_833,w_1480,c_fill',
            },
            access_token: 'messi doesn\'t need a token to be authenticated bro',
            refresh_token: 'suiiiiiiiiiiiiiiii',
        },
        count: 1,
        message: SUCCESS_MESSAGES.LOGGED_IN,
    },
};

const getOAuthResponseNewUser = (provider: 'google' | 'github' | 'facebook') => ({
    description: 'New user - needs to complete registration',
    example: {
        data: {
            needs_completion: true,
            session_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            provider: provider,
        },
        count: 1,
        message: SUCCESS_MESSAGES.LOGGED_IN,
    },
});

export const signup_step1_swagger = {
    operation: {
        summary: 'Signup Step 1 - Submit basic information',
        description: `
**Multi-stage Signup Flow - Step 1 of 3**

Submit your basic information to begin the registration process.

**What happens:**
1. System validates that the email is not already registered
2. Stores your information in a temporary session (valid for 1 hour)
3. Generates OTP code
4. Sends the OTP to your email with a "Not Me" link for security

**Next step:** Use the OTP received in your email to verify ownership at \`POST /auth/signup/step2\`

**Note:** The signup session expires after 1 hour. If expired, you'll need to start over.
        `,
    },

    responses: {
        success: {
            description: 'Information saved and verification email sent',
            schema: {
                example: {
                    data: {
                        isEmailSent: true,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.SIGNUP_STEP1_COMPLETED,
                },
            },
        },
    },
};

export const signup_step2_swagger = {
    operation: {
        summary: 'Signup Step 2 - Verify email with OTP',
        description: `
**Multi-stage Signup Flow - Step 2 of 3**

Verify your email address using the OTP code sent to your inbox.

**What happens:**
1. System validates the OTP against the one sent to your email
2. Marks your email as verified in the signup session
3. OTP is valid for a limited time only

**Next step:** Complete your registration by setting a password and username at \`POST /auth/signup/step3\`

**Note:** You must complete this step before your signup session expires (1 hour from step 1).
        `,
    },

    responses: {
        success: {
            description: 'Email verified successfully',
            schema: {
                example: {
                    data: {
                        isVerified: true,
                        recommendations: ['mario198', 'marioraafat01743', 'raafat9720'],
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.SIGNUP_STEP2_COMPLETED,
                },
            },
        },
    },
};

export const signup_step3_swagger = {
    operation: {
        summary: 'Signup Step 3 - Complete registration',
        description: `
**Multi-stage Signup Flow - Step 3 of 3**

Complete your registration by setting a password, choosing a username, and optionally providing additional preferences.

**What happens:**
1. System validates that your email was verified in step 2
2. Validates password strength and confirmation match
3. Creates your user account in the database
4. Cleans up the temporary signup session
5. Returns your new user ID

**Required fields:**
- Email (must match the one from previous steps)
- Password (min 8 chars, must include uppercase, lowercase, and number/special char)
- Username (unique identifier)

**Optional fields:**
- Language preference (en or ar)

**After completion:** You can now login with your email and password at \`POST /auth/login\`
        `,
    },

    responses: {
        success: {
            description: 'Registration completed successfully',
            schema: {
                example: {
                    data: {
                        userId: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
                        access_token:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQxMDJkYWRjLTBiMTctNGU4My04MTJiLTAwMTAzYjYwNmExZiIsImlhdCI6MTc1ODE0Nzg2OSwiZXhwIjoxNzU4MTUxNDY5fQ.DV3oA5Fn-cj-KHrGcafGaoWGyvYFx4N50L9Ke4_n6OU',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.SIGNUP_STEP3_COMPLETED,
                },
            },
            headers: {
                'Set-Cookie': {
                    description: 'HttpOnly cookie containing refresh token',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict',
                    },
                },
            },
        },
    },
};

export const generate_otp_swagger = {
    operation: {
        summary: 'Generate email verification OTP',
        description: "Generate and send a new email verification OTP to the user's email.",
    },

    responses: {
        success: {
            description: 'OTP generated and sent successfully',
            schema: {
                example: {
                    data: {
                        isEmailSent: true,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.OTP_GENERATED,
                },
            },
        },
    },
};

export const verify_email_swagger = {
    operation: {
        summary: 'Verify email with OTP',
        description: `
    Verify user email using the OTP sent to their email address.
    The target is to check if the user owns the provided email or not by validating the OTP.        
    `,
    },

    responses: {
        success: {
            description: 'Email verified successfully',
            schema: {
                example: {
                    data: {
                        userId: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
                },
            },
        },
    },
};

export const login_swagger = {
    operation: {
        summary: 'User login',
        description:
            'Authenticate user and receive access token. Refresh token is set as httpOnly cookie.',
    },

    responses: {
        success: {
            description: 'Login successful',
            schema: {
                example: {
                    data: {
                        access_token:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQxMDJkYWRjLTBiMTctNGU4My04MTJiLTAwMTAzYjYwNmExZiIsImlhdCI6MTc1ODE0Nzg2OSwiZXhwIjoxNzU4MTUxNDY5fQ.DV3oA5Fn-cj-KHrGcafGaoWGyvYFx4N50L9Ke4_n6OU',
                        user: {
                            id: 'd102dadc-0b17-4e83-812b-00103b606a1f',
                            email: 'amirakhaled928@gmail.com',
                            name: 'Amira',
                            phone_number: '+201143126545',
                            github_id: null,
                            facebook_id: null,
                            google_id: null,
                            avatar_url: null,
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.LOGGED_IN,
                },
            },
            headers: {
                'Set-Cookie': {
                    description: 'HttpOnly cookie containing refresh token',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict',
                    },
                },
            },
        },
    },
};

export const refresh_token_swagger = {
    operation: {
        summary: 'Refresh access token',
        description: 'Use refresh token from httpOnly cookie to get a new access token.',
    },

    responses: {
        success: {
            description: 'New access token generated',
            schema: {
                example: {
                    data: {
                        access_token:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNjZTM3YjEzLWQ2ZGUtNDhjZC1iNzQ2LWRmMjY0ODQ1N2E0NiIsImlhdCI6MTc1ODE0OTI2NywiZXhwIjoxNzU4MTUyODY3fQ.M1ennV-LC8xiJpsRKCsUo9Y4o7_6mydG0SPURuNzh6I',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.NEW_ACCESS_TOKEN,
                },
            },
            headers: {
                'Set-Cookie': {
                    description: 'New HttpOnly cookie containing refresh token',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict',
                    },
                },
            },
        },
    },
};

export const google_oauth_swagger = {
    operation: {
        summary: 'Initiate Google OAuth Login',
        description: `
      **⚠️ Important: This endpoint cannot be tested in Swagger UI**
      
      **How to use:**
      1. Open your browser and navigate to: \`<back url>/auth/google\`
      2. You will be redirected to Google's OAuth consent screen
      3. Sign in with your Google account and grant permissions
      4. Google will redirect you back to the callback URL
      5. You'll be automatically redirected to the frontend with an access token
      
      **What happens:**
      - Redirects user to Google OAuth authorization page
      - User signs in with Google credentials
      - Google redirects back to /auth/google/callback
      - System creates/finds user account and generates JWT tokens
      - User is redirected to frontend with access token in URL
      - Refresh token is set as httpOnly cookie

${getOAuthResponseDescription('Google')}
      
      **Frontend URL format:** \`<front url>/auth/success?token={access_token}\`
      `,
    },

    responses: {
        success: {
            status: 302,
            description: 'Redirects to Google OAuth authorization page',
            headers: {
                Location: {
                    description: 'Google OAuth URL',
                    schema: {
                        type: 'string',
                        example: 'https://accounts.google.com/oauth/authorize?client_id=...',
                    },
                },
            },
        },

        InternalServerError: {
            status: 500,
            description: 'Internal server error - OAuth configuration issue',
            schema: {
                example: {
                    message: 'OAuth configuration error',
                    error: 'Internal Server Error',
                    statusCode: 500,
                },
            },
        },
    },
};

export const google_mobile_swagger = {
    operation: {
        summary: 'Mobile Google OAuth Authentication',
        description: `
**Mobile Google OAuth Flow**

This endpoint is specifically designed for mobile applications (React Native/Expo) that handle OAuth through native APIs or WebView.

**How it works:**
- Mobile app obtains Google ID token through native OAuth flow
- Mobile app sends the token to this endpoint
- Backend verifies the token with Google's API
- Returns user data and JWT tokens (or session token for new users)

${getOAuthResponseDescription('Google')}

**For web applications, use:** \`GET /auth/google\` instead
        `,
    },

    responses: {
        success: {
            description: 'Google authentication successful - User logged in or needs completion',
            schema: {
                oneOf: [
                    OAUTH_RESPONSE_EXISTING_USER,
                    getOAuthResponseNewUser('google'),
                ],
            },
        }
    },
};

export const google_callback_swagger = {
    operation: {
        summary: 'Google OAuth Callback Handler',
        description: `
      **⚠️ This endpoint is called automatically by Google - Do not call manually**
      
      **What this endpoint does:**
      1. Receives authorization code from Google
      2. Exchanges code for user profile information
      3. Creates new user account OR finds existing user by email
      4. Generates JWT access token and refresh token
      5. Sets refresh token as httpOnly cookie
      6. Redirects to frontend with access token
      
      **Automatic redirect URL:** \`<front url>/auth/success?token={jwt_access_token}\`
      
      **Error redirect URL:** \`<front url>/auth/error?message=Authentication%20failed\`
      
      **Cookies set:**
      - \`refresh_token\`: HttpOnly, Secure, SameSite=Strict, 7 days expiry
      `,
    },

    responses: {
        success: {
            status: 302,
            description: 'Successful authentication - redirects to frontend with token',
            headers: {
                Location: {
                    description: 'Frontend success URL with access token',
                    schema: {
                        type: 'string',
                        example:
                            '<front url>/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    },
                },
                'Set-Cookie': {
                    description: 'HttpOnly refresh token cookie',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
                    },
                },
            },
        },

        AuthFail: {
            status: 302,
            description: 'Authentication failed - redirects to frontend error page',
            headers: {
                Location: {
                    description: 'Frontend error URL',
                    schema: {
                        type: 'string',
                        example: '<front url>/auth/error?message=Authentication%20failed',
                    },
                },
            },
        },
    },
};

export const facebook_oauth_swagger = {
    operation: {
        summary: 'Initiate Facebook OAuth Login',
        description: `
      **⚠️ Important: This endpoint cannot be tested in Swagger UI**
      
      **How to use:**
      1. Open your browser and navigate to: \`<back url>/auth/facebook\`
      2. You will be redirected to Facebook's OAuth consent screen
      3. Sign in with your Facebook account and grant permissions
      4. Facebook will redirect you back to the callback URL
      5. You'll be automatically redirected to the frontend with an access token
      
      **What happens:**
      - Redirects user to Facebook OAuth authorization page
      - User signs in with Facebook credentials
      - Facebook redirects back to /auth/facebook/callback
      - System creates/finds user account and generates JWT tokens
      - User is redirected to frontend with access token in URL
      - Refresh token is set as httpOnly cookie

${getOAuthResponseDescription('Facebook')}
      
      **Frontend URL format:** \`<front url>/auth/success?token={access_token}\`
      `,
    },

    responses: {
        success: {
            status: 302,
            description: 'Redirects to Facebook OAuth authorization page',
            headers: {
                Location: {
                    description: 'Facebook OAuth URL',
                    schema: {
                        type: 'string',
                        example: 'https://www.facebook.com/v18.0/dialog/oauth?client_id=...',
                    },
                },
            },
        },

        InternalServerError: {
            status: 500,
            description: 'Internal server error - OAuth configuration issue',
            schema: {
                example: {
                    message: 'OAuth configuration error',
                    error: 'Internal Server Error',
                    statusCode: 500,
                },
            },
        },
    },
};

export const facebook_callback_swagger = {
    operation: {
        summary: 'Facebook OAuth Callback Handler',
        description: `
      **⚠️ This endpoint is called automatically by Facebook - Do not call manually**
      
      **What this endpoint does:**
      1. Receives authorization code from Facebook
      2. Exchanges code for user profile information
      3. Creates new user account OR finds existing user by email
      4. Generates JWT access token and refresh token
      5. Sets refresh token as httpOnly cookie
      6. Redirects to frontend with access token
      
      **Automatic redirect URL:** \`<front url>/auth/success?token={jwt_access_token}\`
      
      **Error redirect URL:** \`<front url>/auth/error?message=Authentication%20failed\`
      
      **Cookies set:**
      - \`refresh_token\`: HttpOnly, Secure, SameSite=Strict, 7 days expiry
      `,
    },

    responses: {
        success: {
            status: 302,
            description: 'Successful authentication - redirects to frontend with token',
            headers: {
                Location: {
                    description: 'Frontend success URL with access token',
                    schema: {
                        type: 'string',
                        example:
                            '<front url>/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    },
                },
                'Set-Cookie': {
                    description: 'HttpOnly refresh token cookie',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
                    },
                },
            },
        },

        AuthFail: {
            status: 302,
            description: 'Authentication failed - redirects to frontend error page',
            headers: {
                Location: {
                    description: 'Frontend error URL',
                    schema: {
                        type: 'string',
                        example: '<front url>/auth/error?message=Authentication%20failed',
                    },
                },
            },
        },
    },
};

export const github_oauth_swagger = {
    operation: {
        summary: 'Initiate GitHub OAuth Login',
        description: `
      **⚠️ Important: This endpoint cannot be tested in Swagger UI**
      
      **How to use:**
      1. Open your browser and navigate to: \`<back url>/auth/github\`
      2. You will be redirected to GitHub's OAuth consent screen
      3. Sign in with your GitHub account and authorize the application
      4. GitHub will redirect you back to the callback URL
      5. You'll be automatically redirected to the frontend with an access token
      
      **What happens:**
      - Redirects user to GitHub OAuth authorization page
      - User signs in with GitHub credentials and grants permissions
      - GitHub redirects back to /auth/github/callback
      - System creates/finds user account and generates JWT tokens
      - User is redirected to frontend with access token in URL
      - Refresh token is set as httpOnly cookie

${getOAuthResponseDescription('GitHub')}
      
      **Frontend URL format:** \`<front url>/auth/success?token={access_token}\`
      `,
    },

    responses: {
        success: {
            status: 302,
            description: 'Redirects to GitHub OAuth authorization page',
            headers: {
                Location: {
                    description: 'GitHub OAuth URL',
                    schema: {
                        type: 'string',
                        example: 'https://github.com/login/oauth/authorize?client_id=...',
                    },
                },
            },
        },
        InternalServerError: {
            status: 500,
            description: 'Internal server error - OAuth configuration issue',
            schema: {
                example: {
                    message: 'OAuth configuration error',
                    error: 'Internal Server Error',
                    statusCode: 500,
                },
            },
        },
    },
};

export const github_mobile_swagger = {
    operation: {
        summary: 'Mobile GitHub OAuth Authentication',
        description: `
**Mobile GitHub OAuth Flow with PKCE Support**

This endpoint is specifically designed for mobile applications (React Native/Expo) that handle OAuth through native APIs or WebView with PKCE (Proof Key for Code Exchange) security.

**How it works:**
- Mobile app generates PKCE \`code_verifier\` and \`code_challenge\` pair
- App opens GitHub authorization with \`code_challenge\`
- User authorizes and GitHub returns authorization \`code\`
- App sends \`code\`, \`redirect_uri\`, and \`code_verifier\` to this endpoint
- Backend exchanges code for access token using PKCE verification
- Backend validates token with GitHub API
- Returns user data and JWT tokens (or session token for new users)

${getOAuthResponseDescription('GitHub')}

**Important Notes:**
- PKCE \`code_verifier\` is **required** for mobile OAuth flows
- Authorization codes are **single-use** and expire quickly (~10 minutes)
- The \`redirect_uri\` must **exactly match** your GitHub OAuth App configuration

**For web applications, use:** \`GET /auth/github\` instead
        `,
    },

    responses: {
        success: {
            description: 'GitHub authentication successful - User logged in or needs completion',
            schema: {
                oneOf: [
                    OAUTH_RESPONSE_EXISTING_USER,
                    getOAuthResponseNewUser('github'),
                ],
            },
        },
    },
};

export const github_callback_swagger = {
    operation: {
        summary: 'GitHub OAuth Callback Handler',
        description: `
      **⚠️ This endpoint is called automatically by GitHub - Do not call manually**
      
      **What this endpoint does:**
      1. Receives authorization code from GitHub
      2. Exchanges code for user profile information
      3. Creates new user account OR finds existing user by GitHub ID/email
      4. Generates JWT access token and refresh token
      5. Sets refresh token as httpOnly cookie
      6. Redirects to frontend with access token
      
      **Automatic redirect URL:** \`<front url>/auth/success?token={jwt_access_token}\`
      
      **Error redirect URL:** \`<front url>/auth/error?message=Authentication%20failed\`
      
      **Cookies set:**
      - \`refresh_token\`: HttpOnly, Secure, SameSite=Strict, 7 days expiry
      `,
    },
    responses: {
        success: {
            status: 302,
            description: 'Successful authentication - redirects to frontend with token',
            headers: {
                Location: {
                    description: 'Frontend success URL with access token',
                    schema: {
                        type: 'string',
                        example:
                            '<front url>/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    },
                },
                'Set-Cookie': {
                    description: 'HttpOnly refresh token cookie',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800',
                    },
                },
            },
        },
        AuthFail: {
            status: 302,
            description: 'Authentication failed - redirects to frontend error page',
            headers: {
                Location: {
                    description: 'Frontend error URL',
                    schema: {
                        type: 'string',
                        example: '<front url>/auth/error?message=Authentication%20failed',
                    },
                },
            },
        },
    },
};

export const not_me_swagger = {
    operation: {
        summary: 'Verify "Not Me" Report for Unauthorized Email Access',
        description: `
      **⚠️ Important: This endpoint cannot be tested in Swagger UI**
      
      **How it works:**
      1. User receives an email verification request they didn't initiate
      2. Email contains a "This wasn't me" link with a JWT token
      3. Clicking the link calls this endpoint with the token
      4. If valid, the system deletes the unverified user account
      5. User is redirected to a confirmation page
      
      **What this endpoint does:**
      - Verifies the JWT token from the link (not me)
      - Confirms that the user did not trigger the email verification
      - Deletes the unverified user account to prevent unauthorized access
      - Returns confirmation of account deletion
      
      **Token format:** JWT containing user information and expiration
      
      **This endpoint is automatically called from email links - Do not call manually**
      `,
    },

    api_query: {
        name: 'token',
        type: String,
        required: true,
        description: 'The JWT token from the link sent to the user’s email',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },

    responses: {
        success: {
            description: 'User account deleted successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.ACCOUNT_REMOVED,
                },
            },
        },
    },
};

export const change_password_swagger = {
    operation: {
        summary: 'Change user password',
        description:
            "Change the authenticated user's password. Requires current password validation and JWT authentication.",
    },

    responses: {
        success: {
            description: 'Password changed successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.PASSWORD_CHANGED,
                },
            },
        },
    },
};

export const captcha_swagger = {
    operation: {
        summary: 'Get reCAPTCHA site key',
        description: 'Returns the reCAPTCHA site key needed for frontend widget initialization.',
    },

    responses: {
        success: {
            description: 'reCAPTCHA site key returned successfully',
            schema: {
                example: {
                    data: {
                        siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.CAPTCHA_SITE_KEY,
                },
            },
        },
    },
};

export const forget_password_swagger = {
    operation: {
        summary: 'Request password reset',
        description: "Initiates password reset process by sending OTP to user's email address.",
    },

    responses: {
        success: {
            description: 'Password reset email sent successfully',
            schema: {
                example: {
                    data: {
                        isEmailSent: true,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.PASSWORD_RESET_OTP_SENT,
                },
            },
        },
    },
};

export const verify_reset_otp_swagger = {
    operation: {
        summary: 'Verify password reset OTP',
        description:
            "Verifies the OTP code sent to user's email for password reset. Step 2 of the password reset flow. Returns a secure reset token for step 3.",
    },

    responses: {
        success: {
            description: 'OTP verified successfully, secure reset token generated',
            schema: {
                example: {
                    data: {
                        isValid: true,
                        resetToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJwdXJwb3NlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE2MzIxNjE2MDAsImV4cCI6MTYzMjE2MjUwMH0...',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.OTP_VERIFIED,
                },
            },
        },
    },
};

export const reset_password_swagger = {
    operation: {
        summary: 'Reset password with secure token',
        description: `Final step of password reset flow. Changes user password using the secure reset token from step 2. 
      Token ensures the person resetting is the same who verified the OTP.`,
    },

    responses: {
        success: {
            description: 'Password reset successfully',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.PASSWORD_RESET,
                },
            },
        },
    },
};

export const logout_swagger = {
    operation: {
        summary: 'Logout from current device',
        description:
            'Logs out the user from the current device by invalidating the refresh token. The refresh token cookie will be cleared.',
    },

    responses: {
        success: {
            description: 'Successfully logged out from current device',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.LOGGED_OUT,
                },
            },
        },
    },
};

export const logout_All_swagger = {
    operation: {
        summary: 'Logout from all devices',
        description:
            'Logs out the user from all devices by invalidating all refresh tokens associated with the user. All active sessions will be terminated.',
    },

    responses: {
        success: {
            description: 'Successfully logged out from all devices',
            schema: {
                example: {
                    data: {},
                    count: 0,
                    message: SUCCESS_MESSAGES.LOGGED_OUT_ALL,
                },
            },
        },
    },
};

export const oauth_completion_step1_swagger = {
    operation: {
        summary: 'OAuth Step 1: Set birth date and get username recommendations',
        description: `
            Complete OAuth registration step 1. Sets the user's birth date and returns username recommendations.
            Requires a valid OAuth session token obtained from the OAuth callback.
        `,
    },

    responses: {
        success: {
            description: 'Birth date set successfully, username recommendations provided',
            schema: {
                example: {
                    data: {
                        usernames: [
                            'mario_2024',
                            'bahgot123',
                            'shady.mo',
                            'alyaa_official',
                            'amira_k_2024',
                        ],
                        token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        nextStep: 'choose-username',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.BIRTH_DATE_SET,
                },
            },
        },
    },
};

export const oauth_completion_step2_swagger = {
    operation: {
        summary: 'OAuth Step 2: Complete registration with username',
        description: `
            Complete OAuth registration step 2. Finalizes user account creation with the chosen username.
            Returns access token and user data. Refresh token is set as httpOnly cookie.
        `,
    },

    responses: {
        success: {
            description: 'OAuth user registered successfully',
            schema: {
                example: {
                    data: {
                        access_token:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQxMDJkYWRjLTBiMTctNGU4My04MTJiLTAwMTAzYjYwNmExZiIsImlhdCI6MTc1ODE0Nzg2OSwiZXhwIjoxNzU4MTUxNDY5fQ.DV3oA5Fn-cj-KHrGcafGaoWGyvYFx4N50L9Ke4_n6OU',
                        user: {
                            id: 'd102dadc-0b17-4e83-812b-00103b606a1f',
                            email: 'mariorafat10@gmail.com',
                            name: 'shady',
                            username: 'amira_alyaa_2024',
                            birth_date: '1990-05-15T00:00:00.000Z',
                            phone_number: '',
                            github_id: null,
                            facebook_id: null,
                            google_id: '1234567890',
                            avatar_url: 'https://lh3.googleusercontent.com/a/avatar.jpg',
                        },
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.OAUTH_USER_REGISTERED,
                },
            },
            headers: {
                'Set-Cookie': {
                    description: 'HttpOnly cookie containing refresh token',
                    schema: {
                        type: 'string',
                        example:
                            'refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict',
                    },
                },
            },
        },
    },
};

export const check_identifier_swagger = {
    operation: {
        summary: 'Check identifier availability',
        description: `
Check if an email, phone number, or username already exists in the database.

**What happens:**
1. System automatically detects the type of identifier based on format:
   - Contains '@'  treated as email
   - Contains only digits, +, -, (), spaces  treated as phone number  
   - Otherwise  treated as username
2. Searches the database for existing users with that identifier
3. Returns whether it exists and what type it was detected as

**Types of identifiers:**
- email
- phone_number
- username
        `,
    },

    responses: {
        success: {
            description: 'Identifier checked successfully',
            schema: {
                example: {
                    data: {
                        identifier_type: 'email',
                        user_id: 'd102dadc-0b17-4e83-812b-00103b606a1f',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.IDENTIFIER_AVAILABLE,
                },
            },
        },
    },
};

export const update_username_swagger = {
    operation: {
        summary: 'Update user username',
        description: `
Update the authenticated user's username.

**What happens:**
1. System validates the new username format and requirements
2. Checks if the username is already taken by another user
3. Updates the user's username in the database

**Username requirements:**
- Must be 3-30 characters long
- Can only contain letters, numbers, and underscores
- Must be unique across all users

**Authentication required:** Bearer JWT token
        `,
    },

    responses: {
        success: {
            description: 'Username updated successfully',
            schema: {
                example: {
                    data: {
                        username: 'mario_raafat123',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.USERNAME_UPDATED,
                },
            },
        },
    },
};

export const update_email_swagger = {
    operation: {
        summary: 'Send OTP to new email',
        description: 'Send OTP to the new email address for verification.',
    },

    responses: {
        success: {
            description: 'OTP sent to new email successfully',
            schema: {
                example: {
                    data: {
                        new_email: 'newemail@example.com',
                        verification_sent: true,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.EMAIL_UPDATE_INITIATED,
                },
            },
        },
    },
};

export const verify_update_email_swagger = {
    operation: {
        summary: 'Verify OTP and update email',
        description: 'Verify the OTP sent to new email and update user email address.',
    },

    responses: {
        success: {
            description: 'Email updated successfully',
            schema: {
                example: {
                    data: {
                        email: 'newemail@example.com',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.EMAIL_UPDATED,
                },
            },
        },
    },
};
