import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const registerUserSwagger = {
  operation: {
    summary: 'Register new user',
    description:
      'Register a new user account. User will need to verify email before login.',
  },

  responses: {
    success: {
      description:
        'User successfully registered. Check email for verification.',
      schema: {
        example: {
          data: {
            isEmailSent: true,
          },
          count: 1,
          message: SUCCESS_MESSAGES.USER_REGISTERED,
        },
      },
    },
  },
};

export const generateOTPSwagger = {
  operation: {
    summary: 'Generate email verification OTP',
    description:
      "Generate and send a new email verification OTP to the user's email.",
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

export const verifyEmailSwagger = {
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

export const loginSwagger = {
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
              firstName: 'Amira',
              lastName: 'Khalid',
              phoneNumber: '+201143126545',
              githubId: null,
              facebookId: null,
              googleId: null,
              avatarUrl: null,
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

export const refreshTokenSwagger = {
  operation: {
    summary: 'Refresh access token',
    description:
      'Use refresh token from httpOnly cookie to get a new access token.',
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

export const googleOauthSwagger = {
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
            example:
              'https://accounts.google.com/oauth/authorize?client_id=...',
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

export const googleCallbackSwagger = {
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
      description:
        'Successful authentication - redirects to frontend with token',
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

export const facebookOauthSwagger = {
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
            example:
              'https://www.facebook.com/v18.0/dialog/oauth?client_id=...',
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

export const facebookCallbackSwagger = {
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
      description:
        'Successful authentication - redirects to frontend with token',
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

export const githubOauthSwagger = {
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

export const githubCallbackSwagger = {
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
      description:
        'Successful authentication - redirects to frontend with token',
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

export const notMeSwagger = {
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

export const changePasswordSwagger = {
  operation: {
    summary: 'Change user password',
    description:
      'Change the authenticated user\'s password. Requires current password validation and JWT authentication.',
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

export const captchaSwagger = {
  operation: {
    summary: 'Get reCAPTCHA site key',
    description:
      'Returns the reCAPTCHA site key needed for frontend widget initialization.',
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

export const forgetPasswordSwagger = {
  operation: {
    summary: 'Request password reset',
    description:
      'Initiates password reset process by sending OTP to user\'s email address.',
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

export const verifyResetOtpSwagger = {
  operation: {
    summary: 'Verify password reset OTP',
    description:
      'Verifies the OTP code sent to user\'s email for password reset. Step 2 of the password reset flow. Returns a secure reset token for step 3.',
  },

  responses: {
    success: {
      description: 'OTP verified successfully, secure reset token generated',
      schema: {
        example: {
          data: {
            isValid: true,
            resetToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJwdXJwb3NlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE2MzIxNjE2MDAsImV4cCI6MTYzMjE2MjUwMH0...',
          },
          count: 1,
          message: SUCCESS_MESSAGES.OTP_VERIFIED,
        },
      },
    },
  },
};

export const resetPasswordSwagger = {
  operation: {
    summary: 'Reset password with secure token',
    description:
      `Final step of password reset flow. Changes user password using the secure reset token from step 2. 
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

export const logoutSwagger = {
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

export const logoutAllSwagger = {
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
