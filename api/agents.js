export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { agent, data, niche, profile, messages, prompt, context } = req.body;
  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Server not configured' });

  const TRENDS = {
    'Skincare':['Glass skin tutorials','Skin barrier repair','Budget K-beauty dupes','Before and after','Ingredient deep dives'],
    'Fashion':['Quiet luxury','Thrift flips','Capsule wardrobe','Colour theory','Vintage hauls'],
    'Fitness':['Pilates for beginners','Protein prep','Home workouts','Running tips','Gym aesthetic'],
    'Food & Recipes':['High protein recipes','One-pan meals','Budget meal prep','Restaurant dupes','Viral recipes'],
    'Lifestyle':['Morning routine resets','Slow living','Productivity systems','Apartment tours','Day in my life'],
    'Travel':['Budget travel','Solo travel','Hidden gems','Packing guides','Digital nomad'],
    'Finance':['Investing basics','Saving hacks','Side hustles','Debt payoff','Passive income'],
    'Tech':['AI tools','App reviews','Tech unboxing','Setup tours','Software tips'],
    'Business':['Entrepreneur journey','Behind the scenes','Personal branding','Client wins','Passive income'],
  };

  const seed = Math.random().toString(36).substring(2,6);
  const angles = ['beginner-friendly','budget-focused','myth-busting','storytelling','hot take','relatable struggle','behind the scenes','product comparison','emotional hook','educational series'];
  const angle = angles[Math.floor(Math.random()*angles.length)];

  const WRITING_STYLE = `Write like an experienced social media consultant giving advice to a creator. Use natural, conversational, professional language. Do NOT use markdown formatting - no asterisks, no bold, no bullet symbols, no hashtag headings, no numbered lists with dots. Write in plain sentences and short paragraphs. Sound human and insightful, not like an AI chatbot.`;
  let systemPrompt = '';
  let userMessages = [];

  // Handle conversational mode (AI Content Lab)
  if (messages && messages.length > 0) {
    const a = data?.your_account || {};
    const pc = profile ? `Creator: ${profile.products||''} | Audience: ${profile.audience||''} | Tone: ${(profile.tone||[]).join(', ')}` : '';
    systemPrompt = `You are an expert Instagram content strategist and copywriter for @${a.handle||'creator'} (${niche||'content'} niche). ${pc}. ${WRITING_STYLE}`;
    userMessages = messages.map(m => ({ role: m.role, content: m.content }));
  } else {
    // Standard agent mode
    if (!agent || !data) return res.status(400).json({ error: 'Agent and data required' });
    const a = data.your_account;
    const t = (a.top_posts && a.top_posts[0]) || {};
    const cap = t.caption || 'a recent post';
    const lk = t.likes || 0;
    const times = (a.best_posting_times || ['07:00','12:00','19:00']).join(', ');
    const tags = (a.top_hashtags || []).join(', ') || (niche||'content').toLowerCase();
    const tr = (TRENDS[niche] || TRENDS['Lifestyle']).join(', ');
    const posts = (a.top_posts || []).map((p,i) => `Post ${i+1}: "${p.caption}" — ${p.likes} likes (${p.type})`).join('\n');
    const pc = profile ? `Products: ${profile.products||'not set'}. Audience: ${profile.audience||'not set'}. Topics: ${profile.topics||'not set'}. Tone: ${(profile.tone||['Relatable']).join(', ')}.` : '';

    systemPrompt = `You are an expert Instagram content strategist for @${a.handle} (${niche} niche). ${WRITING_STYLE}`;

    const prompts = {
      ideator: `${pc}\nFollowers: ${a.followers}. Engagement: ${a.engagement_rate}%.\nTrending: ${tr}.\nPosts:\n${posts}\nRun ${seed} — Generate 3 COMPLETELY DIFFERENT ${niche} ideas using ${angle} approach. Reference their actual products/style.\nFormat:\nIDEA: [title]\nWhy: [1 line]\nFormat: [Reel/Carousel/Story]\n---`,
      hookwriter: `${pc}\nBest post: "${cap}" — ${lk} likes.\nRun ${seed} — Write 3 BRAND NEW hooks (max 15 words, ${angle} angle). Then write 60-word Reel script in their voice.`,
      planner: `${pc}\nBest times: ${times}. Trending: ${tr}.\nPlan Mon-Sun. One post/day. Format: DAY | TIME | FORMAT | TOPIC. All specific to ${niche}.`,
      analyst: `You are a social media analyst for @${a.handle}. Followers: ${a.followers}. Engagement: ${a.engagement_rate}% (industry average is around 4%).\nActual posts: ${posts}\nTop hashtags: ${tags}.\n\nWrite 3 specific, insightful observations about this creator's performance in plain professional sentences. No markdown, no bullet symbols, no asterisks.\n\nINSIGHT 1\n[2-3 sentences analyzing a specific pattern in their data]\n\nINSIGHT 2\n[2-3 sentences about what is or isn't working]\n\nINSIGHT 3\n[2-3 sentences with a specific recommendation based on their data]\n\nSound like a consultant who has studied their account carefully.`,
      dmmanager: `${pc}\nRun ${seed} — Write 4 FRESH DM replies (${angle}, max 2 sentences each):\n1. "Where products?"\n2. "Collab?"\n3. "You're inspiring!"\n4. "How did you grow?"\nMatch their tone. Sound real, personal.`,
      // NEW AGENTS
      audit: `You are a social media consultant conducting a creator audit. First, read these actual Instagram posts carefully:\n\nPosts:\n${posts}\nHandle: @${a.handle}. Followers: ${a.followers}. Engagement: ${a.engagement_rate}%. Total posts: ${a.total_posts}.\n${pc}\n\nFrom the post content, identify: what niche this creator is actually in, their content style, and their audience type. Do not assume any niche - detect it from the data.\n\nThen write a personalized audit using plain, professional sentences (no markdown, no asterisks, no bullet symbols):\n\nSTRENGTHS\n[2-3 sentences about specific strengths visible in their actual posts]\n\nWEAKNESSES\n[2-3 sentences about specific areas to improve based on their data]\n\nGROWTH OPPORTUNITIES\n[3 sentences, each describing a specific opportunity for their detected niche]\n\nNEXT BEST ACTIONS\n[3 sentences, each a specific immediate action step for their niche]\n\nWrite like a consultant, not an AI. Sound specific, insightful, and human.`,
      opportunities: `You are a content strategist. Read these actual Instagram posts:\n\nPosts:\n${posts}\nHandle: @${a.handle}. Followers: ${a.followers}. Engagement: ${a.engagement_rate}%.\n${pc}\n\nDetect their actual niche from the post content. Then write opportunities in plain professional sentences (no markdown, no asterisks, no bullet symbols):\n\nTRENDING OPPORTUNITIES\n[3 sentences, each describing a specific trending topic in their detected niche right now]\n\nCONTENT GAPS\n[3 sentences, each describing a specific angle they haven't covered but their audience wants]\n\nSERIES IDEAS\n[2 sentences describing content series ideas with episode concepts specific to their niche]\n\nWrite like a consultant giving strategic advice. Sound specific and human.`,
      ideas_feed: `Creator: @${a.handle} (${niche}). ${pc}\nRun ${seed} — Generate 6 FRESH content ideas (${angle} approach):\n- 2 Reel ideas\n- 2 Carousel ideas  \n- 1 Storytelling concept\n- 1 Educational series idea\nFormat each:\nTITLE: [catchy title]\nTYPE: [format]\nHOOK: [opening line]\nWHY: [why it will perform]`,
      competitor: `Niche: ${niche}. Creator: @${a.handle}. Engagement: ${a.engagement_rate}%.\nAnalyze what successful ${niche} creators do:\n1. TOP CONTENT FORMATS that work in ${niche}\n2. WINNING HOOK PATTERNS (3 examples)\n3. CONTENT GAPS they leave open\n4. STRATEGIC RECOMMENDATIONS (3 specific)\nBase on real trends in ${niche}.`,
      expand_idea: `Take this idea and expand it into a complete content package:\nIDEA: ${context||cap}\nNiche: ${niche}. ${pc}\nGenerate:\n1. HOOK (3 options, max 15 words each)\n2. SCRIPT (60-word reel script)\n3. CAPTION (with emojis, max 150 words)\n4. CTA (2 options)\n5. HASHTAGS (10 relevant hashtags)\n6. THUMBNAIL CONCEPT`,
    };

    userMessages = [{ role: 'user', content: prompts[agent] || prompt || 'Help me with content.' }];
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1200,
        messages: [{ role: 'system', content: systemPrompt }, ...userMessages]
      })
    });
    const result = await r.json();
    if (result.error) return res.status(400).json({ error: result.error.message });
    return res.status(200).json({ success: true, result: result.choices[0].message.content });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}