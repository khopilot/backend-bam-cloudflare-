// Fix admin password using exact same Web Crypto API as server
import { createHash, randomBytes, pbkdf2 } from 'crypto';

async function hashPasswordWebCrypto(password) {
  // Generate 16-byte salt
  const salt = new Uint8Array(randomBytes(16));

  // Use Node.js crypto.pbkdf2 to match Web Crypto API behavior
  const passwordBuffer = Buffer.from(password, 'utf8');
  const iterations = 100000;
  const keyLength = 32; // 256 bits

  return new Promise((resolve, reject) => {
    pbkdf2(passwordBuffer, salt, iterations, keyLength, 'sha256', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }

      // Combine salt (16 bytes) + hash (32 bytes) = 48 bytes total
      const combined = new Uint8Array(48);
      combined.set(salt, 0);
      combined.set(new Uint8Array(derivedKey), 16);

      // Convert to base64 (like btoa in browser)
      const base64Hash = Buffer.from(combined).toString('base64');
      resolve(base64Hash);
    });
  });
}

async function fixAdminPassword() {
  const password = 'Admin@BAM2024';

  console.log('Generating Web Crypto API compatible password hash...');
  console.log('Password:', password);

  const hash = await hashPasswordWebCrypto(password);
  console.log('Generated hash:', hash);

  const adminId = 'c68515281a4b8e94c5ca7e0778a5aa7f'; // Existing admin ID

  console.log('\nRun this command to update the admin password:');
  console.log(`wrangler d1 execute bamflix-db --remote --command "UPDATE admins SET password_hash = '${hash}' WHERE id = '${adminId}';"`);
}

fixAdminPassword().catch(console.error);