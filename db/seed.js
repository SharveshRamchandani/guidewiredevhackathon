const pool = require('./postgres');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cities
    await client.query(`
      INSERT INTO cities (name) VALUES
        ('Mumbai'), ('Delhi'), ('Bangalore')
      ON CONFLICT (name) DO NOTHING
    `);

    // Zones
    await client.query(`
      INSERT INTO zones (city_id, name, risk_level)
      SELECT c.id, z.name, z.risk
      FROM (VALUES
        ('Mumbai',    'Bandra',     'high'),
        ('Mumbai',    'Andheri',    'medium'),
        ('Delhi',     'Rohini',     'medium'),
        ('Delhi',     'Dwarka',     'low'),
        ('Bangalore', 'Whitefield', 'low'),
        ('Bangalore', 'Koramangala','medium')
      ) AS z(city, name, risk)
      JOIN cities c ON c.name = z.city
      ON CONFLICT (city_id, name) DO NOTHING
    `);

    // Plans
    await client.query(`
      INSERT INTO plans (name, weekly_premium, max_coverage, coverage_config) VALUES
      ('basic', 19, 1000, '{
        "heavyRain":      {"payoutPercent": 30, "maxPayout": 300},
        "poorAqi":        {"payoutPercent": 25, "maxPayout": 250},
        "heatwave":       {"payoutPercent": 20, "maxPayout": 200},
        "platformOutage": {"payoutPercent": 40, "maxPayout": 400}
      }'),
      ('standard', 35, 2000, '{
        "heavyRain":      {"payoutPercent": 50, "maxPayout": 500},
        "poorAqi":        {"payoutPercent": 40, "maxPayout": 400},
        "heatwave":       {"payoutPercent": 30, "maxPayout": 300},
        "platformOutage": {"payoutPercent": 60, "maxPayout": 600}
      }'),
      ('premium', 59, 3500, '{
        "heavyRain":      {"payoutPercent": 70, "maxPayout": 800},
        "poorAqi":        {"payoutPercent": 60, "maxPayout": 700},
        "heatwave":       {"payoutPercent": 50, "maxPayout": 600},
        "platformOutage": {"payoutPercent": 80, "maxPayout": 900}
      }')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
