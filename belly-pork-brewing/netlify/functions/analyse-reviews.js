/**
 * Belly Pork Brewing Co. — Review Analysis Function
 * Netlify serverless function that analyses reviews.json using OpenAI GPT-4o-mini.
 * Caches results in memory and /tmp for 1 hour.
 */

const fs = require('fs');
const path = require('path');

// ─── In-memory cache ───
let memoryCache = null;
let memoryCacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const TMP_CACHE_PATH = '/tmp/bpb-analysis.json';

function getCachedResult() {
  const now = Date.now();

  // Check memory cache first (fastest)
  if (memoryCache && (now - memoryCacheTime) < CACHE_TTL_MS) {
    console.log('Returning memory-cached analysis');
    return memoryCache;
  }

  // Check /tmp file cache
  try {
    if (fs.existsSync(TMP_CACHE_PATH)) {
      const raw = fs.readFileSync(TMP_CACHE_PATH, 'utf-8');
      const cached = JSON.parse(raw);
      if (cached.generatedAt && (now - new Date(cached.generatedAt).getTime()) < CACHE_TTL_MS) {
        console.log('Returning /tmp file-cached analysis');
        memoryCache = cached;
        memoryCacheTime = new Date(cached.generatedAt).getTime();
        return cached;
      }
    }
  } catch (err) {
    console.warn('Could not read /tmp cache:', err.message);
  }

  return null;
}

function saveToCache(data) {
  memoryCache = data;
  memoryCacheTime = Date.now();
  try {
    fs.writeFileSync(TMP_CACHE_PATH, JSON.stringify(data), 'utf-8');
  } catch (err) {
    console.warn('Could not write /tmp cache:', err.message);
  }
}

