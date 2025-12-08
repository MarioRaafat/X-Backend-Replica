import * as crypto from 'crypto';

/**
 * Utility script to generate a secure encryption key for message encryption
 *
 * Usage: npm run generate-encryption-key
 *        or: node dist/shared/services/encryption/generate-encryption-key.js
 *
 * This will generate a secure 64-character hex string.
 * Copy the output and add it to your .env file as:
 * ENCRYPTION_KEY=your-generated-key-here
 */

function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

console.log('🔐 Generating a secure encryption key...\n');

const encryption_key = generateEncryptionKey();

console.log('✅ Encryption key generated successfully!\n');
console.log('📋 Add this to your .env file:\n');
console.log(`ENCRYPTION_KEY=${encryption_key}\n`);
console.log('⚠️  Keep this key secure and never commit it to version control!\n');
