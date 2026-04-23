const FALLBACK_BREWERIES = [
  { id: 'five-points-london', name: 'Five Points Brewing Company', brewery_type: 'micro', city: 'London', state_province: 'England', website_url: 'https://fivepointsbrewing.co.uk' },
  { id: 'beavertown-london', name: 'Beavertown Brewery', brewery_type: 'regional', city: 'London', state_province: 'England', website_url: 'https://beavertownbrewery.co.uk' },
  { id: 'thornbridge-bakewell', name: 'Thornbridge Brewery', brewery_type: 'micro', city: 'Bakewell', state_province: 'Derbyshire', website_url: 'https://thornbridgebrewery.co.uk' },
  { id: 'cloudwater-manchester', name: 'Cloudwater Brew Co', brewery_type: 'micro', city: 'Manchester', state_province: 'Greater Manchester', website_url: 'https://cloudwaterbrew.co' },
  { id: 'magic-rock-huddersfield', name: 'Magic Rock Brewing', brewery_type: 'micro', city: 'Huddersfield', state_province: 'West Yorkshire', website_url: 'https://magicrockbrewing.com' },
  { id: 'verdant-penryn', name: 'Verdant Brewing Co', brewery_type: 'micro', city: 'Penryn', state_province: 'Cornwall', website_url: 'https://verdantbrewing.co' },
  { id: 'burning-sky-firle', name: 'Burning Sky Brewery', brewery_type: 'micro', city: 'Firle', state_province: 'East Sussex', website_url: 'https://burningskybeer.com' },
  { id: 'northern-monk-leeds', name: 'Northern Monk Brew Co', brewery_type: 'micro', city: 'Leeds', state_province: 'West Yorkshire', website_url: 'https://northernmonk.com' },
  { id: 'wild-beer-shepton-mallet', name: 'Wild Beer Co', brewery_type: 'micro', city: 'Shepton Mallet', state_province: 'Somerset', website_url: 'https://wildbeer.com' },
  { id: 'kernel-london', name: 'The Kernel Brewery', brewery_type: 'micro', city: 'London', state_province: 'England', website_url: null }
];

exports.handler = async () => {
  try {
    const res = await fetch(
      'https://api.openbrewerydb.org/v1/breweries?by_country=england&per_page=50',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty response');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ breweries: data, source: 'live' })
    };
  } catch {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breweries: FALLBACK_BREWERIES, source: 'fallback' })
    };
  }
};
