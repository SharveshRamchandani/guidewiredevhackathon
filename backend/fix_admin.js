require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./src/config/db');

async function fix() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('New Hash:', hash);
  await query("UPDATE admins SET password_hash = $1 WHERE email = 'admin@gigshield.com'", [hash]);
  console.log('Admin password updated successfully.');
  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
