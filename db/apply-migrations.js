require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function applyMigrations() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying ${file}...`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    }
    console.log('All migrations applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyMigrations();
