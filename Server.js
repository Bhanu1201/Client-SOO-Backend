require('dotenv').config();
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({ origin: "https://client-sso-frontend.onrender.com" }));

// Load environment variables
const PORT = process.env.PORT || 10000;
const SISENSE_SHARED_SECRET = process.env.SISENSE_SHARED_SECRET;

// Middleware to validate required parameters
function validateQueryParams(req, res, next) {
    if (!req.query.email || !req.query.returnUrl || !req.query.tenantId) {
        return res.status(400).json({ error: "Missing required parameters: email, tenantId, returnUrl" });
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
            sub: email,  // Subject (Sisense user email)
            iat: issuedAt,  // Issued at timestamp
            jti: require('crypto').randomUUID(),  // Unique JWT ID
            tid: tenantId,  // Tenant ID (for multi-tenancy support)
        };

        return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
    }
}

// SSO API Endpoint
app.get('/sisense/jwt', validateQueryParams, (req, res) => {
    try {
        const { email, tenantId, return_to, returnUrl } = req.query;

        const token = SisenseJwtProvider.createJwt(email, tenantId, SISENSE_SHARED_SECRET);

        let redirectUrl = new URL(returnUrl);
        redirectUrl.searchParams.append('jwt', token);
        
        if (return_to) {
            redirectUrl.searchParams.append('return_to', return_to);
        }

        res.redirect(redirectUrl.toString());
        console.log(res.redirect(redirectUrl.toString()));

    } catch (error) {
        console.error("Error generating JWT:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
