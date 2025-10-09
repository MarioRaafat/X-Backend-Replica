/* 
    ######################### Auth Section #########################
*/

// ------------------ REFRESH TOKEN ------------------
export const REFRESH_TOKEN_KEY = (jti: string) => `refresh:${jti}`;

export const REFRESH_TOKEN_OBJECT = (jti: string, id: string, ttl: number) => {
    return {
        key: REFRESH_TOKEN_KEY(jti),
        value: JSON.stringify({ id }),
        ttl,
    };
};

// set of JTIs
export const USER_REFRESH_TOKENS_KEY = (userId: string) => `user:${userId}:refreshTokens`;

// add JTI to the set
export const USER_REFRESH_TOKENS_ADD = (userId: string, jti: string, ttl: number) => ({
    key: USER_REFRESH_TOKENS_KEY(userId),
    value: jti,
    ttl,
});

export const USER_REFRESH_TOKENS_REMOVE = (userId: string, jti: string) => ({
    key: USER_REFRESH_TOKENS_KEY(userId),
    value: jti,
});


// ------------------ PENDING USER (Registration) ------------------
export const PENDING_USER_KEY = (email: string) => `user:${email}`;

export const PENDING_USER_OBJECT = (email: string, userData: Record<string, string>, ttl: number) => ({
    key: PENDING_USER_KEY(email),
    value: userData,
    ttl,
});




/* 
    ######################### OTPs Section #########################
*/
export const OTP_KEY = (type: 'email' | 'password', identifier: string) => `otp:${type}:${identifier}`;

export const OTP_OBJECT = (type: 'email' | 'password', identifier: string, hashedToken: string, createdAt: string) => ({
    key: OTP_KEY(type, identifier),
    value: {
        token: hashedToken,
        createdAt,
    },
});