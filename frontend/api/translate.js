const translateCache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const cacheKey = stripped.substring(0, 80);
  
  if (translateCache.has(cacheKey)) {
    return res.status(200).json({ translated: translateCache.get(cacheKey) });
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(stripped.substring(0, 500))}&langpair=en|es`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      translateCache.set(cacheKey, translated);
      return res.status(200).json({ translated });
    }

    res.status(200).json({ translated: stripped });
  } catch (error) {
    res.status(200).json({ translated: stripped });
  }
}
