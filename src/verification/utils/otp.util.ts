import * as crypto from 'crypto';

export function generateRandomOtp(size: number = 8): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < size; i++) {
        const random_index = crypto.randomInt(0, characters.length);
        result += characters[random_index];
    }

    return result;
}