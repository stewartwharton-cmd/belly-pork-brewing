#!/usr/bin/env node
/**
 * Belly Pork Brewing Co. — Review Generator
 * Generates 1,000 realistic fake reviews via OpenAI API and saves to public/data/reviews.json
 * Node 18+ required (uses native fetch)
 *
 * Usage: OPENAI_API_KEY=sk-... node scripts/generate-reviews.js
 */

'use strict';

const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set.');
  console.error('Usage: OPENAI_API_KEY=sk-... node scripts/generate-reviews.js');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are generating realistic fake customer reviews for Belly Pork Brewing Co., a craft brewery in Bungay, Suffolk, England, founded in 2024.

THE BREWERY: Belly Pork Brewing Co., Bungay, Suffolk, England. Founded 2024. Independent craft beer, no-nonsense, slightly irreverent. Small-batch, passion-driven.

THE BEERS:
- Narcoleptic NEIPA (DIPA, 8.4% ABV): hazy golden orange colour, massive tropical aroma of mango, passionfruit and peach with a dank resin undertone, pillowy soft mouthfeel, tropical fruit bomb finish. Named because it puts you to sleep due to the strength. An absolute banger.
- Reverse Weave (Pale Ale, 5.7% ABV): smooth, easy-drinking, crisp with subtle citrus notes, crushable session beer, clean finish.
- Fanny Buffet (West Coast IPA, 5.7% ABV): big bitter West Coast IPA, pine resin forward, grapefruit zest, bold dry hop presence, traditional West Coast bitter finish.

THE BREWERS:

GRAHAM (Head of Taste — "The Legend"):
- Almost universally receives 5 stars. He has achieved legendary status. People travel from London specifically to meet him.
- Larger than life personality. Knows beer inside out. Funny, opinionated, warm, welcoming.
- CRITICAL DETAIL: He cannot stop talking about his 10k PB (personal best running time). No matter what the conversation is about, he somehow steers it back to running. This appears in approximately 8% of reviews that mention Graham. Examples: "He told me about his 10k PB three times while pouring my pint." / "BEST BEER. Also Graham's 10k time is 52:14 apparently. He told me three times." / "We came to talk beer. Graham talked about his 10k for 20 minutes. Still gave it 5 stars."
- Multiple reviewers say he should have his own TV show or podcast.
- Some reviewers mention he's the reason they became craft beer fans.

HARV:
- Consistently 4-5 stars. Warm and genuine. Deeply passionate about craft beer.
- Knowledgeable but never condescending — explains things in a way that makes everyone feel included.
- People drive 90 minutes just to visit Harv again. Multiple reviews mention making return trips specifically for him.

STEW:
- Consistently 4-5 stars. Makes absolutely everyone feel welcome. Brilliant host. The quiet genius of the operation.
- Widely regarded as the brains behind a lot of what makes Belly Pork Brewing work.
- Several reviews specifically mention he remembered their previous order from months ago without being prompted.
- Understated, thoughtful, always has the right recommendation.

