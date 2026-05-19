import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes (to assist in local development if needed)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * Get Client ID and Redirect URI for Frontend routing
 * GET /api/auth/config
 */
app.get('/api/auth/config', (req, res) => {
  res.json({
    client_id: process.env.ANILIST_CLIENT_ID,
    redirect_uri: process.env.ANILIST_REDIRECT_URI
  });
});

/**
 * Exchange Authorization Code for Access Token
 * POST /api/auth/token
 */
app.post('/api/auth/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  // Validate configuration
  const clientId = process.env.ANILIST_CLIENT_ID;
  const clientSecret = process.env.ANILIST_CLIENT_SECRET;
  const redirectUri = process.env.ANILIST_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing configuration in backend environment variables.');
    return res.status(500).json({
      error: 'Server is misconfigured. Please check backend .env file.',
      details: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri
      }
    });
  }

  try {
    console.log('Sending authorization code to AniList token exchange endpoint...');
    
    const response = await fetch('https://anilist.co/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('AniList API error response:', data);
      return res.status(response.status).json({
        error: 'Error exchanging code with AniList',
        details: data
      });
    }

    console.log('Successfully acquired access token from AniList!');
    
    // Return the token to the frontend
    // Data contains: { token_type, expires_in, access_token, refresh_token (if applicable) }
    res.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type
    });

  } catch (error) {
    console.error('Network or parsing error during OAuth exchange:', error);
    res.status(500).json({
      error: 'Internal server error during authentication',
      message: error.message
    });
  }
});

// A simple status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Serve static assets from frontend build folder in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback all non-API GET requests to React's index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Target AniList Redirect URI: ${process.env.ANILIST_REDIRECT_URI}`);
  console.log(`===================================================`);
});
