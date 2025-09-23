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
            emailSuccess: true,
            userId: 'cce37b13-d6de-48cd-b746-df2648457a46',
            message: 'User registered successfully',
            id: 'cce37b13-d6de-48cd-b746-df2648457a46',
            email: 'amirakhaled928@gmail.com',
            firstName: 'Amira',
            lastName: 'Khalid',
            phoneNumber: '+201143126545',
            verified: false,
            githubId: null,
            facebookId: null,
            googleId: null,
            avatarUrl: null,
            provider: 'local',
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

  params: {
    name: 'userId',
    description: 'User ID to generate OTP for',
    type: 'string',
    example: '62dd7691-a048-46e4-8579-43278e1a35b6',
  },

  responses: {
    success: {
      status: 201,
      description: 'OTP generated and sent successfully',
      schema: {
        example: {
          data: {
            success: true,
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
    description: 'Verify user email using the OTP sent to their email address.',
  },
  body: {
    description: 'Verification data',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID',
          example: 'f3199dfb-8eaf-49c1-b07d-b532d6bfb3f1',
        },
        token: {
          type: 'string',
          description: 'OTP token received in email',
          example: '123456',
        },
      },
      required: ['userId', 'token'],
    },
  },

  responses: {
    success: {
      status: 200,
      description: 'Email verified successfully',
      schema: {
        example: {
          data: {
            success: true,
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
              verified: false,
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
          siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
        },
      },
    },
  },
};
