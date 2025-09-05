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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per IP
}));

// Route to serve admin.html for /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS visitors (
                id UUID PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                visits INTEGER DEFAULT 1,
                browser VARCHAR(100),
                device VARCHAR(100),
                screen_size VARCHAR(100)
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_visitors_timestamp ON visitors (timestamp)`);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS page_views (
                id SERIAL PRIMARY KEY,
                visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
                page VARCHAR(255) NOT NULL,
                timestamp BIGINT NOT NULL
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views (visitor_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views (timestamp)`);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS session_durations (
                id SERIAL PRIMARY KEY,
                visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
                duration INTEGER NOT NULL,
                timestamp BIGINT NOT NULL
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_durations_visitor_id ON session_durations (visitor_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_durations_timestamp ON session_durations (timestamp)`);
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// API Routes
app.get('/api/visitors/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS count FROM page_views');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error getting page view count:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/visitors', async (req, res) => {
    const { id, timestamp, browser, device, screenSize } = req.body;
    try {
        await pool.query(`
            INSERT INTO visitors (id, timestamp, visits, browser, device, screen_size)
            VALUES ($1, $2, 1, $3, $4, $5)
            ON CONFLICT (id)
            DO UPDATE SET
                timestamp = EXCLUDED.timestamp,
                visits = visitors.visits + 1,
                browser = EXCLUDED.browser,
                device = EXCLUDED.device,
                screen_size = EXCLUDED.screen_size
        `, [id, timestamp, browser, device, screenSize]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording visitor:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/pageviews', async (req, res) => {
    const { visitorId, page, timestamp } = req.body;
    try {
        await pool.query(
            'INSERT INTO page_views (visitor_id, page, timestamp) VALUES ($1, $2, $3)',
            [visitorId, page, timestamp]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording page view:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/sessions', async (req, res) => {
    const { visitorId, duration, timestamp } = req.body;
    try {
        await pool.query(
            'INSERT INTO session_durations (visitor_id, duration, timestamp) VALUES ($1, $2, $3)',
            [visitorId, duration, timestamp]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording session duration:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Routes
app.get('/api/admin/total-visitors', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS count FROM visitors');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error fetching total visitors:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/total-page-views', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS count FROM page_views');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error fetching total page views:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/mobile-users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM visitors WHERE device = 'Mobile') * 100.0 / NULLIF((SELECT COUNT(*) FROM visitors), 0) AS percentage
        `);
        res.json({ percentage: parseFloat(result.rows[0].percentage) || 0 });
    } catch (error) {
        console.error('Error fetching mobile users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/pc-users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM visitors WHERE device = 'Desktop') * 100.0 / NULLIF((SELECT COUNT(*) FROM visitors), 0) AS percentage
        `);
        res.json({ percentage: parseFloat(result.rows[0].percentage) || 0 });
    } catch (error) {
        console.error('Error fetching PC users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/recent-visitors', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, timestamp, visits, browser, device, screen_size
            FROM visitors
            ORDER BY timestamp DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent visitors:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/browser-stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT browser, COUNT(*) AS count
            FROM visitors
            GROUP BY browser
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching browser stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/page-stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT page, COUNT(*) AS count
            FROM page_views
            GROUP BY page
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching page stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/device-stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT device, COUNT(*) AS count
            FROM visitors
            GROUP BY device
            ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching device stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/session-buckets', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                CASE
                    WHEN duration < 60 THEN '< 1 min'
                    WHEN duration < 180 THEN '1-3 min'
                    WHEN duration < 300 THEN '3-5 min'
                    WHEN duration < 600 THEN '5-10 min'
                    ELSE '> 10 min'
                END AS bucket,
                COUNT(*) AS count
            FROM session_durations
            GROUP BY bucket
            ORDER BY
                CASE bucket
                    WHEN '< 1 min' THEN 1
                    WHEN '1-3 min' THEN 2
                    WHEN '3-5 min' THEN 3
                    WHEN '5-10 min' THEN 4
                    ELSE 5
                END
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching session buckets:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/cleanup', async (req, res) => {
    try {
        await pool.query(`
            DELETE FROM session_durations
            WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
        `);
        await pool.query(`
            DELETE FROM page_views
            WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
        `);
        await pool.query(`
            DELETE FROM visitors
            WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
        `);
        res.json({ success: true });
    } catch (error) {
        console.error('Error cleaning up old data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
