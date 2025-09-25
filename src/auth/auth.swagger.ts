export const registerUserSwagger = {
  operation: {
    summary: 'Register new user',
    description:
      'Register a new user account. User will need to verify email before login.',
  },

  responses: {
    success: {
      status: 201,
      description:
        'User successfully registered. Check email for verification.',
      schema: {
        example: {
          data: {
            isEmailSent: true,
          },
          count: 1,
          message: 'User successfully registered. Check email for verification',
        },
      },
    },
    BadRequest: {
      status: 400,
      description: 'Bad request - validation errors',
      schema: {
        example: {
          message: ['email must be a valid email', 'password is too weak'],
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    },

    conflict: {
      status: 409,
      description: 'Conflict - email already exists',
      schema: {
        example: {
          message: 'Email already exists',
          error: 'Conflict',
          statusCode: 409,
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

  body: {
    description: 'email to send the OTP code',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'email',
          example: 'mario0o0o@gmail.com',
        },
      },
      required: ['email'],
    },
  },

  responses: {
    success: {
      status: 201,
      description: 'OTP generated and sent successfully',
      schema: {
        example: {
          data: {
            isEmailSent: true,
          },
          count: 1,
          message: 'Verification OTP sent to email',
        },
      },
    },

    NotFound: {
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          message: 'User not found',
          error: 'Not Found',
          statusCode: 404,
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

  body: {
    description: 'Verification data',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'email that the OTP was sent to',
          example: 'Amiraa@gmail.com',
        },
        token: {
          type: 'string',
          description: 'OTP token received in email',
          example: '123456',
        },
      },
      required: ['email', 'token'],
    },
  },

  responses: {
    success: {
      status: 200,
      description: 'Email verified successfully',
      schema: {
        example: {
          data: {
            userId: 'c8b1f8e2-3f4a-4d2a-9f0e-123456789abc',
          },
          count: 1,
          message: 'Email verified successfully',
        },
      },
    },

    BadRequest: {
      status: 400,
      description: 'Invalid or expired OTP',
      schema: {
        example: {
          message: 'Invalid or expired OTP',
          error: 'Bad Request',
          statusCode: 400,
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
      status: 200,
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
          message: 'Login Successfully!',
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

    Unauthorized: {
      status: 401,
      description: 'Unauthorized - invalid credentials',
      schema: {
        example: {
          message: 'Invalid email or password',
          error: 'Unauthorized',
          statusCode: 401,
        },
      },
    },

    Forbidden: {
      status: 403,
      description: 'Forbidden - email not verified',
      schema: {
        example: {
          message: 'Please verify your email first',
          error: 'Forbidden',
          statusCode: 403,
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
      status: 200,
      description: 'New access token generated',
      schema: {
        example: {
          data: {
            access_token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNjZTM3YjEzLWQ2ZGUtNDhjZC1iNzQ2LWRmMjY0ODQ1N2E0NiIsImlhdCI6MTc1ODE0OTI2NywiZXhwIjoxNzU4MTUyODY3fQ.M1ennV-LC8xiJpsRKCsUo9Y4o7_6mydG0SPURuNzh6I',
          },
          count: 1,
          message: 'New access token generated',
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

    BadRequest: {
      status: 400,
      description: 'Bad request - no refresh token provided',
      schema: {
        example: {
          message: 'No refresh token provided',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    },

    Unauthorized: {
      status: 401,
      description: 'Unauthorized - invalid or expired refresh token',
      schema: {
        example: {
          message: 'Invalid refresh token',
          error: 'Unauthorized',
          statusCode: 401,
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

  responses: {
    success: {
      status: 200,
      description: 'User account deleted successfully',
      schema: {
        example: {
          data: {
            message: 'User deleted successfully',
          },
          count: 1,
          message: 'Account successfully removed due to unauthorized access report',
        },
      },
    },

    Unauthorized: {
      status: 401,
      description: 'Invalid or expired not me link token',
      schema: {
        example: {
          message: 'Invalid or expired not me link',
          error: 'Unauthorized',
          statusCode: 401,
        },
      },
    },

    BadRequest: {
      status: 400,
      description: 'Account was already verified or other validation error',
      schema: {
        example: {
          message: 'Account was already verified',
          error: 'Bad Request',
          statusCode: 400,
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
      status: 200,
      description: 'Password changed successfully',
      schema: {
        example: {
          data: {
            success: true,
          },
          count: 1,
          message: 'Password changed successfully',
        },
      },
    },

    BadRequest: {
      status: 400,
      description: 'Bad request - validation errors or same password',
      schema: {
        example: {
          message: 'New password must be different from the old password',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    },

    Unauthorized: {
      status: 401,
      description: 'Unauthorized - invalid token or wrong current password',
      schema: {
        example: {
          message: 'Wrong password',
          error: 'Unauthorized',
          statusCode: 401,
        },
      },
    },

    NotFound: {
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          message: 'User not found',
          error: 'Not Found',
          statusCode: 404,
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
      status: 200,
      description: 'reCAPTCHA site key returned successfully',
      schema: {
        example: {
          data: {
            siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
          },
          count: 1,
          message: 'ReCAPTCHA site key retrieved successfully',
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
      status: 200,
      description: 'Password reset email sent successfully',
      schema: {
        example: {
          data: {
            isEmailSent: true,
          },
          count: 1,
          message: 'Password reset link sent to email',
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          message: 'User not found',
          error: 'Not Found',
          statusCode: 404,
        },
      },
    },
    InternalServerError: {
      status: 500,
      description: 'Failed to send email',
      schema: {
        example: {
          message: 'Failed to send password reset email',
          error: 'Internal Server Error',
          statusCode: 500,
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
      status: 200,
      description: 'OTP verified successfully, secure reset token generated',
      schema: {
        example: {
          data: {
            isValid: true,
            resetToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJwdXJwb3NlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE2MzIxNjE2MDAsImV4cCI6MTYzMjE2MjUwMH0...',
          },
          count: 1,
          message: 'OTP verified successfully, you can now reset your password',
        },
      },
    },
    BadRequest: {
      status: 400,
      description: 'Invalid or expired OTP',
      schema: {
        example: {
          message: 'Expired or incorrect token',
          error: 'Unprocessable Entity',
          statusCode: 422,
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          message: 'User not found',
          error: 'Not Found',
          statusCode: 404,
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
      status: 200,
      description: 'Password reset successfully',
      schema: {
        example: {
          data: {
            success: true,
          },
          count: 1,
          message: 'Password reset successfully',
        },
      },
    },
    BadRequest: {
      status: 400,
      description: 'Validation errors or new password same as current',
      schema: {
        example: {
          message: 'New password must be different from the current password',
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          message: 'User not found',
          error: 'Not Found',
          statusCode: 404,
        },
      },
    },
    UnprocessableEntity: {
      status: 422,
      description: 'Token expired or invalid',
      schema: {
        example: {
          message: 'Token has expired or is invalid',
          error: 'Unprocessable Entity',
          statusCode: 422,
        },
      },
    },
  },
};