BROWNY (The Problem):
- Receives 1-3 stars when mentioned. Mixed to poor performance. A source of chaos and mild horror.
- Known incidents (use these across different reviews, don't cluster them all in one review):
  * Forgot an order entirely, then confidently denied it ever happened
  * Served the completely wrong beer with full confidence and no apology
  * Recommended a supermarket lager (Stella, Carling) to a craft beer enthusiast — this is deeply offensive to beer geeks
  * Seemed permanently distracted / kept checking his phone mid-conversation
  * Called a stout a porter — a basic brewer error that caused genuine offence
  * Forgot to charge someone, then awkwardly asked for money later via text
  * One review must be literally just "Browny." — 1 star, no other text
  * One review: "The other three are absolute legends. Browny exists."
  * One review: "Came for the NEIPA. Got something from Asda. Thanks Browny."
  * One review: "I ordered a stout and got a water. Browny seemed proud of this."
  * Despite all this, he is somehow still employed. Several reviewers note this with bewilderment.

REVIEWER TYPES AND THEIR LOCATIONS:
- local: Lives in Bungay, Beccles, Halesworth, Southwold, Lowestoft, Eye, Diss, Framlingham
- visitor: Drove from London (Hackney, Shoreditch, Clapham, Brixton, Islington, Dalston, Bethnal Green) or elsewhere (Cambridge, Norwich, Bristol, Brighton, Leeds, Manchester, Birmingham)
- beer_geek: Uses technical language — IBUs, dry-hop additions, haze levels, mouthfeel descriptors, BJCP categories, yeast esters, hop varieties (Mosaic, Citra, Galaxy, Simcoe, Idaho 7, El Dorado)
- casual: Just wants a nice pint, simple everyday language

WRITING STYLES (vary enormously across the 1000 reviews):
1. TripAdvisor style: "Visited on a wet Thursday with my wife and two friends..."
2. Google Review style: Short and punchy, 1-3 sentences
3. Beer geek technical: Full treatise with hop varieties, IBU estimates, BJCP comparisons
4. Casual mate texting: "bro this neipa is genuinely something else ngl" "absolutely banging"
5. Elderly and polite: "A most charming establishment. The young man was extremely courteous."
6. Tipsy reviewer: Enthusiastic, escalating typos, "BEST BEER OF MY ENTIRE LIFE"
7. One or two words only: "Perfect." / "Unreal." / "Browny."
8. Mini essay: 3-4 paragraphs covering atmosphere, beer quality, staff, and would-return

NAMES: Realistic UK names. Mix of traditional (David, Susan, Michael, Margaret, Colin, Barbara, Peter, Janet, Robert, Linda) and modern (Jake, Zoe, Tom, Amy, Josh, Emma, Dan, Sarah, Matt, Lucy, Ben, Sophie, James, Olivia). Some beer community personas: "Ale Trail Andy", "Hop Head Mike", "NEIPA Nicki".

STAFF MENTIONS IN BEER AND BREWERY REVIEWS:
- In beer reviews (category: beer) and brewery reviews (category: brewery), approximately 15-20% of reviews should naturally mention a staff member by name (Graham, Harv, Stew, or Browny)
- These mentions should feel organic: "Graham recommended I try this", "Stew poured me a tasting flight", "Harv explained the hop profile", "Browny somehow handed me the wrong glass"
- Spread mentions across all four names — do not cluster them

IMPORTANT RULES:
- Ratings must match the content — a glowing review needs 4-5 stars, a terrible Browny review needs 1-2 stars
- Dates must be realistic for the brewery (founded 2024), ranging from 2024-01 through 2025-12
- Vary locations, writing styles, and reviewer types throughout each batch
- No two reviews should sound the same
- Make the reviews feel authentically human — include typos in casual ones, overly formal language in elderly ones, etc.
- You MUST respond with valid JSON in this exact structure: {"reviews": [...]}

REVIEW SCHEMA — each review must have ALL these fields:
{
  "id": "rev_XXXX",  // zero-padded 4 digits
  "name": "string",  // reviewer name
  "location": "string",  // their town/city
  "date": "YYYY-MM-DD",  // review date
  "rating": 1,  // integer 1-5
  "category": "beer|brewery|brewer",  // what is being reviewed
  "beer_reviewed": "Narcoleptic NEIPA|Reverse Weave|Fanny Buffet|null",  // null as string for non-beer reviews
  "reviewer_type": "local|visitor|beer_geek|casual",  // type of reviewer
  "review": "string",  // the actual review text
  "verified_purchase": true  // always true
}`;

// Batch specifications
const BATCH_SPECS = [
  // Batches 1-4: Narcoleptic NEIPA (rev_0001 - rev_0200)
  { startId: 1,   count: 50, focus: 'Narcoleptic NEIPA beer reviews', category: 'beer', beer: 'Narcoleptic NEIPA', dateRange: '2024-01 to 2024-06', notes: 'Mix of all reviewer types. Early adopters. Some amazed this exists in Suffolk.' },
  { startId: 51,  count: 50, focus: 'Narcoleptic NEIPA beer reviews', category: 'beer', beer: 'Narcoleptic NEIPA', dateRange: '2024-06 to 2024-12', notes: 'Word is spreading. Some visitors from London starting to appear. One or two beer geeks.' },
  { startId: 101, count: 50, focus: 'Narcoleptic NEIPA beer reviews', category: 'beer', beer: 'Narcoleptic NEIPA', dateRange: '2025-01 to 2025-06', notes: 'Growing reputation. More beer geeks. Multiple repeat visitors. A few mention the name is apt — it knocked them out.' },
  { startId: 151, count: 50, focus: 'Narcoleptic NEIPA beer reviews', category: 'beer', beer: 'Narcoleptic NEIPA', dateRange: '2025-06 to 2025-12', notes: 'Established reputation. Some "been coming since day one" reviews. Beer geeks comparing to other NEIPAs nationally.' },

  // Batches 5-8: Reverse Weave (rev_0201 - rev_0400)
  { startId: 201, count: 50, focus: 'Reverse Weave Pale Ale reviews', category: 'beer', beer: 'Reverse Weave', dateRange: '2024-01 to 2024-06', notes: 'The approachable one. Locals love it. Good gateway beer. Casual reviewers dominant.' },
  { startId: 251, count: 50, focus: 'Reverse Weave Pale Ale reviews', category: 'beer', beer: 'Reverse Weave', dateRange: '2024-06 to 2024-12', notes: 'Mix of locals and visitors. Some compare it favourably to mainstream pale ales. Crushability mentioned often.' },
  { startId: 301, count: 50, focus: 'Reverse Weave Pale Ale reviews', category: 'beer', beer: 'Reverse Weave', dateRange: '2025-01 to 2025-06', notes: 'Growing following. Some reviews from beer geeks who appreciate the balance. A few prefer it to the NEIPA.' },
  { startId: 351, count: 50, focus: 'Reverse Weave Pale Ale reviews', category: 'beer', beer: 'Reverse Weave', dateRange: '2025-06 to 2025-12', notes: 'Solid reputation as the "reliable" beer. Some note it pairs well with food. Session beer crowd loves it.' },

  // Batches 9-12: Fanny Buffet (rev_0401 - rev_0600)
  { startId: 401, count: 50, focus: 'Fanny Buffet West Coast IPA reviews', category: 'beer', beer: 'Fanny Buffet', dateRange: '2024-01 to 2024-06', notes: 'West Coast IPA fans delighted. Name causes reactions — some amused, some bemused, all entertained.' },
  { startId: 451, count: 50, focus: 'Fanny Buffet West Coast IPA reviews', category: 'beer', beer: 'Fanny Buffet', dateRange: '2024-06 to 2024-12', notes: 'Word of mouth on the name. People come specifically to try "the one with the name". Beer quality lives up to it.' },
  { startId: 501, count: 50, focus: 'Fanny Buffet West Coast IPA reviews', category: 'beer', beer: 'Fanny Buffet', dateRange: '2025-01 to 2025-06', notes: 'Beer geeks breaking down the hop profile. Piney bitterness vs grapefruit debate. Classic West Coast fans thrilled.' },
  { startId: 551, count: 50, focus: 'Fanny Buffet West Coast IPA reviews', category: 'beer', beer: 'Fanny Buffet', dateRange: '2025-06 to 2025-12', notes: 'Some comparing it to classic American West Coast IPAs. Name still getting reactions from new visitors. Strong following.' },

  // Batches 13-16: General brewery experience (rev_0601 - rev_0800)
  { startId: 601, count: 50, focus: 'General brewery visit and atmosphere reviews', category: 'brewery', beer: 'null', dateRange: '2024-01 to 2024-06', notes: 'Early days atmosphere, buzz of something new. Mix of locals discovering it and first visitors.' },
  { startId: 651, count: 50, focus: 'General brewery visit and atmosphere reviews', category: 'brewery', beer: 'null', dateRange: '2024-06 to 2024-12', notes: 'Community feel developing. Events mentioned. Word spreading. Some reviews from groups and couples.' },
  { startId: 701, count: 50, focus: 'General brewery visit and atmosphere reviews', category: 'brewery', beer: 'null', dateRange: '2025-01 to 2025-06', notes: 'Established local institution. Some disappointed it is not open more. Others treating it as a destination.' },
  { startId: 751, count: 50, focus: 'General brewery visit and atmosphere reviews', category: 'brewery', beer: 'null', dateRange: '2025-06 to 2025-12', notes: 'Bucket list destination for some. Return visitors. People bring friends. Some brewery tour mentions.' },

  // Batches 17-18: Brewer reviews, Graham and Stew focus (rev_0801 - rev_0900)
  { startId: 801, count: 50, focus: 'Brewer/staff reviews focusing 60% Graham, 40% Stew', category: 'brewer', beer: 'null', dateRange: '2024-06 to 2025-06', notes: 'REQUIRED: Every review in this batch MUST mention a brewer by name (Graham or Stew). Graham: legendary status, knowledgeable, funny, 10k PB mentioned in ~8% of Graham reviews, TV show suggestions. Stew: quiet genius, remembers orders, brilliant host, welcoming. Mix of visitor and local reviewers.' },
  { startId: 851, count: 50, focus: 'Brewer/staff reviews focusing 60% Graham, 40% Stew', category: 'brewer', beer: 'null', dateRange: '2024-08 to 2025-12', notes: 'REQUIRED: Every review in this batch MUST mention a brewer by name (Graham or Stew). More Graham legends. Some compare him to famous beer personalities. Stew: the unsung hero, brains of the operation. A couple of reviews mention both together. The 10k PB trait in ~8% of Graham reviews.' },

  // Batch 19: Harv and Browny (rev_0901 - rev_0950)
  { startId: 901, count: 50, focus: 'Brewer reviews: 50% Harv, 50% Browny', category: 'brewer', beer: 'null', dateRange: '2024-03 to 2025-12', notes: 'REQUIRED: Every review in this batch MUST mention Harv or Browny by name. Harv: 4-5 stars, warm, knowledgeable, people drive 90 minutes to see him. Browny: 1-3 stars, various disasters — wrong beer, phone checking, Stella recommendation, stout/porter confusion, forgot to charge then texted asking for money. Include these exact reviews: one that is just "Browny." at 1 star, "The other three are absolute legends. Browny exists.", "Came for the NEIPA. Got something from Asda. Thanks Browny.", "I ordered a stout and got a water. Browny seemed proud of this."' },

  // Batch 20: Mixed brewer reviews including iconic Browny moments (rev_0951 - rev_1000)
  { startId: 951, count: 50, focus: 'Mixed brewer reviews, several memorable Browny incidents, some Harv and Graham', category: 'brewer', beer: 'null', dateRange: '2024-01 to 2025-12', notes: 'REQUIRED: Every review in this batch MUST mention a brewer by name (Browny, Harv, or Graham). Include a variety: some positive Harv and Graham reviews, but mostly Browny disasters. Include more Browny-specific incidents spread throughout — phone checking, wrong recommendations, confident errors. A few reviews note bewilderment that he still works there. Make them funny and varied. Rating range 1-5.' },
];

async function callOpenAI(messages, retryAttempt = 0) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.95,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function withRetry(fn, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = Math.pow(2, attempt) * 2000;
      console.log(`  Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function generateBatch(spec) {
  const userMessage = `Generate exactly ${spec.count} customer reviews for Belly Pork Brewing Co.

FOCUS: ${spec.focus}
CATEGORY: ${spec.category}
BEER REVIEWED: ${spec.beer} (use this exact string, or "null" for non-beer reviews)
DATE RANGE: Reviews should be dated within ${spec.dateRange}
ADDITIONAL NOTES: ${spec.notes}

ID RANGE: rev_${String(spec.startId).padStart(4, '0')} through rev_${String(spec.startId + spec.count - 1).padStart(4, '0')}

REQUIREMENTS:
- Generate EXACTLY ${spec.count} reviews
- IDs must be sequential starting from rev_${String(spec.startId).padStart(4, '0')}
- Vary writing styles, names, locations, and reviewer types across this batch
- Ratings must match the review content
- beer_reviewed field: use exactly "${spec.beer}" (the string "null" for brewery/brewer reviews)
- category field: use exactly "${spec.category}"
- verified_purchase: true for ~70% of reviews, false for the rest (use false more for 1-2 star reviews)${spec.category === 'brewer' ? '\n- CRITICAL: Every single review in this batch MUST include a brewer\'s name (Graham, Harv, Stew, or Browny) naturally in the review text' : '\n- STAFF MENTIONS: ~15-20% of reviews in this batch should naturally mention a staff member by name (Graham, Harv, Stew, or Browny)'}

Return JSON: {"reviews": [array of ${spec.count} review objects]}`;

  const rawContent = await withRetry(() => callOpenAI([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]));

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}\nRaw: ${rawContent.substring(0, 500)}`);
  }

  if (!parsed.reviews || !Array.isArray(parsed.reviews)) {
    throw new Error(`Response missing reviews array. Keys: ${Object.keys(parsed).join(', ')}`);
  }

  if (parsed.reviews.length !== spec.count) {
    console.warn(`  Warning: Expected ${spec.count} reviews, got ${parsed.reviews.length}`);
  }

  return parsed.reviews;
}

async function main() {
  console.log('Belly Pork Brewing Co. — Review Generator');
  console.log('==========================================');
  console.log(`Generating 1,000 reviews in ${BATCH_SPECS.length} batches...`);
  console.log('');

  const allReviews = [];
  const outputPath = join(__dirname, '../public/data/reviews.json');

  // Ensure output directory exists
  mkdirSync(join(__dirname, '../public/data'), { recursive: true });

  for (let i = 0; i < BATCH_SPECS.length; i++) {
    const spec = BATCH_SPECS[i];
    const batchNum = i + 1;
    const idStart = `rev_${String(spec.startId).padStart(4, '0')}`;
    const idEnd = `rev_${String(spec.startId + spec.count - 1).padStart(4, '0')}`;

    console.log(`Batch ${batchNum}/${BATCH_SPECS.length}: ${idStart}-${idEnd} — ${spec.focus.substring(0, 60)}...`);

    try {
      const reviews = await generateBatch(spec);
      allReviews.push(...reviews);
      console.log(`  ✓ Got ${reviews.length} reviews (total: ${allReviews.length})`);

      // Save progress after each batch
      writeFileSync(outputPath, JSON.stringify(allReviews, null, 2), 'utf-8');
      console.log(`  ✓ Saved progress to ${outputPath}`);
    } catch (err) {
      console.error(`  ✗ Batch ${batchNum} failed: ${err.message}`);
      console.error('  Saving progress so far and exiting...');
      writeFileSync(outputPath, JSON.stringify(allReviews, null, 2), 'utf-8');
      process.exit(1);
    }

    // Small delay between batches to be respectful to the API
    if (i < BATCH_SPECS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('');
  console.log('==========================================');
  console.log(`COMPLETE! Generated ${allReviews.length} reviews.`);
  console.log(`Saved to: ${outputPath}`);

  // Quick stats
  const ratings = [1, 2, 3, 4, 5];
  const ratingCounts = ratings.map(r => ({ rating: r, count: allReviews.filter(rev => rev.rating === r).length }));
  console.log('');
  console.log('Rating breakdown:');
  ratingCounts.forEach(({ rating, count }) => {
    const pct = ((count / allReviews.length) * 100).toFixed(1);
    console.log(`  ${rating}★: ${count} (${pct}%)`);
  });

  const avgRating = (allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length).toFixed(2);
  console.log(`  Average: ${avgRating}★`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
