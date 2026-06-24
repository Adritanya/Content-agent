export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { agent, data, niche, profile } = req.body;
  if (!agent || !data) return res.status(400).json({ error: 'Agent and data required' });

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Server not configured' });

  const NICHE_TRENDS = {
    'Skincare':['Glass skin tutorials','Skin barrier repair','Budget K-beauty dupes','Before and after transformations','Ingredient deep dives'],
    'Fashion':['Quiet luxury aesthetic','Thrift flip tutorials','Capsule wardrobe builds','Colour theory styling','Vintage fashion hauls'],
    'Fitness':['Pilates for beginners','Protein meal prep','Home workout no equipment','Running for weight loss','Gym aesthetic content'],
    'Food & Recipes':['High protein recipes','One-pan meals','Budget meal prep','Restaurant dupes at home','Viral TikTok recipes'],
    'Lifestyle':['Morning routine resets','Slow living aesthetic','Productivity systems','Apartment tours','Day in my life vlogs'],
    'Travel':['Budget travel tips','Solo travel for women','Hidden gem destinations','Travel packing guides','Digital nomad life'],
    'Finance':['Investing for beginners','Saving money hacks','Side hustle ideas','Debt payoff journeys','Passive income strategies'],
    'Tech':['AI tools for productivity','App reviews','Tech unboxing','Setup tours','Software comparisons'],
    'Business':['Entrepreneurship journeys','Behind the scenes','Personal branding tips','Client wins','Passive income'],
  };

  const seed = Math.random().toString(36).substring(2,6);
  const angles = ['beginner-friendly','advanced tips','myth-busting','budget-focused','luxury take','quick wins','deep dive','storytelling angle','hot take','relatable struggle','behind the scenes','product comparison'];
  const angle = angles[Math.floor(Math.random()*angles.length)];
  const a = data.your_account;
  const t = (a.top_posts && a.top_posts[0]) || {};
  const cap = t.caption || 'a recent post';
  const lk = t.likes || 0;
  const times = (a.best_posting_times || ['07:00','12:00','19:00']).join(', ');
  const tags = (a.top_hashtags || []).join(', ') || (niche||'content').toLowerCase();
  const trends = (NICHE_TRENDS[niche] || NICHE_TRENDS['Lifestyle']).join(', ');
  const posts = (a.top_posts || []).map((p,i) => `Post ${i+1}: "${p.caption}" — ${p.likes} likes (${p.type})`).join('\n');
  const prof = profile || {};
  const profileCtx = `Creator profile — Products: ${prof.products||'not specified'}. Audience: ${prof.audience||'not specified'}. Topics to focus on: ${prof.topics||'not specified'}. Content tone: ${(prof.tone||['Relatable']).join(', ')}.`;

  const prompts = {
    ideator: `Content ideation agent for @${a.handle} (${niche} niche).\n${profileCtx}\nFollowers: ${a.followers}. Engagement: ${a.engagement_rate}%.\nTrending: ${trends}.\nTheir posts:\n${posts}\nRun ID: ${seed}. Generate 3 COMPLETELY DIFFERENT ${niche} ideas using a ${angle} approach. Be specific, creative, never repeat previous ideas.\nFormat:\nIDEA: [title]\nWhy: [1 line]\nFormat: [Reel/Carousel/Story]\n---`,
    hookwriter: `Hook-writing agent for @${a.handle} (${niche} creator).\n${profileCtx}\nBest post: "${cap}" — ${lk} likes.\nWrite 3 scroll-stopping hooks (max 15 words each) that match their ${(prof.tone||['Relatable']).join('/')} tone and ${niche} niche.\nThen write a 60-word Reel script for the best hook in their voice.`,
    planner: `Content calendar agent for @${a.handle} (${niche}).\n${profileCtx}\nBest times: ${times}. Trending: ${trends}.\nPlan Mon-Sun this week. One post per day.\nFormat: DAY | TIME | FORMAT | TOPIC\nAll topics must be specific to ${niche} and their profile focus areas.`,
    analyst: `Performance analyst for @${a.handle} (${niche} creator).\nFollowers: ${a.followers}. Engagement: ${a.engagement_rate}% (avg ~4%).\nActual post performance:\n${posts}\nBest hashtags: ${tags}.\nGive 3 specific actionable insights based on THIS creator's actual data. Start each with -`,
    dmmanager: `DM manager for @${a.handle} (${a.followers} followers, ${niche} creator).\n${profileCtx}\nWrite 4 short warm DM reply templates (max 2 sentences each) for:\n1. "Where do you get your products?"\n2. "Can you collab?"\n3. "You're so inspiring!"\n4. "How did you grow your account?"\nMatch their ${(prof.tone||['Relatable']).join('/')} tone. Reference their actual products if mentioned. Sound like a real person.`
  };

  const prompt = prompts[agent];
  if (!prompt) return res.status(400).json({ error: 'Invalid agent' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    const result = await r.json();
    if (result.error) return res.status(400).json({ error: result.error.message });
    return res.status(200).json({ success: true, result: result.choices[0].message.content });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}