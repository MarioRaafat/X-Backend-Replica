/* 
    ######################### Auth Section #########################
*/

// ------------------ REFRESH TOKEN ------------------
export const REFRESH_TOKEN_KEY = (jti: string) => `refresh:${jti}`;
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

export const REFRESH_TOKEN_OBJECT = (jti: string, id: string) => {
    return {
        key: REFRESH_TOKEN_KEY(jti),
        value: JSON.stringify({ id }),
        ttl: REFRESH_TOKEN_TTL,
    };
};

// set of JTIs
export const USER_REFRESH_TOKENS_KEY = (userId: string) => `user:${userId}:refreshTokens`;

// add JTI to the set
export const USER_REFRESH_TOKENS_ADD = (userId: string, jti: string) => ({
    key: USER_REFRESH_TOKENS_KEY(userId),
    value: jti,
    ttl: REFRESH_TOKEN_TTL,
});

export const USER_REFRESH_TOKENS_REMOVE = (userId: string, jti: string) => ({
    key: USER_REFRESH_TOKENS_KEY(userId),
    value: jti,
});


// ------------------ PENDING USER (Registration) ------------------
export const PENDING_USER_KEY = (email: string) => `user:${email}`;
export const PENDING_USER_TTL = 60 * 60; // 1 hour

export const PENDING_USER_OBJECT = (email: string, user_data: Record<string, string>) => ({
    key: PENDING_USER_KEY(email),
    value: user_data,
    ttl: PENDING_USER_TTL,
});

// ------------------ OAUTH COMPLETION SESSION ------------------
export const OAUTH_SESSION_KEY = (session_token: string) => `oauth:session:${session_token}`;
export const OAUTH_SESSION_TTL = 60 * 60; // 1 hour

export const OAUTH_SESSION_OBJECT = (session_token: string, user_data: Record<string, any>) => ({
    key: OAUTH_SESSION_KEY(session_token),
    value: {
        user_data: JSON.stringify(user_data),
        created_at: new Date().toISOString(),
    },
    ttl: OAUTH_SESSION_TTL,
});



/* 
    ######################### OTPs Section #########################
*/
export const OTP_KEY = (type: 'email' | 'password', identifier: string) => `otp:${type}:${identifier}`;

// OTPs use the default TTL (1 hour)
export const OTP_OBJECT = (type: 'email' | 'password', identifier: string, hashedToken: string, created_at: string) => ({
    key: OTP_KEY(type, identifier),
    value: {
        token: hashedToken,
        created_at,
    },
});