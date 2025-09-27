// Script to create initial admin user with hashed password
// Run this script locally to generate the password hash

import crypto from 'crypto';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.randomBytes(16).toString('hex');
  const keyMaterial = encoder.encode(password + salt);

  // Using PBKDF2 with 100,000 iterations
  const iterations = 100000;
  const keyLength = 32;

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else {
        const hash = derivedKey.toString('hex');
        resolve(`${salt}:${hash}`);
      }
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

  const passwordHash = await hashPassword(password);
  console.log('\nGenerated password hash:', passwordHash);

  const adminId = crypto.randomBytes(16).toString('hex');
  console.log('Admin ID:', adminId);

  console.log('\n=== SQL Command to execute ===\n');

  const sql = `
DELETE FROM admins WHERE email = '${email}';
INSERT INTO admins (id, email, password_hash, name, role, is_active)
VALUES ('${adminId}', '${email}', '${passwordHash}', '${name}', '${role}', 1);
`;

  console.log(sql);

  console.log('\n=== Run this command to insert the admin ===\n');
  console.log(`wrangler d1 execute bamflix-db --remote --command "DELETE FROM admins WHERE email = '${email}';"`);
  console.log(`wrangler d1 execute bamflix-db --remote --command "INSERT INTO admins (id, email, password_hash, name, role, is_active) VALUES ('${adminId}', '${email}', '${passwordHash}', '${name}', '${role}', 1);"`);
}

createAdmin().catch(console.error);