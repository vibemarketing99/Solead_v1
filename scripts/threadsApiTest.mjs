import 'dotenv/config';

const host = process.env.RAPIDAPI_HOST || 'threads-api4.p.rapidapi.com';
const key = process.env.RAPIDAPI_KEY;

if (!key) {
  console.error('Missing RAPIDAPI_KEY in .env');
  process.exit(1);
}

const path = process.argv[2] || '/';
const url = `https://${host}${path.startsWith('/') ? path : `/${path}`}`;

const method = process.env.METHOD || 'GET';

const headers = {
  'X-RapidAPI-Key': key,
  'X-RapidAPI-Host': host
};

const bodyArg = process.env.BODY;
const options = { method, headers };
if (bodyArg) {
  headers['Content-Type'] = 'application/json';
  options.body = bodyArg;
}

try {
  const res = await fetch(url, options);
  console.log('Status:', res.status, res.statusText);
  const text = await res.text();
  console.log(text);
} catch (err) {
  console.error('Request failed:', err);
  process.exit(2);
}


