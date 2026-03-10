const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({ connectionString: 'postgres://postgres:pg%401010@localhost:5432/gigshield' });

async function runPending() {
    await client.connect();
    try {
        // Run 001 and 002 update
        const q1 = `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);`;
        await client.query(q1);
        console.log("Added job_title to admin_users");

        // Drop the multi-tenant columns
        const q2 = `
      ALTER TABLE admin_users DROP COLUMN IF EXISTS company_name CASCADE;
      ALTER TABLE admin_users DROP COLUMN IF EXISTS company_reg_number CASCADE;
      ALTER TABLE admin_users DROP COLUMN IF EXISTS registration_code CASCADE;
    `;
        await client.query(q2);
        console.log("Dropped old admin columns");

        const q3 = `
      ALTER TABLE workers DROP COLUMN IF EXISTS admin_id CASCADE;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS city VARCHAR(50);
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS zone_id INT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS avg_weekly_earning DECIMAL(8,2);
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    `;
        await client.query(q3);
        console.log("Added new worker columns and dropped admin_id");

        // Also try renaming old columns if they exist
        try { await client.query('ALTER TABLE workers RENAME COLUMN city_id TO city'); } catch (e) { }
        try { await client.query('ALTER TABLE workers RENAME COLUMN zone_id_int TO zone_id'); } catch (e) { }
        try { await client.query('ALTER TABLE workers RENAME COLUMN upi TO upi_id'); } catch (e) { }
        try { await client.query('ALTER TABLE workers RENAME COLUMN is_active TO active'); } catch (e) { }
        try { await client.query('ALTER TABLE workers RENAME COLUMN weekly_earnings TO avg_weekly_earning'); } catch (e) { }
        try { await client.query('ALTER TABLE workers ALTER COLUMN city TYPE VARCHAR(50)'); } catch (e) { }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

runPending();
