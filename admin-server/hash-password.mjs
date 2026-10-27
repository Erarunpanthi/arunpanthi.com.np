#!/usr/bin/env node
/* Generates a PBKDF2 hash for ADMIN_PASSWORD_HASH.
 *
 *   node admin-server/hash-password.mjs "my strong password"
 *   npm --prefix admin-server run hash-password
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashPassword } from './lib/auth.js';

let password = process.argv[2];
if (!password) {
  const rl = createInterface({ input: stdin, output: stdout });
  password = await rl.question('New admin password: ');
  rl.close();
}

if (!password || password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

console.log('\nAdd this line to admin-server/.env:\n');
console.log('ADMIN_PASSWORD_HASH=' + (await hashPassword(password)));
console.log('');
