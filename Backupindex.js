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
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});