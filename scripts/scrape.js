// api/scrape.js — Vercel serverless function
// Calls Apify with hidden key, returns Instagram data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { handle } = req.body;
  if (!handle) return res.status(400).json({ error: 'Instagram handle required' });

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const GROQ_KEY    = process.env.GROQ_KEY;
  if (!APIFY_TOKEN) return res.status(500).json({ error: 'Server not configured' });

  try {
    // Start Apify scraper
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [handle.replace('@','')], resultsLimit: 10 })
      }
    );
    const startData = await startRes.json();
    if (!startData.data) return res.status(400).json({ error: 'Failed to start scraper. Is the account public?' });

    const runId = startData.data.id;

    // Poll until done (max 90 sec)
    for (let i = 0; i < 18; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const runRes  = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      const runData = await runRes.json();
      const status  = runData.data?.status;

      if (status === 'SUCCEEDED') {
        const datasetId = runData.data.defaultDatasetId;
        const itemsRes  = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=20`);
        const items     = await itemsRes.json();
        const data      = buildData(handle, items);
        return res.status(200).json({ success: true, data });
      }
      if (status === 'FAILED') return res.status(400).json({ error: 'Scraper failed. Account may be private.' });
    }
    return res.status(408).json({ error: 'Scraper timed out. Try again.' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function buildData(handle, items) {
  const p     = items[0] || {};
  const posts = (p.latestIgtvVideos || p.posts || []).slice(0, 10);
  const avg   = (arr, key) => Math.round(arr.reduce((s, x) => s + (x[key] || 0), 0) / (arr.length || 1));

  return {
    last_updated: new Date().toISOString(),
    source: 'apify',
    your_account: {
      handle:           handle.replace('@',''),
      followers:        p.followersCount  || 0,
      following:        p.followsCount    || 0,
      total_posts:      p.postsCount      || 0,
      avg_likes:        avg(posts, 'likesCount'),
      avg_comments:     avg(posts, 'commentsCount'),
      avg_reach:        Math.round(avg(posts, 'likesCount') * 3.2),
      engagement_rate:  parseFloat(
        ((avg(posts,'likesCount') + avg(posts,'commentsCount')) / (p.followersCount || 1) * 100).toFixed(2)
      ),
      top_posts: posts.slice(0, 3).map(x => ({
        caption:    (x.caption || '').slice(0, 120),
        type:       x.type === 'Video' ? 'Reel' : 'Post',
        likes:      x.likesCount    || 0,
        comments:   x.commentsCount || 0,
        reach:      Math.round((x.likesCount || 0) * 3.2),
        posted_at:  x.timestamp || new Date().toISOString(),
        hashtags:   (x.hashtags || []).slice(0, 5)
      })),
      best_posting_times: ['07:00', '12:00', '19:00', '21:00'],
      top_hashtags: [...new Set(posts.flatMap(x => x.hashtags || []))].slice(0, 5)
    },
    niche_trends: [
      'Glass skin tutorials', 'Slugging at night',
      'Sunscreen for dark skin', 'Affordable K-beauty dupes',
      '5-step minimalist routines'
    ]
  };
}