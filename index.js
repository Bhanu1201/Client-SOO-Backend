const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Dummy user for demonstration
const user = {
    username: 'admin',
    password: 'password',
};

const users = [{
    username: 'sai@dvk.ai',
    password: 'password',
},{
    username: 'bhanu@dvk.ai',
    password: 'password',
}] ;
const SISENSE_SSO_URL = process.env.SISENSE_SSO_URL; // Sisense SSO endpoint
const SISENSE_JWT_SECRET = process.env.SISENSE_JWT_SECRET; 
// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === user.username && password === user.password) {
        const token = jwt.sign(
            {
                username: user.username,
                email: user.username,
                firstName: 'Admin', // Add user first name (optional)
                lastName: 'User', // Add user last name (optional)
                groups: ['Admin'], // Add user groups (optional)
            },
            SISENSE_JWT_SECRET, // Use the shared secret for signing
            { expiresIn: '1h' }
        );

        // Redirect to Sisense SSO URL with the JWT token
        const ssoRedirectUrl = `${SISENSE_SSO_URL}?jwt=${token}`;
        res.json({ redirectUrl: ssoRedirectUrl });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Protected route example
app.get('/api/protected', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.json({ message: `Welcome, ${decoded.username}!` });
        window.location.href = "home.html"
    });
});

// Logout endpoint (optional, for server-side token invalidation)
app.post('/api/logout', (req, res) => {
    // In a real application, you might add the token to a blacklist here
    res.json({ message: 'Logged out successfully' });
    window.location.href = "login.html"
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});