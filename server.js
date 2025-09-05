// Import required packages
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
// Initialize PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// In server.js, add after other middleware:
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
}));

// Create visitors table if it doesn't exist
async function initializeDatabase() {
    try {
        // Create visitors table
        // In server.js, modify the CREATE TABLE query:
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
        
        // Create page_views table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS page_views (
                id SERIAL PRIMARY KEY,
                visitor_id VARCHAR(255) REFERENCES visitors(id),
                page VARCHAR(255) NOT NULL,
                timestamp BIGINT NOT NULL
            );
        `);
        
        // Create session_durations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS session_durations (
                id SERIAL PRIMARY KEY,
                visitor_id VARCHAR(255) REFERENCES visitors(id),
                duration INTEGER NOT NULL,
                timestamp BIGINT NOT NULL
            );
        `);
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// API Routes

// Get total visitor count
app.get('/api/visitors/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM visitors');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error getting visitor count:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Record a new visitor or update existing one
app.post('/api/visitors', async (req, res) => {
    const { id, timestamp, browser, device, screenSize } = req.body;
    
    try {
        // Check if visitor already exists
        const checkResult = await pool.query('SELECT * FROM visitors WHERE id = $1', [id]);
        
        if (checkResult.rows.length > 0) {
            // Update existing visitor
            await pool.query(
                'UPDATE visitors SET timestamp = $1, visits = visits + 1, browser = $2, device = $3, screen_size = $4 WHERE id = $5',
                [timestamp, browser, device, screenSize, id]
            );
        } else {
            // Insert new visitor
            await pool.query(
                'INSERT INTO visitors (id, timestamp, visits, browser, device, screen_size) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, timestamp, 1, browser, device, screenSize]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error recording visitor:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Record a page view
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

// Record a session duration
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

// In server.js, replace the /api/admin/data endpoint with these:

// Get total visitor count
app.get('/api/admin/total-visitors', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS count FROM visitors');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error fetching total visitors:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get total page views
app.get('/api/admin/total-page-views', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) AS count FROM page_views');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error fetching total page views:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get average session duration
app.get('/api/admin/avg-session-duration', async (req, res) => {
    try {
        const result = await pool.query('SELECT AVG(duration) AS avg_duration FROM session_durations');
        res.json({ avg_duration: parseFloat(result.rows[0].avg_duration) || 0 });
    } catch (error) {
        console.error('Error fetching average session duration:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get mobile users percentage
app.get('/api/admin/mobile-users', async (req, res) => {
    try {
        const totalResult = await pool.query('SELECT COUNT(*) AS total FROM visitors');
        const mobileResult = await pool.query("SELECT COUNT(*) AS mobile_count FROM visitors WHERE device = 'Mobile'");
        const total = parseInt(totalResult.rows[0].total);
        const mobileCount = parseInt(mobileResult.rows[0].mobile_count);
        const percentage = total > 0 ? Math.round((mobileCount / total) * 100) : 0;
        res.json({ percentage });
    } catch (error) {
        console.error('Error fetching mobile users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get recent visitors (for table)
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

// Get browser statistics
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

// Get page view statistics
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

// Get device distribution (for chart)
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

// Get session duration buckets (for chart)
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

// Initialize the database and start the server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
});
