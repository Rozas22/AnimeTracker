export default function handler(req, res) { res.status(200).json({ client_id: process.env.ANILIST_CLIENT_ID, redirect_uri: process.env.ANILIST_REDIRECT_URI }); }
