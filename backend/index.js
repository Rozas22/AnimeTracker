import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database.json');

// In-memory cache for translations (clears on server restart, saves repeated API calls within a session)
const translateCache = new Map();

// Ensure database file exists and migrate to object schema if needed
async function initDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data || '{"users":[],"relationships":[]}');
    
    // Migration: if it's an array, convert to { users: [...], relationships: [] }
    if (Array.isArray(parsed)) {
      console.log('Migrating database.json to users/relationships schema...');
      const newDb = { users: parsed, relationships: [] };
      await fs.writeFile(DB_PATH, JSON.stringify(newDb, null, 2), 'utf-8');
    }
  } catch (error) {
    // If file doesn't exist or is invalid
    const defaultDb = { users: [], relationships: [] };
    await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    console.log('Database initialized automatically: database.json');
  }
}
initDatabase();

// Auth Middleware to get current user from token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token requerido para autenticación.' });
  
  try {
    // Verify the token directly against AniList — this is the source of truth.
    // This makes auth resilient to database resets (e.g. Render ephemeral filesystem).
    const anilistResponse = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `query { Viewer { id name avatar { large } siteUrl } }`
      })
    });

    if (!anilistResponse.ok) {
      return res.status(401).json({ error: 'Token inválido o sesión caducada.' });
    }

    const anilistData = await anilistResponse.json();
    if (!anilistData?.data?.Viewer) {
      return res.status(401).json({ error: 'Token inválido o sesión caducada.' });
    }

    const viewer = anilistData.data.Viewer;

    // Upsert user in local DB so relationships work correctly
    await initDatabase();
    const dbContent = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
    const users = Array.isArray(db) ? db : db.users;

    const existingIndex = users.findIndex(u => u.id === viewer.id);
    const userRecord = {
      id: viewer.id,
      name: viewer.name,
      avatar: viewer.avatar?.large || '',
      siteUrl: viewer.siteUrl || '',
      access_token: token,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      users[existingIndex] = userRecord;
    } else {
      users.push(userRecord);
    }

    if (Array.isArray(db)) {
      await fs.writeFile(DB_PATH, JSON.stringify({ users, relationships: [] }, null, 2), 'utf-8');
    } else {
      db.users = users;
      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }

    req.user = userRecord;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Error interno del servidor en autenticación.' });
  }
}

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
    const accessToken = data.access_token;

    // Fetch user details from AniList GraphQL API using the new token
    let userInfo = null;
    try {
      const userProfileQuery = `
        query {
          Viewer {
            id
            name
            avatar {
              large
            }
            siteUrl
          }
        }
      `;
      const profileResponse = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query: userProfileQuery }),
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.data && profileData.data.Viewer) {
        userInfo = profileData.data.Viewer;
        console.log(`Successfully fetched profile details for user: ${userInfo.name}`);
      } else {
        console.error('Failed to retrieve user profile after OAuth exchange:', profileData.errors);
      }
    } catch (profileError) {
      console.error('Network or parsing error fetching user profile:', profileError);
    }

    // Save or update user profile details in database.json
    if (userInfo) {
      try {
        await initDatabase(); // Make sure the DB file exists
        const dbContent = await fs.readFile(DB_PATH, 'utf-8');
        let db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
        let usersList = Array.isArray(db) ? db : db.users;

        const existingIndex = usersList.findIndex(u => u.id === userInfo.id);
        const userRecord = {
          id: userInfo.id,
          name: userInfo.name,
          avatar: userInfo.avatar?.large || '',
          siteUrl: userInfo.siteUrl || '',
          access_token: accessToken,
          updatedAt: new Date().toISOString()
        };

        if (existingIndex > -1) {
          usersList[existingIndex] = userRecord;
          console.log(`Database: Updated existing user: ${userInfo.name}`);
        } else {
          usersList.push(userRecord);
          console.log(`Database: Added new user: ${userInfo.name}`);
        }

        if (Array.isArray(db)) {
            db = { users: usersList, relationships: [] };
        } else {
            db.users = usersList;
        }

        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      } catch (dbError) {
        console.error('Database write error:', dbError);
      }
    }

    // Return the token to the frontend
    res.json({
      access_token: accessToken,
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

/**
 * Get all logged-in friends from database.json (excluding secure access tokens)
 * GET /api/friends
 */
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const dbContent = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
    
    // Find all accepted relationships for current user
    const acceptedRels = db.relationships.filter(r => 
      r.status === 'accepted' && (String(r.requesterId) === String(req.user.id) || String(r.targetId) === String(req.user.id))
    );
    
    const friendIds = acceptedRels.map(r => String(r.requesterId) === String(req.user.id) ? String(r.targetId) : String(r.requesterId));
    
    // Map to public profiles
    const publicFriends = db.users
      .filter(u => friendIds.includes(String(u.id)))
      .map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        siteUrl: u.siteUrl,
        updatedAt: u.updatedAt
      }));

    res.json(publicFriends);
  } catch (error) {
    console.error('Error fetching friends list:', error);
    res.status(500).json({ error: 'Failed to load friends list' });
  }
});

/**
 * Get pending friend requests for current user
 * GET /api/notifications
 */
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const dbContent = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
    
    // Find requests targeting this user that are pending
    const pendingRels = db.relationships.filter(r => 
      r.status === 'pending' && String(r.targetId) === String(req.user.id)
    );
    const pendingIds = pendingRels.map(r => String(r.requesterId));
    
    // Map to public profiles
    const requests = db.users
      .filter(u => pendingIds.includes(String(u.id)))
      .map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        siteUrl: u.siteUrl,
        updatedAt: u.updatedAt
      }));

    res.json(requests);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

