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
app.use(cors());
app.use(cors({ origin: "https://client-sso-frontend.onrender.com", credentials: true }));
app.use(bodyParser.json());

// Sisense SSO Configuration
const SISENSE_BASE_URL = process.env.SISENSE_BASE_URL;
const SISENSE_SHARED_SECRET = process.env.SISENSE_SHARED_SECRET;
const SISENSE_EXPIRATION = 600; // 10 minutes expiration time in seconds

// Generate JWT for Sisense SSO
const generateSisenseToken = (user) => {
    return jwt.sign(
        {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + SISENSE_EXPIRATION,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        },
        SISENSE_SHARED_SECRET
    );
};

// Authenticate against Sisense API
const authenticateSisenseUser = async (username, password) => {
    try {
        const response = await axios.post(`${SISENSE_BASE_URL}/api/v1/authentication/login`, {
            username,
            password
        });
        return response.data;
    } catch (error) {
        return null;
    }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const authResponse = await authenticateSisenseUser(username, password);
    
    if (authResponse && authResponse.access_token) {
        const user = {
            username: authResponse.user.username,
            email: authResponse.user.email,
            firstName: authResponse.user.firstName,
            lastName: authResponse.user.lastName,
        };
        
        // Generate JWT for SSO
        const token = generateSisenseToken(user);
        const sisenseSSOUrl = `${SISENSE_BASE_URL}/app/account/sso?jwt=${token}`;
        
        res.json({ token, sisenseSSOUrl });
    } else {
        res.status(401).json({ error: 'Invalid credentials or authentication failed' });
    }
});

// Protected route example
app.get('/api/protected', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, SISENSE_SHARED_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.json({ message: `Welcome, ${decoded.username}!`, user: decoded });
    });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: "Healthy", timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
