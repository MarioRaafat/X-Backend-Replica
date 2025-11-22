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
export const USER_REFRESH_TOKENS_KEY = (user_id: string) => `user:${user_id}:refreshTokens`;

// add JTI to the set
export const USER_REFRESH_TOKENS_ADD = (user_id: string, jti: string) => ({
    key: USER_REFRESH_TOKENS_KEY(user_id),
    value: jti,
    ttl: REFRESH_TOKEN_TTL,
});

export const USER_REFRESH_TOKENS_REMOVE = (user_id: string, jti: string) => ({
    key: USER_REFRESH_TOKENS_KEY(user_id),
    value: jti,
});

// ------------------ SIGNUP SESSION (Multi-stage signup) ------------------
export const SIGNUP_SESSION_KEY = (email: string) => `signup:session:${email}`;
export const SIGNUP_SESSION_TTL = 60 * 60; // 1 hour

export const SIGNUP_SESSION_OBJECT = (email: string, session_data: Record<string, any>) => ({
    key: SIGNUP_SESSION_KEY(email),
    value: session_data,
    ttl: SIGNUP_SESSION_TTL,
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

// ------------------ OAUTH EXCHANGE TOKEN (One-time use tokens) ------------------
export const OAUTH_EXCHANGE_TOKEN_KEY = (exchange_token: string) =>
    `oauth:exchange:${exchange_token}`;
export const OAUTH_EXCHANGE_TOKEN_TTL = 5 * 60; // 5 minutes - short-lived for security

export const OAUTH_EXCHANGE_TOKEN_OBJECT = (
    exchange_token: string,
    payload: { user_id?: string; session_token?: string; type: 'auth' | 'completion' }
) => ({
    key: OAUTH_EXCHANGE_TOKEN_KEY(exchange_token),
    value: JSON.stringify(payload),
    ttl: OAUTH_EXCHANGE_TOKEN_TTL,
});

/* 
    ######################### OTPs Section #########################
*/
export const OTP_KEY = (type: 'email' | 'password', identifier: string) =>
    `otp:${type}:${identifier}`;

// OTPs use the default TTL (1 hour)
export const OTP_OBJECT = (
    type: 'email' | 'password',
    identifier: string,
    hashed_token: string,
    created_at: string
) => ({
    key: OTP_KEY(type, identifier),
    value: {
        token: hashed_token,
        created_at,
    },
});
