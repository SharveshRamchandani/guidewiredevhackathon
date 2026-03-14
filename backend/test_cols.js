require('dotenv').config({path: './.env'});
const db = require('./src/config/db');
db.query('SELECT id, name, plan_id FROM workers')
  .then(r => { console.log(r.rows); process.exit(0); })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
