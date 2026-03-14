const fs = require('fs');
require('dotenv').config();
const { query } = require('./src/config/db');

async function run() {
  try {
    const plansResult = await query('SELECT id, name FROM plans');
    const workersResult = await query('SELECT id, name, plan_id FROM workers');
    const output = `Plans: ${JSON.stringify(plansResult.rows, null, 2)}\nWorkers: ${JSON.stringify(workersResult.rows, null, 2)}`;
    fs.writeFileSync('db_dump.txt', output);
    console.log('Dumped to db_dump.txt');
    process.exit(0);
  } catch(e) {
    fs.writeFileSync('db_dump.txt', 'Error: ' + e.message);
    process.exit(1);
  }
}
run();
