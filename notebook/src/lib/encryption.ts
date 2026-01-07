/**
 * Encryption utilities for secure notes using AES-256-GCM
 * Uses Web Crypto API for secure encryption/decryption
 */

// Convert string to ArrayBuffer
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
};

// Convert ArrayBuffer to string  
const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
};

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Derive a key from password using PBKDF2
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Generate random bytes
const generateRandomBytes = (length: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(length));
};

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  salt: string; // Base64 encoded
  version: number;
}

/**
 * Encrypt content using AES-256-GCM
 */
export const encryptContent = async (content: string, password: string): Promise<EncryptedData> => {
  const salt = generateRandomBytes(16);
  const iv = generateRandomBytes(12);
  const key = await deriveKey(password, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    stringToArrayBuffer(content)
  );
  
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    version: 1,
  };
};

/**
 * Decrypt content using AES-256-GCM
 */
export const decryptContent = async (data: EncryptedData, password: string): Promise<string> => {
  const salt = new Uint8Array(base64ToArrayBuffer(data.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(data.iv));
  const ciphertext = base64ToArrayBuffer(data.ciphertext);
  
  const key = await deriveKey(password, salt);
  
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext
    );
    
    return arrayBufferToString(decrypted);
  } catch (e) {
    throw new Error('Decryption failed. Wrong password or corrupted data.');
  }
};

/**
 * Check if content appears to be encrypted
 */
export const isEncryptedContent = (content: string): boolean => {
  try {
    const parsed = JSON.parse(content);
    return (
      parsed.ciphertext &&
      parsed.iv &&
      parsed.salt &&
      parsed.version === 1
    );
  } catch {
    return false;
  }
};

/**
 * Parse encrypted content from string
 */
export const parseEncryptedContent = (content: string): EncryptedData | null => {
  try {
    const parsed = JSON.parse(content);
    if (isEncryptedContent(content)) {
      return parsed as EncryptedData;
    }
  } catch {
    // Not JSON
  }
  return null;
};

/**
 * Serialize encrypted data to string for storage
 */
export const serializeEncryptedData = (data: EncryptedData): string => {
  return JSON.stringify(data);
};

// Password strength checker
export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  suggestions: string[];
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const suggestions: string[] = [];
  
  if (password.length >= 8) score++;
  else suggestions.push('Use at least 8 characters');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('Mix uppercase and lowercase letters');
  
  if (/\d/.test(password)) score++;
  else suggestions.push('Include numbers');
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else suggestions.push('Add special characters');
  
  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    suggestions: score < 3 ? suggestions : [],
  };
};
