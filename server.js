/**
 * LAKSHAY SHARMA PORTFOLIO - FULL-STACK PRODUCTION BACKEND
 * Architecture: Node.js | Express | local JSON DB File Layer
 * System Requirements: npm install express body-parser cors useragent
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const useragent = require('express-useragent');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'database.json');

// Ensure Database file structure exists on startup
if (!fs.existsSync(DB_FILE)) {
    const initialStructure = {
        messages: [],
        analytics: { totalPageViews: 0, uniqueVisitors: {}, projectClicks: {} },
        systemConfig: { currentThemeMode: 'neon-dark', maintenance: false }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialStructure, null, 2), 'utf8');
}

// Global Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(useragent.express());

// Serve static assets out of the current folder
app.use(express.static(path.join(__dirname)));

// Helper utilities to read/write JSON Database efficiently
function readDB() {
    try {
        const rawData = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        console.error("Database reading breakdown:", err);
        return { messages: [], analytics: { totalPageViews: 0, uniqueVisitors: {}, projectClicks: {} }, systemConfig: {} };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Database compilation save breakdown:", err);
        return false;
    }
}

// --- API ROUTING LAYER ---

// 1. Analytics Middleware Tracking
app.use((req, res, next) => {
    // Skip internal asset paths from skewing performance logs
    if (req.path.includes('.') || req.path.startsWith('/api')) {
        return next();
    }
    
    const db = readDB();
    db.analytics.totalPageViews += 1;
    
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    if (!db.analytics.uniqueVisitors[ip]) {
        db.analytics.uniqueVisitors[ip] = {
            timestamp: new Date().toISOString(),
            browser: req.useragent.browser,
            os: req.useragent.os,
            platform: req.useragent.platform
        };
    }
    writeDB(db);
    next();
});

// 2. Fetch System Configuration
app.get('/api/config', (req, res) => {
    const db = readDB();
    res.status(200).json({
        status: 'success',
        config: db.systemConfig,
        views: db.analytics.totalPageViews
    });
});

// 3. Post Contact Inquiries securely
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ status: 'error', message: 'Required fields missing from payload structure.' });
    }
    
    const db = readDB();
    const newInquiry = {
        id: 'inq_' + Date.now(),
        timestamp: new Date().toISOString(),
        name,
        email,
        subject: subject || 'General Dev Inquiry',
        message,
        ipAddress: req.ip || '127.0.0.1'
    };
    
    db.messages.push(newInquiry);
    if (writeDB(db)) {
        return res.status(201).json({ status: 'success', message: 'Inquiry safely stored inside compilation records.' });
    } else {
        return res.status(500).json({ status: 'error', message: 'Data pipeline save failure.' });
    }
});

// 4. Log interaction metrics from specific micro elements
app.post('/api/metrics/click', (req, res) => {
    const { elementId } = req.body;
    if (!elementId) return res.status(400).json({ status: 'error' });
    
    const db = readDB();
    db.analytics.projectClicks[elementId] = (db.analytics.projectClicks[elementId] || 0) + 1;
    writeDB(db);
    
    res.status(200).json({ status: 'success', count: db.analytics.projectClicks[elementId] });
});

// Fallback routing pointing directly to our core web interface
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// System Deployment Activation
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` LAKSHAY SHARMA FULL-STACK PORTFOLIO SYSTEM ONLINE   `);
    console.log(` Live Environment Matrix: http://localhost:${PORT} `);
    console.log(`====================================================`);
});
