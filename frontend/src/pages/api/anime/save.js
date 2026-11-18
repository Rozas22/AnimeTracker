export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
      return res.status(response.status || 400).json({
        error: 'Failed to update list entry on AniList',
        details: data.errors || data
      });
    }

    res.status(200).json(data.data.SaveMediaListEntry);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error while saving anime entry' });
  }
}
