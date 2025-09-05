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

// Get all visitor data for admin dashboard
app.get('/api/admin/data', async (req, res) => {
    try {
        // Get all visitors
        const visitorsResult = await pool.query('SELECT * FROM visitors ORDER BY timestamp DESC');
        
        // Get all page views
        const pageViewsResult = await pool.query('SELECT * FROM page_views ORDER BY timestamp DESC');
        
        // Get all session durations
        const sessionsResult = await pool.query('SELECT * FROM session_durations ORDER BY timestamp DESC');
        
        res.json({
            visitors: visitorsResult.rows,
            pageViews: pageViewsResult.rows,
            sessionDurations: sessionsResult.rows.map(row => row.duration)
        });
    } catch (error) {
        console.error('Error fetching admin data:', error);
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
