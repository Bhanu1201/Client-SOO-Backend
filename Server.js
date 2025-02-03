require('dotenv').config();
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();

// CORS Configuration
const allowedOrigins = ["https://client-sso-frontend.onrender.com"];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// Allow OPTIONS requests (important for CORS preflight)
app.options("*", cors());

// Load environment variables
const PORT = process.env.PORT || 10000;
const SISENSE_SHARED_SECRET = process.env.SISENSE_SHARED_SECRET;

if (!SISENSE_SHARED_SECRET) {
    console.error("ERROR: SISENSE_SHARED_SECRET is not set!");
    process.exit(1);
}

// Middleware to validate query parameters
function validateQueryParams(req, res, next) {
    const { email, returnUrl, tenantId } = req.query;

    if (!email || !returnUrl || !tenantId) {
        return res.status(400).json({ error: "Missing required parameters: email, tenantId, returnUrl" });
    }

    try {
        new URL(returnUrl); // Validate returnUrl format
    } catch (err) {
        return res.status(400).json({ error: "Invalid returnUrl format" });
    }

    next();
}

// JWT Provider Class with Tenant Support
class SisenseJwtProvider {
    static createJwt(email, tenantId, secretKey) {
        if (!email || !tenantId || !secretKey) {
            throw new Error("Email, tenant ID, and secret key are required to generate JWT.");
        }

        const issuedAt = Math.floor(Date.now() / 1000); // Current time in seconds

        const payload = {
            sub: email,  // Sisense user email
            iat: issuedAt,  // Issued at timestamp
            exp: issuedAt + 3600, // Expiry time (1 hour)
            jti: crypto.randomUUID(),  // Unique JWT ID
            tid: tenantId,  // Tenant ID (for multi-tenancy support)
        };

        return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
    }
}

// SSO API Endpoint
app.get('/sisense/jwt', validateQueryParams, (req, res) => {
    try {
        const { email, tenantId, return_to, returnUrl } = req.query;

        console.log("Generating JWT for:", { email, tenantId });

        const token = SisenseJwtProvider.createJwt(email, tenantId, SISENSE_SHARED_SECRET);

        let redirectUrl = new URL(returnUrl);
        redirectUrl.searchParams.append('jwt', token);

        if (return_to) {
            redirectUrl.searchParams.append('return_to', return_to);
        }

        console.log("Redirecting to:", redirectUrl.toString());
        res.redirect(redirectUrl.toString());

    } catch (error) {
        console.error("Error generating JWT:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
