require('dotenv').config();
const { query, testConnection } = require('./src/config/db');

async function checkSchema() {
  console.log('--- Starting Schema Check ---');
  const connected = await testConnection();
  if (!connected) {
    console.error('FAILED TO CONNECT');
    process.exit(1);
  }

  const tables = ['workers', 'plans', 'policies', 'disruption_events', 'claims', 'payouts'];
  for (const table of tables) {
    console.log(`\n[${table.toUpperCase()}]`);
    try {
      const { rows } = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY column_name
      `, [table]);
      if (rows.length === 0) {
        console.log('  !! Table not found or no columns !!');
      }
      rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
    } catch (e) {
      console.error(`  !! Error checking ${table}: ${e.message}`);
    }
  }
  process.exit(0);
}

checkSchema().catch(err => {
    console.error('UNEXPECTED ERROR:', err);
    process.exit(1);
});
