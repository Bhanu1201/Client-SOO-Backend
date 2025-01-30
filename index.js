const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(cors({ origin: "https://client-sso-frontend.onrender.com" }));
app.use(bodyParser.json());

// Dummy user for demonstration
const user = {
    username: 'admin',
    password: 'password',
};

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === user.username && password === user.password) {
        // Generate JWT token
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });
        res.json({ token });
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


app.get('/api/test', (req, res) => {
    return "test api is working"
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