async function loadReviews() {
  // Try filesystem first (works in Netlify functions with included files)
  const fsPath = path.join(__dirname, '../../public/data/reviews.json');
  try {
    if (fs.existsSync(fsPath)) {
      const raw = fs.readFileSync(fsPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read reviews from filesystem:', err.message);
  }

  // Fall back to HTTP fetch
  const baseUrl = process.env.URL || 'http://localhost:8888';
  const url = `${baseUrl}/data/reviews.json`;
  console.log(`Fetching reviews from: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching reviews.json`);
  return resp.json();
}

function computeLocalStats(reviews) {
  // Rating breakdown
  const ratingBreakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  reviews.forEach(r => {
    const key = String(Math.round(r.rating));
    if (ratingBreakdown[key] !== undefined) ratingBreakdown[key]++;
  });

  // Beer counts and avg ratings
  const beers = ['Narcoleptic NEIPA', 'Reverse Weave', 'Fanny Buffet'];
  const beerCounts = {};
  const beerAvgRating = {};
  beers.forEach(beer => {
    const beerReviews = reviews.filter(r => r.beer_reviewed === beer);
    beerCounts[beer] = beerReviews.length;
    beerAvgRating[beer] = beerReviews.length > 0
      ? parseFloat((beerReviews.reduce((s, r) => s + r.rating, 0) / beerReviews.length).toFixed(2))
      : 0;
  });

  // Brewer mentions (case-insensitive search in review text)
  const brewers = ['Graham', 'Harv', 'Stew', 'Browny'];
  const brewerMentions = {};
  const brewerAvgRating = {};
  brewers.forEach(brewer => {
    const re = new RegExp(brewer, 'i');
    const mentioned = reviews.filter(r => re.test(r.review) || re.test(r.name || ''));
    brewerMentions[brewer] = mentioned.length;
    brewerAvgRating[brewer] = mentioned.length > 0
      ? parseFloat((mentioned.reduce((s, r) => s + r.rating, 0) / mentioned.length).toFixed(2))
      : 0;
  });

  return { ratingBreakdown, beerCounts, beerAvgRating, brewerMentions, brewerAvgRating };
}

function sampleReviews(reviews) {
  const sample = [];
  const used = new Set();

  function addReviews(subset, n) {
    const shuffled = [...subset].sort(() => Math.random() - 0.5);
    let added = 0;
    for (const r of shuffled) {
      if (added >= n) break;
      if (!used.has(r.id)) {
        sample.push(r);
        used.add(r.id);
        added++;
      }
    }
  }

  // 30 mentioning Graham
  addReviews(reviews.filter(r => /graham/i.test(r.review)), 30);
  // 20 mentioning Browny
  addReviews(reviews.filter(r => /browny/i.test(r.review)), 20);
  // 15 mentioning Harv
  addReviews(reviews.filter(r => /harv/i.test(r.review)), 15);
  // 15 mentioning Stew
  addReviews(reviews.filter(r => /\bstew\b/i.test(r.review)), 15);
  // 20 Narcoleptic NEIPA
  addReviews(reviews.filter(r => r.beer_reviewed === 'Narcoleptic NEIPA'), 20);
  // 15 Reverse Weave
  addReviews(reviews.filter(r => r.beer_reviewed === 'Reverse Weave'), 15);
  // 15 Fanny Buffet
  addReviews(reviews.filter(r => r.beer_reviewed === 'Fanny Buffet'), 15);
  // 20 random brewery reviews
  addReviews(reviews.filter(r => r.category === 'brewery'), 20);

  return sample;
}

async function callOpenAI(reviews, localStats) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const sampleJson = JSON.stringify(reviews.slice(0, 150), null, 0);
  const statsJson = JSON.stringify(localStats, null, 0);

  const systemPrompt = `You are a data analyst for Belly Pork Brewing Co., a craft brewery in Bungay, Suffolk. Analyse the provided customer reviews and return a JSON analysis object.

The brewery has four brewers:
- Graham (Head of Taste): legendary status, cannot stop talking about his 10k PB running time
- Harv: warm, knowledgeable, deeply passionate, people drive 90 minutes to see him
- Stew: quiet genius, brilliant host, the brains behind the operation
- Browny: chaotic, incompetent, somehow still employed — serves wrong beers, recommends supermarket lager, forgets orders

The three beers are: Narcoleptic NEIPA (DIPA 8.4%), Reverse Weave (Pale Ale 5.7%), Fanny Buffet (West Coast IPA 5.7%).

Return ONLY valid JSON matching the exact schema provided. Use the brand voice: no-nonsense, slightly irreverent, honest, craft beer passionate.`;

  const userPrompt = `Analyse these ${reviews.length} sampled customer reviews and the pre-computed stats.

LOCAL STATS (computed from all 1000 reviews):
${statsJson}

SAMPLED REVIEWS (${reviews.length} reviews for qualitative analysis):
${sampleJson}

Return JSON with EXACTLY this structure:
{
  "summary": "2-3 sentence paragraph in brand voice summarising the overall customer sentiment",
  "topThemes": ["up to 10 short phrases representing the most common themes"],
  "brewerSentiment": {
    "Graham": { "sentiment": "one word", "topAdjectives": ["word1", "word2", "word3"], "funFact": "notable detail from reviews e.g. 10k PB obsession" },
    "Harv": { "sentiment": "one word", "topAdjectives": ["word1", "word2", "word3"], "funFact": "notable detail from reviews" },
    "Stew": { "sentiment": "one word", "topAdjectives": ["word1", "word2", "word3"], "funFact": "notable detail from reviews" },
    "Browny": { "sentiment": "one word", "topAdjectives": ["word1", "word2", "word3"], "funFact": "most memorable disaster mentioned in reviews" }
  },
  "beerSentiment": {
    "Narcoleptic NEIPA": { "topNotes": ["note1", "note2", "note3"], "standoutQuote": "short memorable quote from a review" },
    "Reverse Weave": { "topNotes": ["note1", "note2", "note3"], "standoutQuote": "short memorable quote from a review" },
    "Fanny Buffet": { "topNotes": ["note1", "note2", "note3"], "standoutQuote": "short memorable quote from a review" }
  },
  "funniestReview": { complete review object with all original fields },
  "worstBrownyMoment": { complete review object with all original fields },
  "reviewOfTheWeek": { complete review object with all original fields },
  "commonPhrases": ["up to 8 phrases that appear repeatedly across reviews"]
}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return JSON.parse(data.choices[0].message.content);
}

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  };

  // Check cache first for instant warm responses
  const cached = getCachedResult();
  if (cached) {
    return { statusCode: 200, headers, body: JSON.stringify(cached) };
  }

  // Load reviews
  let reviews;
  try {
    reviews = await loadReviews();
  } catch (err) {
    console.error('Could not load reviews:', err.message);
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'reviews_not_generated',
        message: 'Run node scripts/generate-reviews.js first to generate the reviews data.',
      }),
    };
  }

  // Compute local stats from all reviews
  const localStats = computeLocalStats(reviews);

  // Sample reviews for AI analysis
  const sample = sampleReviews(reviews);

  // Call OpenAI for qualitative analysis
  let aiAnalysis = null;
  try {
    aiAnalysis = await callOpenAI(sample, localStats);
  } catch (err) {
    console.error('OpenAI analysis failed:', err.message);
    // Return stats-only response without AI analysis
    const fallbackResult = {
      ...localStats,
      totalReviews: reviews.length,
      aiAnalysis: false,
      aiError: err.message,
      generatedAt: new Date().toISOString(),
    };
    saveToCache(fallbackResult);
    return { statusCode: 200, headers, body: JSON.stringify(fallbackResult) };
  }

  // Merge AI analysis with local stats
  const result = {
    ...aiAnalysis,
    ...localStats,
    totalReviews: reviews.length,
    aiAnalysis: true,
    generatedAt: new Date().toISOString(),
  };

  saveToCache(result);

  return { statusCode: 200, headers, body: JSON.stringify(result) };
};
