-- ============================================================
-- GigShield — Complete SQL Seed File
-- Run this directly in pgAdmin Query Tool
-- ============================================================

BEGIN;

-- CLEAR ALL TABLES (reverse FK order)
TRUNCATE TABLE audit_logs, payouts, claims, disruption_events,
  policies, workers, admins, system_config, plans, zones, cities
RESTART IDENTITY CASCADE;

-- ─────────────────────────────────────────
-- 1. CITIES
-- ─────────────────────────────────────────
INSERT INTO cities (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Mumbai'),
  ('22222222-2222-2222-2222-222222222222', 'Delhi'),
  ('33333333-3333-3333-3333-333333333333', 'Bangalore')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────
-- 2. ZONES
-- ─────────────────────────────────────────
INSERT INTO zones (id, city_id, name, risk_level) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Bandra',      'low'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Powai',       'medium'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Navi Mumbai', 'high'),
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Rohini',      'medium'),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Dwarka',      'low'),
  ('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'Saket',       'high'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Whitefield',  'high'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'MG Road',     'medium'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Hebbal',      'low')
ON CONFLICT (city_id, name) DO NOTHING;

-- ─────────────────────────────────────────
-- 3. PLANS
-- ─────────────────────────────────────────
INSERT INTO plans (id, name, weekly_premium, max_coverage, coverage_config) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'basic', 19.00, 1000.00,
    '{"heavyRain":{"payoutPercent":50,"maxPayout":500},"poorAqi":{"payoutPercent":40,"maxPayout":400},"heatwave":{"payoutPercent":30,"maxPayout":300},"platformOutage":{"payoutPercent":60,"maxPayout":600}}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'standard', 35.00, 2000.00,
    '{"heavyRain":{"payoutPercent":50,"maxPayout":1000},"poorAqi":{"payoutPercent":40,"maxPayout":800},"heatwave":{"payoutPercent":30,"maxPayout":600},"platformOutage":{"payoutPercent":60,"maxPayout":1200}}'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'premium', 59.00, 3500.00,
    '{"heavyRain":{"payoutPercent":50,"maxPayout":1750},"poorAqi":{"payoutPercent":40,"maxPayout":1400},"heatwave":{"payoutPercent":30,"maxPayout":1050},"platformOutage":{"payoutPercent":60,"maxPayout":2100}}')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────
