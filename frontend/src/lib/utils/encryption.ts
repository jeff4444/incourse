import CryptoJS from 'crypto-js';

// Encryption key - should be stored in environment variables
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'incourse-default-encryption-key-2024';

/**
 * Encrypts a string using AES encryption
 * @param text - The text to encrypt
 * @returns The encrypted string
 */
export function encryptApiKey(text: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting API key:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypts a string using AES decryption
 * @param encryptedText - The encrypted text to decrypt
 * @returns The decrypted string
 */
export function decryptApiKey(encryptedText: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting API key:', error);
    throw new Error('Failed to decrypt API key');
  }
}
