import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verifies a Solana signature
 * @param message - The original message that was signed (as string)
 * @param signature - The signature in base58 format
 * @param publicKey - The public key in base58 format
 * @returns true if the signature is valid
 */
export function verifySolanaSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    // Decode the signature and public key from base58
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify the signature
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Validates that a public key is valid Solana format
 * @param publicKey - The public key to validate
 * @returns true if valid
 */
export function isValidSolanaPublicKey(publicKey: string): boolean {
  try {
    new PublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a timestamp is recent (within 5 minutes)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if timestamp is within acceptable range
 */
export function validateTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const diff = Math.abs(now - timestamp);
  return diff < fiveMinutes;
}

/**
 * Creates a standardized message for signing (matches SDK expectation)
 * @param data - The data to sign
 * @returns formatted message string
 */
export function createSignatureMessage(data: Record<string, unknown>): string {
  // Simple JSON stringify for signature verification
  // The SDK should create the same format
  return JSON.stringify(data);
}

