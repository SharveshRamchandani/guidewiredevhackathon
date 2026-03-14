const { query } = require('./src/config/db');
require('dotenv').config();

async function checkSchema() {
  const tables = ['workers', 'plans', 'policies', 'disruption_events', 'claims', 'payouts'];
  for (const table of tables) {
    console.log(`\n--- Schema for table: ${table} ---`);
    try {
      const { rows } = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    } catch (e) {
      console.error(`Error checking ${table}: ${e.message}`);
    }
  }
  process.exit(0);
}

checkSchema();
