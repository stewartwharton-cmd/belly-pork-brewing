// Belly Pork Brewing — Graham chat serverless function
// Reads graham.config.js, builds a system prompt, and proxies to OpenAI.
//
// Set OPENAI_API_KEY in your Netlify environment variables:
//   Netlify dashboard → Site settings → Environment variables → Add variable
//
// To update Graham's knowledge, personality, or beer list:
//   Just edit public/graham.config.js — no changes needed here.

const GrahamConfig = require('../../public/graham.config.js');

function buildSystemPrompt(config) {
  const beersText = config.beers.map(b => [
    `  ${b.name} (${b.style}, ${b.abv}% ABV)`,
    `  "${b.tagline}"`,
    `  ${b.description}`,
    `  Appearance: ${b.tastingNotes.appearance}`,
    `  Aroma: ${b.tastingNotes.aroma}`,
    `  Taste: ${b.tastingNotes.taste}`,
    `  Pairs with: ${b.tastingNotes.pairsWith}`,
  ].join('\n')).join('\n\n');

  const hoursText = Object.entries(config.brewery.tapRoom.hours)
    .map(([day, hours]) => `  ${day}: ${hours}`)
    .join('\n');

  const eventsText = config.events.length > 0
    ? config.events.map(e => `  - ${e.name} (${e.date}): ${e.description}`).join('\n')
    : '  No events currently scheduled. Tell people to check socials for updates.';

  const faqText = config.faq
    .map(f => `  Q: ${f.q}\n  A: ${f.a}`)
    .join('\n\n');

  return `${config.personality.trim()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BREWERY INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${config.brewery.name}
Location: ${config.brewery.location}
Founded: ${config.brewery.founded}
Who we are: ${config.brewery.founders}
Ethos: ${config.brewery.ethos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAP ROOM OPENING HOURS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${hoursText}
${config.brewery.tapRoom.notes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUR BEERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${beersText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPCOMING EVENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${eventsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FREQUENTLY ASKED QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${faqText}
`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body));
    if (!Array.isArray(messages)) throw new Error('messages must be an array');
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Sorry boy, something's gone wrong on my end. Try again in a bit." }),
    };
  }

  const systemPrompt = buildSystemPrompt(GrahamConfig);

  let openAIResponse;
  try {
    openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10), // keep last 10 for context, avoid token bloat
        ],
        max_tokens: 200,
        temperature: 0.85,
      }),
    });
  } catch {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: "Can't reach the API boy. I'm probably asleep." }),
    };
  }

  if (!openAIResponse.ok) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: "Something went wrong boy. Give it another go." }),
    };
  }

  const data = await openAIResponse.json();
  const reply = data.choices?.[0]?.message?.content
    ?? "Sorry boy, I've nodded off. Try again in a sec.";

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply }),
  };
};
