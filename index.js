const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

const SISENSE_URL = process.env.SISENSE_URL || "https://yourcompany.sisense.com";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const RETURN_URL = process.env.RETURN_URL || `${SISENSE_URL}/dashboards`;
const SISENSE_API_KEY = process.env.SISENSE_API_KEY || "your_sisense_api_key"; // Store API key securely

// **Login Endpoint - Validate credentials with Sisense**
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        // Call Sisense authentication API
        const response = await axios.post(`${SISENSE_URL}/api/v1/authentication/login`, {
            username,
            password,
        });

        if (response.data && response.data.access_token) {
            // Use access token to fetch user details
            const userResponse = await axios.get(`${SISENSE_URL}/api/v1/users/me`, {
                headers: { Authorization: `Bearer ${response.data.access_token}` },
            });

            const user = userResponse.data;

            // Generate JWT for SSO
            const token = jwt.sign(
                {
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
                    sub: user.id, // Sisense User ID
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    return_to: RETURN_URL,
                },
                JWT_SECRET,
                { algorithm: "HS256" }
            );

            res.json({ redirectUrl: `${SISENSE_URL}/login/jwt?jwt=${token}` });
        } else {
            res.status(401).json({ error: "Invalid Sisense credentials" });
        }
    } catch (error) {
        res.status(500).json({ error: "Sisense authentication failed", details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`SSO Server running on http://localhost:${PORT}`);
});
