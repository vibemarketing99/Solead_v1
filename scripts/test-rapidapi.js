#!/usr/bin/env node

/**
 * Test RapidAPI Threads API endpoints to understand capabilities
 */

require('dotenv/config');

const host = process.env.RAPIDAPI_HOST;
const key = process.env.RAPIDAPI_KEY;

if (!host || !key) {
  console.error('❌ Missing RAPIDAPI_HOST or RAPIDAPI_KEY in .env');
  process.exit(1);
}

console.log('🧪 Testing RapidAPI Threads API endpoints');
console.log(`Host: ${host}`);
console.log(`Key: ${key.substring(0, 10)}...`);
console.log('');

async function testEndpoint(path, method = 'GET', body = null) {
  const url = `https://${host}${path}`;
  console.log(`📡 ${method} ${path}`);
  
  try {
    const options = {
      method,
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host
      }
    };
    
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    
    const res = await fetch(url, options);
    const status = `${res.status} ${res.statusText}`;
    
    try {
      const data = await res.json();
      console.log(`✅ ${status}`);
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
      return data;
    } catch {
      const text = await res.text();
      console.log(`⚠️ ${status} (non-JSON response)`);
      console.log('Response:', text.substring(0, 200));
      return { status: res.status, text };
    }
  } catch (error) {
    console.log(`❌ Error:`, error.message);
    return null;
  }
}

async function discoverEndpoints() {
  console.log('🔍 Discovering available endpoints...\n');
  
  // Test documented endpoints
  const endpoints = [
    '/thread/123',  // Get thread by ID
    '/threads',     // Possible threads list
    '/search',      // Possible search endpoint
    '/user/someuser', // Possible user endpoint
    '/posts',       // Possible posts endpoint
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    console.log('─'.repeat(50));
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
}

async function testSearch() {
  console.log('\n🔍 Testing search capabilities...\n');
  
  // Try different search patterns
  const searchTests = [
    '/search?q=automation',
    '/search?query=automation',
    '/threads/search?q=AI',
    '/posts/search?keyword=productivity',
  ];
  
  for (const searchPath of searchTests) {
    await testEndpoint(searchPath);
    console.log('─'.repeat(50));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function main() {
  await discoverEndpoints();
  await testSearch();
  
  console.log('\n📋 Summary:');
  console.log('- Check the responses above to understand available endpoints');
  console.log('- Look for 200 OK responses to identify working endpoints');
  console.log('- 404 responses indicate unavailable endpoints');
  console.log('- 429 responses indicate rate limiting');
  console.log('\n🔗 Full API documentation:');
  console.log('https://rapidapi.com/Lundehund/api/threads-api4/playground');
}

main().catch(console.error);