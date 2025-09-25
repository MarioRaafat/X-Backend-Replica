import * as crypto from 'crypto';

export function generateResetPasswordOtp(size: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < size; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }

  return result;
}

export function generateVerificationOtp(size: number = 6): string {
  const max = Math.pow(10, size);
  const randomNumber = crypto.randomInt(0, max);
  return randomNumber.toString().padStart(size, '0');
}
