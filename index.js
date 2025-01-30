import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(cors({ origin: "https://client-sso-frontend.onrender.com" }));
app.use(bodyParser.json());

// Sisense configurations - Replace with actual values
const SISENSE_SHARED_SECRET = process.env.SISENSE_SHARED_SECRET || "your_secret_key";
const SISENSE_HOST = process.env.SISENSE_HOST || "https://your-sisense-domain.com";
const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || "user@example.com";

// Route to generate the JWT token and redirect to Sisense
app.get("/sisense-login", (req, res) => {
  try {
    const userEmail = req.query.email || DEFAULT_USER_EMAIL;

    // Generate JWT Payload
    const payload = {
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + 60 * 5, // Expiration (5 mins)
      email: userEmail, // User email
      username: userEmail.split("@")[0], // Username (derived)
      groups: ["default"], // Assign user groups
    };

    // Generate the JWT
    const token = jwt.sign(payload, SISENSE_SHARED_SECRET, { algorithm: "HS256" });

    // Redirect to Sisense with the JWT
    const sisenseSSOUrl = `${SISENSE_HOST}/app/account/sso?jwt=${token}`;
    res.redirect(sisenseSSOUrl);
  } catch (error) {
    console.error("Error generating JWT:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
