const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:root@localhost:5432/gigshield' });

client.connect().then(() => {
    return client.query('SELECT id, name, plan_id FROM workers LIMIT 10');
}).then(res => {
    console.log("WORKERS:", JSON.stringify(res.rows, null, 2));
    return client.query('SELECT id, name FROM plans');
}).then(res => {
    console.log("PLANS:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
