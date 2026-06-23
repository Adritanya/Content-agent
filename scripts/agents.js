// api/agents.js — Vercel serverless function
// Runs all 5 AI agents using Groq (hidden key)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { agent, data } = req.body;
  if (!agent || !data) return res.status(400).json({ error: 'Agent and data required' });

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Server not configured' });

  const prompt = getPrompt(agent, data);
  if (!prompt) return res.status(400).json({ error: 'Invalid agent' });

  try {
    const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const result = await res2.json();
    if (result.error) return res.status(400).json({ error: result.error.message });
    return res.status(200).json({ success: true, result: result.choices[0].message.content });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}

function getPrompt(agent, data) {
  const a       = data.your_account;
  const topPost = (a.top_posts && a.top_posts[0]) || {};
  const caption = topPost.caption || 'content post';
  const likes   = topPost.likes   || 0;
  const times   = (a.best_posting_times || ['07:00','12:00','19:00']).join(', ');
  const tags    = (a.top_hashtags || []).join(', ') || 'content creation';
  const trends  = (data.niche_trends || []).join(', ');

  const prompts = {
    ideator:    `You are a content ideation agent for Instagram creator @${a.handle}. Followers: ${a.followers}. Engagement: ${a.engagement_rate}%. Niche trends: ${trends}. Top post: "${caption}" (${likes} likes). Generate 3 fresh content ideas for this week. Format each as: IDEA: [title] / Why: [1 line] / Format: [Reel/Carousel/Story]. Keep it punchy.`,
    hookwriter: `You are a hook-writing agent for Instagram creator @${a.handle}. Best post: "${caption}" - ${likes} likes. Write 3 scroll-stopping hooks (max 15 words each). Then write a 60-word Reel script for the best hook.`,
    planner:    `You are a content calendar agent for @${a.handle}. Best posting times: ${times}. Plan content Mon-Sun this week. One post per day. Format: DAY | TIME | FORMAT | TOPIC. Keep topics specific to their niche.`,
    analyst:    `You are a performance analyst for @${a.handle}. Followers: ${a.followers}. Engagement: ${a.engagement_rate}% (avg ~4%). Top post: "${caption}" - ${likes} likes. Best hashtags: ${tags}. Give 3 specific actionable insights. Start each with -`,
    dmmanager:  `You are a DM manager for @${a.handle} (${a.followers} followers). Write 4 short warm DM reply templates for: 1."Where do you get your products?" 2."Can you collab?" 3."You're so inspiring!" 4."What camera do you use?" Max 2 sentences each. Sound like a real person.`
  };
  return prompts[agent];
}