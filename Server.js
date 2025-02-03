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
const SISENSE_BASE_URL = process.env.SISENSE_BASE_URL || "https://atomicworks.sisensepoc.com/TenantTest";

// Validate essential environment variables at startup
if (!SISENSE_SHARED_SECRET) {
    console.error("ERROR: SISENSE_SHARED_SECRET is not set! Please check your .env file or environment settings.");
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

// JWT Provider Class with Enhanced Error Handling
class SisenseJwtProvider {
    static createJwt(email, tenantId, secretKey) {
        if (!email || !tenantId || !secretKey) {
            throw new Error("Email, tenant ID, and secret key are required to generate JWT.");
        }

        const issuedAt = Math.floor(Date.now() / 1000);
        const expiry = issuedAt + 3600; // Token expires in 1 hour

        const payload = {
            sub: email, // Sisense user email
            iat: issuedAt, // Issued at timestamp
            exp: expiry, // Expiry time
            jti: crypto.randomUUID(), // Unique JWT ID
            tid: tenantId, // Tenant ID
        };

        const header = {
            alg: "HS256",
            typ: "JWT"
        };

        console.log("JWT Payload:", payload); // Debugging log

        try {
            return jwt.sign(payload, secretKey, { algorithm: 'HS256', header });
        } catch (err) {
            console.error("Error signing JWT:", err.message);
            throw new Error("JWT signing failed");
        }
    }
}

// SSO API Endpoint with Improved Error Handling
app.get('/sisense/jwt', validateQueryParams, async (req, res) => {
    try {
        const { email, tenantId, returnUrl } = req.query;

        console.log("Generating JWT for:", { email, tenantId });

        const token = SisenseJwtProvider.createJwt(email, tenantId, SISENSE_SHARED_SECRET);

        if (!token) {
            throw new Error("JWT token generation failed.");
        }

        // Ensure redirect URL is in format {returnUrl}/jwt?jwt=
        const formattedRedirectUrl = `${SISENSE_BASE_URL}/api/v1/authentication/jwtLogin?jwt=${encodeURIComponent(token)}`;

        console.log("Redirecting to:", formattedRedirectUrl);
        res.redirect(formattedRedirectUrl);

    } catch (error) {
        console.error("Error generating JWT:", error.stack);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
