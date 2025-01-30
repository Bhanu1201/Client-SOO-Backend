const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors({ origin: "https://client-sso-frontend.onrender.com" }));
app.use(bodyParser.json());

/**
 * Dummy user (Replace with real authentication logic)
 */
const user = {
    id: "12345",
    username: "admin",
    password: "password",
    email: "admin@example.com",
    role: "Admin"
};

/**
 * Generate JWT Token for Sisense SSO
 */
function generateJWT(user) {
    const payload = {
        sub: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 mins expiration
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Login API - Generates JWT Token for Sisense SSO
 */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === user.username && password === user.password) {
        // Generate Sisense JWT
        const token = generateJWT(user);

        // Redirect user to Sisense with JWT in Authorization header
        res.json({ token, sisenseURL: `${process.env.SISENSE_DOMAIN}/app/main` });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

/**
 * Protected Route (Verifies JWT)
 */
app.get('/api/protected', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.json({ message: `Welcome, ${decoded.name}!`, user: decoded });
    });
});

/**
 * Sisense User Provisioning (Create User if Not Exists)
 */
async function provisionUserInSisense(user) {
    const sisenseAPIURL = `${process.env.SISENSE_DOMAIN}/api/v1/users`;
    
    const headers = {
        Authorization: `Bearer ${process.env.SISENSE_ADMIN_API_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const userData = {
        username: user.email,
        email: user.email,
        role: user.role || 'Viewer'
    };

    try {
        const response = await axios.post(sisenseAPIURL, userData, { headers });
        console.log("User provisioned successfully:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error provisioning user:", error.response?.data || error.message);
    }
}

/**
 * API to Authenticate User and Redirect to Sisense
 */
app.post('/api/sso', async (req, res) => {
    const { username, password } = req.body;

    if (username === user.username && password === user.password) {
        const token = generateJWT(user);

        // Ensure user exists in Sisense
        await provisionUserInSisense(user);

        // Redirect User to Sisense
        const sisenseRedirectURL = `${process.env.SISENSE_DOMAIN}/app/main?jwt=${token}`;
        res.json({ sisenseRedirectURL });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

/**
 * Logout API (Optional)
 */
app.post('/api/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

/**
 * Test API
 */
app.get('/api/test', (req, res) => {
    res.json({ message: "Test API is working!" });
});

/**
 * Start the Server
 */
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
