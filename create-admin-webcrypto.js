// Script to create admin user with Web Crypto API compatible hash
import crypto from 'crypto';

async function hashPasswordWebCrypto(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate salt (16 bytes)
  const salt = crypto.randomBytes(16);

  // Use PBKDF2 with same parameters as server
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);

      // Combine salt and hash, then convert to base64
      const combined = Buffer.concat([salt, derivedKey]);
      const base64Hash = combined.toString('base64');

      resolve(base64Hash);
    });
  });
}

async function createAdmin() {
  const email = 'admin@bam.com.kh';
  const password = 'Admin@BAM2024';
  const name = 'Super Admin';
  const role = 'super_admin';

  console.log('Creating admin user...');
  console.log('Email:', email);
  console.log('Password:', password);

  const passwordHash = await hashPasswordWebCrypto(password);
  console.log('\nGenerated password hash (base64):', passwordHash);

  const adminId = crypto.randomBytes(16).toString('hex');
  console.log('Admin ID:', adminId);

  console.log('\n=== Run these commands to insert the admin ===\n');
  console.log(`wrangler d1 execute bamflix-db --remote --command "DELETE FROM admins WHERE email = '${email}';"`);
  console.log(`wrangler d1 execute bamflix-db --remote --command "INSERT INTO admins (id, email, password_hash, name, role, is_active) VALUES ('${adminId}', '${email}', '${passwordHash}', '${name}', '${role}', 1);"`);
}

createAdmin().catch(console.error);