/**
 * Accept a friend request
 * POST /api/friends/accept
 */
app.post('/api/friends/accept', authenticateToken, async (req, res) => {
  const { requesterId } = req.body;
  if (!requesterId) return res.status(400).json({ error: 'Falta requesterId.' });

  try {
    const dbContent = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
    
    const relIndex = db.relationships.findIndex(r => 
      r.status === 'pending' && String(r.targetId) === String(req.user.id) && String(r.requesterId) === String(requesterId)
    );

    if (relIndex > -1) {
      db.relationships[relIndex].status = 'accepted';
      await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Solicitud no encontrada.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error interno al aceptar solicitud.' });
  }
});

/**
 * Reject a friend request
 * POST /api/friends/reject
 */
app.post('/api/friends/reject', authenticateToken, async (req, res) => {
  const { requesterId } = req.body;
  if (!requesterId) return res.status(400).json({ error: 'Falta requesterId.' });

  try {
    const dbContent = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
    
    // Remove relationship
    db.relationships = db.relationships.filter(r => 
      !(String(r.targetId) === String(req.user.id) && String(r.requesterId) === String(requesterId) && r.status === 'pending')
    );
    
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al rechazar solicitud.' });
  }
});

/**
 * Send a friend request manually by AniList username
 * POST /api/friends/add
 */
app.post('/api/friends/add', authenticateToken, async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio.' });
  }
  
  if (username.toLowerCase() === req.user.name.toLowerCase()) {
    return res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });
  }

  try {
    console.log(`Buscando perfil de AniList para el usuario: ${username}`);
    const query = `
      query ($name: String) {
        User (name: $name) {
          id
          name
          avatar {
            large
          }
          siteUrl
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { name: username }
      })
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      const errMsg = data.errors ? data.errors[0].message : 'Usuario no encontrado en AniList';
      return res.status(404).json({ error: errMsg });
    }

    const userInfo = data.data.User;

    const dbContent = await fs.readFile(DB_PATH, 'utf-8');
    let db = JSON.parse(dbContent || '{"users":[],"relationships":[]}');
    
    // Add user to db if they don't exist
    const existingIndex = db.users.findIndex(u => u.id === userInfo.id);
    if (existingIndex === -1) {
      db.users.push({
        id: userInfo.id,
        name: userInfo.name,
        avatar: userInfo.avatar?.large || '',
        siteUrl: userInfo.siteUrl || '',
        access_token: null,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Update basic public info
      db.users[existingIndex].name = userInfo.name;
      db.users[existingIndex].avatar = userInfo.avatar?.large || '';
      db.users[existingIndex].siteUrl = userInfo.siteUrl || '';
    }

    // Check relationship
    const existingRel = db.relationships.find(r => 
      (String(r.requesterId) === String(req.user.id) && String(r.targetId) === String(userInfo.id)) ||
      (String(r.requesterId) === String(userInfo.id) && String(r.targetId) === String(req.user.id))
    );

    if (existingRel) {
      if (existingRel.status === 'accepted') {
        return res.status(400).json({ error: 'Ya son amigos.' });
      }
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente.' });
    }

    // Create pending request
    db.relationships.push({
      requesterId: req.user.id,
      targetId: userInfo.id,
      status: 'pending'
    });

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

    res.json({
      success: true,
      name: userInfo.name
    });

  } catch (error) {
    console.error('Error adding friend manually:', error);
    res.status(500).json({ error: 'Error interno al agregar al amigo.' });
  }
});

/**
 * Save or update an anime list entry on the user's AniList profile
 * POST /api/anime/save
 */
app.post('/api/anime/save', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  const { mediaId, status, progress, score } = req.body;

  if (!mediaId) {
    return res.status(400).json({ error: 'mediaId is required' });
  }

  try {
    console.log(`Executing AniList SaveMediaListEntry mutation for mediaId: ${mediaId}`);
    
    const query = `
      mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
        SaveMediaListEntry (mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
          id
          status
          progress
          score
          mediaId
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          mediaId: parseInt(mediaId, 10),
          status,
          progress: progress !== undefined ? parseInt(progress, 10) : undefined,
          score: score !== undefined ? parseFloat(score) : undefined,
        }
      })
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      console.error('AniList mutation error details:', data.errors || data);
      return res.status(response.status || 400).json({
        error: 'Failed to update list entry on AniList',
        details: data.errors || data
      });
    }

    console.log(`Successfully updated AniList entry for mediaId ${mediaId}`);
    res.json(data.data.SaveMediaListEntry);
  } catch (error) {
    console.error('Error saving anime list entry:', error);
    res.status(500).json({ error: 'Internal server error while saving anime entry' });
  }
});

// A simple status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

/**
 * Translate text to Spanish using MyMemory free API (no key required)
 * POST /api/translate
 */
app.post('/api/translate', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  // Strip HTML tags for cleaner translation
  const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Check cache first
  const cacheKey = stripped.substring(0, 80); // use start of text as key
  if (translateCache.has(cacheKey)) {
    return res.json({ translated: translateCache.get(cacheKey) });
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(stripped.substring(0, 500))}&langpair=en|es`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      translateCache.set(cacheKey, translated);
      return res.json({ translated });
    }

    // MyMemory quota exceeded or error — return original
    res.json({ translated: stripped });
  } catch (error) {
    console.error('Translation error:', error);
    res.json({ translated: stripped }); // graceful fallback
  }
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