-- 4. ADMINS (password: admin123)
-- ─────────────────────────────────────────
INSERT INTO admins (id, email, password_hash, name, role) VALUES
  ('addddddd-dddd-dddd-dddd-dddddddddddd', 'admin@gigshield.com',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Super Admin',   'super_admin'),
  ('addddddd-dddd-dddd-dddd-eeeeeeeeeeee', 'admin2@gigshield.com',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin User',    'admin'),
  ('addddddd-dddd-dddd-dddd-ffffffffffff', 'support@gigshield.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Support Staff', 'support')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────
-- 5. WORKERS
-- ─────────────────────────────────────────
INSERT INTO workers (id, phone, name, platform, city_id, zone_id, weekly_earnings, aadhaar_last4, upi, kyc_status, risk_level, notifications, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', '9876543210', 'Ramesh Kumar',    'Swiggy',  '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 5500.00, '1234', 'ramesh@upi',  'verified', 'low',    '{"sms":true,"push":true,"whatsapp":false}', true),
  ('00000000-0000-0000-0000-000000000002', '9876543211', 'Sita Devi',       'Zomato',  '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 4800.00, '5678', 'sita@upi',    'verified', 'medium', '{"sms":true,"push":true,"whatsapp":true}',  true),
  ('00000000-0000-0000-0000-000000000003', '9876543212', 'Amit Singh',      'Amazon',  '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 6200.00, '9012', 'amit@upi',    'pending',  'high',   '{"sms":true,"push":false,"whatsapp":false}',true),
  ('00000000-0000-0000-0000-000000000004', '9876543213', 'Priya Sharma',    'Zepto',   '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4200.00, '3456', 'priya@upi',   'verified', 'low',    '{"sms":true,"push":true,"whatsapp":true}',  true),
  ('00000000-0000-0000-0000-000000000005', '9876543214', 'Vijay Reddy',     'Blinkit', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5100.00, '7890', 'vijay@upi',   'verified', 'medium', '{"sms":true,"push":true,"whatsapp":false}', true),
  ('00000000-0000-0000-0000-000000000006', '9876543215', 'Fatima Begum',    'Dunzo',   '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 3900.00, '2345', 'fatima@upi',  'pending',  'high',   '{"sms":false,"push":true,"whatsapp":false}',true),
  ('00000000-0000-0000-0000-000000000007', '9876543216', 'Rahul Gupta',     'Swiggy',  '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 5800.00, '6789', 'rahul@upi',   'verified', 'low',    '{"sms":true,"push":true,"whatsapp":true}',  true),
  ('00000000-0000-0000-0000-000000000008', '9876543217', 'Anjali Paul',     'Zomato',  '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 4600.00, '0123', 'anjali@upi',  'verified', 'medium', '{"sms":true,"push":true,"whatsapp":false}', true),
  ('00000000-0000-0000-0000-000000000009', '9876543218', 'Mohammad Khan',   'Amazon',  '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 5300.00, '4567', 'khan@upi',    'pending',  'low',    '{"sms":true,"push":false,"whatsapp":true}', true),
  ('00000000-0000-0000-0000-000000000010', '9876543219', 'Lakshmi Narayan', 'Zepto',   '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4100.00, '8901', 'lakshmi@upi', 'verified', 'high',   '{"sms":true,"push":true,"whatsapp":false}', true)
ON CONFLICT (phone) DO NOTHING;

-- ─────────────────────────────────────────
-- 6. POLICIES
-- ─────────────────────────────────────────
INSERT INTO policies (id, policy_number, worker_id, plan_id, premium, max_coverage, status, auto_renew, start_date, end_date, coverage_snapshot) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'POL-2026-0001', '00000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 19.00, 1000.00, 'active',    true,  CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":500},"poorAqi":{"payoutPercent":40,"maxPayout":400},"heatwave":{"payoutPercent":30,"maxPayout":300},"platformOutage":{"payoutPercent":60,"maxPayout":600}}'),
  ('b2222222-2222-2222-2222-222222222222', 'POL-2026-0002', '00000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 35.00, 2000.00, 'active',    true,  CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":1000},"poorAqi":{"payoutPercent":40,"maxPayout":800},"heatwave":{"payoutPercent":30,"maxPayout":600},"platformOutage":{"payoutPercent":60,"maxPayout":1200}}'),
  ('b3333333-3333-3333-3333-333333333333', 'POL-2026-0003', '00000000-0000-0000-0000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 59.00, 3500.00, 'active',    false, CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days',  '{"heavyRain":{"payoutPercent":50,"maxPayout":1750},"poorAqi":{"payoutPercent":40,"maxPayout":1400},"heatwave":{"payoutPercent":30,"maxPayout":1050},"platformOutage":{"payoutPercent":60,"maxPayout":2100}}'),
  ('b4444444-4444-4444-4444-444444444444', 'POL-2026-0004', '00000000-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 19.00, 1000.00, 'expired',   true,  CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":500},"poorAqi":{"payoutPercent":40,"maxPayout":400},"heatwave":{"payoutPercent":30,"maxPayout":300},"platformOutage":{"payoutPercent":60,"maxPayout":600}}'),
  ('b5555555-5555-5555-5555-555555555555', 'POL-2026-0005', '00000000-0000-0000-0000-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 35.00, 2000.00, 'active',    true,  CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":1000},"poorAqi":{"payoutPercent":40,"maxPayout":800},"heatwave":{"payoutPercent":30,"maxPayout":600},"platformOutage":{"payoutPercent":60,"maxPayout":1200}}'),
  ('b6666666-6666-6666-6666-666666666666', 'POL-2026-0006', '00000000-0000-0000-0000-000000000006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 59.00, 3500.00, 'active',    false, CURRENT_DATE - INTERVAL '5 days',  CURRENT_DATE + INTERVAL '25 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":1750},"poorAqi":{"payoutPercent":40,"maxPayout":1400},"heatwave":{"payoutPercent":30,"maxPayout":1050},"platformOutage":{"payoutPercent":60,"maxPayout":2100}}'),
  ('b7777777-7777-7777-7777-777777777777', 'POL-2026-0007', '00000000-0000-0000-0000-000000000007', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 35.00, 2000.00, 'cancelled', true,  CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":1000},"poorAqi":{"payoutPercent":40,"maxPayout":800},"heatwave":{"payoutPercent":30,"maxPayout":600},"platformOutage":{"payoutPercent":60,"maxPayout":1200}}'),
  ('b8888888-8888-8888-8888-888888888888', 'POL-2026-0008', '00000000-0000-0000-0000-000000000008', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 59.00, 3500.00, 'active',    true,  CURRENT_DATE - INTERVAL '8 days',  CURRENT_DATE + INTERVAL '22 days', '{"heavyRain":{"payoutPercent":50,"maxPayout":1750},"poorAqi":{"payoutPercent":40,"maxPayout":1400},"heatwave":{"payoutPercent":30,"maxPayout":1050},"platformOutage":{"payoutPercent":60,"maxPayout":2100}}')
ON CONFLICT (policy_number) DO NOTHING;

-- ─────────────────────────────────────────
-- 7. DISRUPTION EVENTS
-- ─────────────────────────────────────────
INSERT INTO disruption_events (id, event_number, type, zone_id, city_id, severity, value, source, verified, claims_generated, triggered_at) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'EVT-001', 'Heavy Rain',      '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'high',     '85mm',    'weather',  true,  3, NOW() - INTERVAL '2 days'),
  ('e2222222-2222-2222-2222-222222222222', 'EVT-002', 'Poor AQI',        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'critical', 'AQI 342', 'aqi',      true,  5, NOW() - INTERVAL '4 days'),
  ('e3333333-3333-3333-3333-333333333333', 'EVT-003', 'Heatwave',        '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'medium',   '44°C',    'weather',  true,  2, NOW() - INTERVAL '6 days'),
  ('e4444444-4444-4444-4444-444444444444', 'EVT-004', 'Platform Outage', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'high',     '3.5 hrs', 'platform', false, 0, NOW() - INTERVAL '1 day'),
  ('e5555555-5555-5555-5555-555555555555', 'EVT-005', 'Heavy Rain',      '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'low',      '25mm',    'weather',  false, 1, NOW() - INTERVAL '8 days'),
  ('e6666666-6666-6666-6666-666666666666', 'EVT-006', 'Poor AQI',        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'high',     'AQI 310', 'aqi',      true,  4, NOW() - INTERVAL '10 days'),
  ('e7777777-7777-7777-7777-777777777777', 'EVT-007', 'Heatwave',        '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'critical', '47°C',    'manual',   true,  2, NOW() - INTERVAL '5 days')
ON CONFLICT (event_number) DO NOTHING;

-- ─────────────────────────────────────────
-- 8. CLAIMS (5 approved, 3 pending, 2 rejected)
-- ─────────────────────────────────────────
INSERT INTO claims (id, claim_number, worker_id, policy_id, event_id, type, amount, approved_amount, status, fraud_score, gps_match, velocity, rejection_reason, processed_at, created_at) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'CLM-0001', '00000000-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'Heavy Rain',      500.00,  450.00, 'approved', 15.50, true,  0.5, NULL,                                       NOW() - INTERVAL '1 day',  NOW() - INTERVAL '2 days'),
  ('c2222222-2222-2222-2222-222222222222', 'CLM-0002', '00000000-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'Poor AQI',        800.00,  720.00, 'approved', 22.00, true,  0.3, NULL,                                       NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'),
  ('c3333333-3333-3333-3333-333333333333', 'CLM-0003', '00000000-0000-0000-0000-000000000003', 'b3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333333', 'Heatwave',        450.00,  400.00, 'approved', 18.75, true,  0.2, NULL,                                       NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days'),
  ('c4444444-4444-4444-4444-444444444444', 'CLM-0004', '00000000-0000-0000-0000-000000000005', 'b5555555-5555-5555-5555-555555555555', 'e4444444-4444-4444-4444-444444444444', 'Platform Outage', 1200.00, 1100.00,'approved', 28.00, true,  0.4, NULL,                                       NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
  ('c5555555-5555-5555-5555-555555555555', 'CLM-0005', '00000000-0000-0000-0000-000000000006', 'b6666666-6666-6666-6666-666666666666', 'e5555555-5555-5555-5555-555555555555', 'Heavy Rain',      480.00,  420.00, 'approved', 12.00, true,  0.1, NULL,                                       NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),
  ('c6666666-6666-6666-6666-666666666666', 'CLM-0006', '00000000-0000-0000-0000-000000000004', 'b1111111-1111-1111-1111-111111111111', 'e6666666-6666-6666-6666-666666666666', 'Poor AQI',        560.00,  NULL,   'pending',  45.00, true,  0.6, NULL,                                       NULL,                      NOW() - INTERVAL '1 day'),
  ('c7777777-7777-7777-7777-777777777777', 'CLM-0007', '00000000-0000-0000-0000-000000000007', 'b7777777-7777-7777-7777-777777777777', 'e7777777-7777-7777-7777-777777777777', 'Heatwave',        320.00,  NULL,   'pending',  52.00, true,  0.8, NULL,                                       NULL,                      NOW() - INTERVAL '12 hours'),
  ('c8888888-8888-8888-8888-888888888888', 'CLM-0008', '00000000-0000-0000-0000-000000000008', 'b8888888-8888-8888-8888-888888888888', 'e1111111-1111-1111-1111-111111111111', 'Platform Outage', 840.00,  NULL,   'pending',  38.00, false, 0.4, NULL,                                       NULL,                      NOW() - INTERVAL '6 hours'),
  ('c9999999-9999-9999-9999-999999999999', 'CLM-0009', '00000000-0000-0000-0000-000000000009', 'b3333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', 'Heavy Rain',      500.00,  0.00,   'rejected', 75.00, false, 2.5, 'GPS zone mismatch - fraud suspected',      NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000000000', 'CLM-0010', '00000000-0000-0000-0000-000000000010', 'b8888888-8888-8888-8888-888888888888', 'e3333333-3333-3333-3333-333333333333', 'Poor AQI',        800.00,  0.00,   'rejected', 82.00, false, 3.2, 'High claim velocity - automated rejection', NOW() - INTERVAL '7 days', NOW() - INTERVAL '8 days')
ON CONFLICT (claim_number) DO NOTHING;

-- ─────────────────────────────────────────
-- 9. PAYOUTS (4 completed, 1 processing, 1 failed)
-- ─────────────────────────────────────────
INSERT INTO payouts (id, payout_number, claim_id, worker_id, amount, status, upi, initiated_at, completed_at, failure_reason) VALUES
  ('da111111-1111-1111-1111-111111111111', 'PAY-0001', 'c1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 450.00,  'completed',  'ramesh@upi',  NOW() - INTERVAL '1 day',  NOW() - INTERVAL '20 hours', NULL),
  ('da222222-2222-2222-2222-222222222222', 'PAY-0002', 'c2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 720.00,  'completed',  'sita@upi',    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',   NULL),
  ('da333333-3333-3333-3333-333333333333', 'PAY-0003', 'c3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 400.00,  'completed',  'amit@upi',    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days',   NULL),
  ('da444444-4444-4444-4444-444444444444', 'PAY-0004', 'c4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000005', 1100.00, 'completed',  'vijay@upi',   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',   NULL),
  ('da555555-5555-5555-5555-555555555555', 'PAY-0005', 'c5555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000006', 420.00,  'processing', 'fatima@upi',  NOW() - INTERVAL '4 days', NULL,                        NULL),
  ('da666666-6666-6666-6666-666666666666', 'PAY-0006', 'c9999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000009', 0.00,    'failed',     'invalid@upi', NOW() - INTERVAL '7 days', NULL,                        'Invalid UPI address')
ON CONFLICT (payout_number) DO NOTHING;

-- ─────────────────────────────────────────
-- 10. SYSTEM CONFIG
-- ─────────────────────────────────────────
INSERT INTO system_config (id, engine_active, check_interval_minutes, payout_delay_seconds, zone_overrides, thresholds) VALUES
  ('dc111111-1111-1111-1111-111111111111', true, 10, 30,
    '[{"zone_id":"44444444-4444-4444-4444-444444444444","threshold_multiplier":0.8},{"zone_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","threshold_multiplier":0.9}]',
    '{"rainMm":20,"aqi":300,"heatwaveTemp":42,"outageHours":2}')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 11. AUDIT LOGS
-- ─────────────────────────────────────────
INSERT INTO audit_logs (id, user_id, user_type, action, field, old_value, new_value, ip_address, created_at) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'addddddd-dddd-dddd-dddd-dddddddddddd', 'admin', 'APPROVE_CLAIM',    'status',                 'pending', 'approved', '192.168.1.100', NOW() - INTERVAL '1 day'),
  ('a2222222-2222-2222-2222-222222222222', 'addddddd-dddd-dddd-dddd-eeeeeeeeeeee', 'admin', 'REJECT_CLAIM',     'status',                 'pending', 'rejected', '192.168.1.101', NOW() - INTERVAL '3 days'),
  ('a3333333-3333-3333-3333-333333333333', 'addddddd-dddd-dddd-dddd-dddddddddddd', 'admin', 'ENGINE_TOGGLE',    'engine_active',           'false',   'true',     '192.168.1.102', NOW() - INTERVAL '5 days'),
  ('a4444444-4444-4444-4444-444444444444', 'addddddd-dddd-dddd-dddd-dddddddddddd', 'admin', 'UPDATE_CONFIG',    'check_interval_minutes',  '15',      '10',       '192.168.1.100', NOW() - INTERVAL '7 days'),
  ('a5555555-5555-5555-5555-555555555555', 'addddddd-dddd-dddd-dddd-eeeeeeeeeeee', 'admin', 'VERIFY_EVENT',     'verified',                'false',   'true',     '192.168.1.103', NOW() - INTERVAL '8 days'),
  ('a6666666-6666-6666-6666-666666666666', 'addddddd-dddd-dddd-dddd-dddddddddddd', 'admin', 'UPDATE_THRESHOLD', 'rainMm',                  '25',      '20',       '192.168.1.101', NOW() - INTERVAL '10 days'),
  ('a7777777-7777-7777-7777-777777777777', 'addddddd-dddd-dddd-dddd-ffffffffffff', 'admin', 'UPDATE_KYC',       'kyc_status',              'pending', 'verified', '192.168.1.104', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- ALSO ADD preferred_language column if not exists
-- ─────────────────────────────────────────
ALTER TABLE workers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

COMMIT;

-- VERIFY
SELECT 'cities'            AS table_name, COUNT(*) AS rows FROM cities
UNION ALL SELECT 'zones',            COUNT(*) FROM zones
UNION ALL SELECT 'plans',            COUNT(*) FROM plans
UNION ALL SELECT 'admins',           COUNT(*) FROM admins
UNION ALL SELECT 'workers',          COUNT(*) FROM workers
UNION ALL SELECT 'policies',         COUNT(*) FROM policies
UNION ALL SELECT 'disruption_events',COUNT(*) FROM disruption_events
UNION ALL SELECT 'claims',           COUNT(*) FROM claims
UNION ALL SELECT 'payouts',          COUNT(*) FROM payouts
UNION ALL SELECT 'system_config',    COUNT(*) FROM system_config
UNION ALL SELECT 'audit_logs',       COUNT(*) FROM audit_logs;