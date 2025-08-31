import * as crypto from 'crypto';
import { Logger } from './Logger';

/**
 * EncryptionService provides AES-256-GCM encryption for sensitive data
 * Used primarily for encrypting session cookies before database storage
 */
export class EncryptionService {
  private logger: Logger;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private tagLength = 16; // 128 bits
  private saltLength = 64; // 512 bits
  private iterations = 100000; // PBKDF2 iterations
  
  // Master key from environment or generated
  private masterKey: Buffer;

  constructor() {
    this.logger = new Logger('EncryptionService');
    this.masterKey = this.initializeMasterKey();
  }

  /**
   * Initialize or retrieve the master encryption key
   */
  private initializeMasterKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey) {
      // Use provided key from environment
      const keyBuffer = Buffer.from(envKey, 'hex');
      
      if (keyBuffer.length !== this.keyLength) {
        throw new Error(`Encryption key must be exactly ${this.keyLength} bytes (${this.keyLength * 2} hex characters)`);
      }
      
      this.logger.info('Using encryption key from environment');
      return keyBuffer;
    } else {
      // Generate a new key for development (WARNING: not for production)
      const newKey = crypto.randomBytes(this.keyLength);
      this.logger.warn('Generated temporary encryption key - SET ENCRYPTION_KEY in production!');
      this.logger.warn(`Generated key (hex): ${newKey.toString('hex')}`);
      return newKey;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV and salt
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);
      
      // Derive key from master key and salt
      const key = crypto.pbkdf2Sync(this.masterKey, salt, this.iterations, this.keyLength, 'sha256');
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      
      // Get auth tag (GCM mode specific)
      const authTag = (cipher as any).getAuthTag();
      
      // Combine salt, iv, authTag, and encrypted data
      const combined = Buffer.concat([
        salt,      // 64 bytes
        iv,        // 16 bytes
        authTag,   // 16 bytes
        encrypted  // variable length
      ]);
      
      // Return base64 encoded
      const result = combined.toString('base64');
      
      this.logger.debug(`Encrypted ${plaintext.length} bytes -> ${result.length} bytes`);
      
      return result;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(encryptedData: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = combined.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);
      
      // Derive key from master key and salt
      const key = crypto.pbkdf2Sync(this.masterKey, salt, this.iterations, this.keyLength, 'sha256');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      (decipher as any).setAuthTag(authTag);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      const result = decrypted.toString('utf8');
      
      this.logger.debug(`Decrypted ${encryptedData.length} bytes -> ${result.length} bytes`);
      
      return result;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a value using SHA-256 (for non-reversible data like tokens)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Compare plaintext with hashed value (constant-time comparison)
   */
  compareHash(plaintext: string, hash: string): boolean {
    const computedHash = this.hash(plaintext);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    );
  }

  /**
   * Rotate the master key (for key rotation procedures)
   */
  rotateMasterKey(newKey: Buffer): void {
    if (newKey.length !== this.keyLength) {
      throw new Error(`New key must be exactly ${this.keyLength} bytes`);
    }
    
    this.masterKey = newKey;
    this.logger.info('Master key rotated successfully');
  }

  /**
   * Verify encryption is working correctly (self-test)
   */
  selfTest(): boolean {
    try {
      const testData = 'Hello, World! This is a test message for encryption.';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('Decrypted data does not match original');
      }
      
      // Test that encrypted data is different each time (due to random IV/salt)
      const encrypted2 = this.encrypt(testData);
      if (encrypted === encrypted2) {
        throw new Error('Encryption is not using random IV/salt');
      }
      
      // But both should decrypt to same value
      const decrypted2 = this.decrypt(encrypted2);
      if (decrypted2 !== testData) {
        throw new Error('Second decryption failed');
      }
      
      this.logger.info('Encryption self-test passed ✓');
      return true;
    } catch (error) {
      this.logger.error('Encryption self-test failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();