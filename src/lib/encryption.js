import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getSecretKey() {
  const secret = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text) {
  if (!text) return '';
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Encryption Decrypt Error]', err.message);
    return '';
  }
}
