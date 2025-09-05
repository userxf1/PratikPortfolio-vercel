const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    await pool.query(`CREATE TABLE IF NOT EXISTS visitors (id UUID PRIMARY KEY, timestamp BIGINT, visits INTEGER DEFAULT 1, browser VARCHAR(100), device VARCHAR(100), screen_size VARCHAR(100))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visitors_timestamp ON visitors (timestamp)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS page_views (id SERIAL PRIMARY KEY, visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE, page VARCHAR(255), timestamp BIGINT)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views (timestamp)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS session_durations (id SERIAL PRIMARY KEY, visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE, duration INTEGER, timestamp BIGINT)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_durations_timestamp ON session_durations (timestamp)`);
    console.log('Database initialized');
}

app.get('/api/visitors/count', (req, res) => pool.query('SELECT COUNT(*) AS count FROM page_views').then(r => res.json({ count: r.rows[0].count })).catch(e => res.status(500).json({ error: e.message })));
app.post('/api/visitors', (req, res) => pool.query('INSERT INTO visitors (id, timestamp, visits, browser, device, screen_size) VALUES ($1, $2, 1, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET visits = visitors.visits + 1', [req.body.id, req.body.timestamp, req.body.browser, req.body.device, req.body.screenSize]).then(() => res.json({ success: true })).catch(e => res.status(500).json({ error: e.message })));
app.post('/api/pageviews', (req, res) => pool.query('INSERT INTO page_views (visitor_id, page, timestamp) VALUES ($1, $2, $3)', [req.body.visitorId, req.body.page, req.body.timestamp]).then(() => res.json({ success: true })).catch(e => res.status(500).json({ error: e.message })));
app.post('/api/sessions', (req, res) => pool.query('INSERT INTO session_durations (visitor_id, duration, timestamp) VALUES ($1, $2, $3)', [req.body.visitorId, req.body.duration, req.body.timestamp]).then(() => res.json({ success: true })).catch(e => res.status(500).json({ error: e.message })));

app.get('/api/admin/total-visitors', (req, res) => pool.query('SELECT COUNT(*) AS count FROM visitors').then(r => res.json({ count: r.rows[0].count })).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/total-page-views', (req, res) => pool.query('SELECT COUNT(*) AS count FROM page_views').then(r => res.json({ count: r.rows[0].count })).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/mobile-users', (req, res) => pool.query('SELECT (SELECT COUNT(*) FROM visitors WHERE device = \'Mobile\') * 100.0 / NULLIF((SELECT COUNT(*) FROM visitors), 0) AS percentage').then(r => res.json({ percentage: r.rows[0].percentage || 0 })).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/pc-users', (req, res) => pool.query('SELECT (SELECT COUNT(*) FROM visitors WHERE device = \'Desktop\') * 100.0 / NULLIF((SELECT COUNT(*) FROM visitors), 0) AS percentage').then(r => res.json({ percentage: r.rows[0].percentage || 0 })).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/recent-visitors', (req, res) => pool.query('SELECT id, timestamp, visits, browser, device, screen_size FROM visitors ORDER BY timestamp DESC LIMIT 10').then(r => res.json(r.rows)).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/browser-stats', (req, res) => pool.query('SELECT browser, COUNT(*) AS count FROM visitors GROUP BY browser').then(r => res.json(r.rows)).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/page-stats', (req, res) => pool.query('SELECT page, COUNT(*) AS count FROM page_views GROUP BY page').then(r => res.json(r.rows)).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/device-stats', (req, res) => pool.query('SELECT device, COUNT(*) AS count FROM visitors GROUP BY device').then(r => res.json(r.rows)).catch(e => res.status(500).json({ error: e.message })));
app.get('/api/admin/session-buckets', (req, res) => pool.query('SELECT CASE WHEN duration < 60 THEN \'<1 min\' WHEN duration < 180 THEN \'1-3 min\' WHEN duration < 300 THEN \'3-5 min\' WHEN duration < 600 THEN \'5-10 min\' ELSE \'>10 min\' END AS bucket, COUNT(*) AS count FROM session_durations GROUP BY bucket').then(r => res.json(r.rows)).catch(e => res.status(500).json({ error: e.message })));
app.post('/api/admin/cleanup', (req, res) => pool.query('DELETE FROM session_durations WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL \'30 days\') * 1000; DELETE FROM page_views WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL \'30 days\') * 1000; DELETE FROM visitors WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL \'30 days\') * 1000').then(() => res.json({ success: true })).catch(e => res.status(500).json({ error: e.message })));

initDB().then(() => {
    app.listen(PORT, () => console.log(`Server on ${PORT}`));
}).catch(e => console.error('DB init failed:', e));
