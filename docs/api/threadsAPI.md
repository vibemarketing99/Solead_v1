## Threads API (RapidAPI: Lundehund / threads-api4)

This doc summarizes endpoints, auth, params, and example requests for the Threads API available via RapidAPI.

- Base URL: `https://threads-api4.p.rapidapi.com`
- Reference: [Threads API Playground on RapidAPI](https://rapidapi.com/Lundehund/api/threads-api4/playground/apiendpoint_7181af83-476a-4dea-9e03-a8c7f2cf36a7)

### Authentication

All requests require RapidAPI headers:

```
X-RapidAPI-Key: <YOUR_RAPIDAPI_KEY>
X-RapidAPI-Host: threads-api4.p.rapidapi.com
```

See RapidAPI key management and rotation: https://docs.rapidapi.com/docs/keys-and-key-rotation

### Endpoints

#### 1) Get thread by ID

- Method: `GET`
- Path: `/thread/{thread_id}`
- Description: Fetch thread details by ID.
- Path params:
  - `thread_id` (string): Target thread ID
- Responses:
  - 200 JSON with thread details
  - 404 not found

Example:

```bash
curl --request GET \
  --url "https://threads-api4.p.rapidapi.com/thread/{thread_id}" \
  --header "X-RapidAPI-Host: threads-api4.p.rapidapi.com" \
  --header "X-RapidAPI-Key: $RAPIDAPI_KEY"
```

#### 2) Create thread

- Method: `POST`
- Path: `/thread`
- Description: Create a new thread.
- Headers: `Content-Type: application/json`
- Body (JSON):

```
{
  "title": "string",
  "content": "string"
}
```

- Responses:
  - 201 JSON with created thread
  - 400 invalid input

Example:

```bash
curl --request POST \
  --url "https://threads-api4.p.rapidapi.com/thread" \
  --header "X-RapidAPI-Host: threads-api4.p.rapidapi.com" \
  --header "X-RapidAPI-Key: $RAPIDAPI_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "New Thread Title",
    "content": "Thread content"
  }'
```

#### 3) Update thread

- Method: `PUT`
- Path: `/thread/{thread_id}`
- Description: Update an existing thread.
- Headers: `Content-Type: application/json`
- Path params:
  - `thread_id` (string)
- Body (JSON):

```
{
  "title": "string (optional)",
  "content": "string (optional)"
}
```

- Responses:
  - 200 JSON with updated thread
  - 404 not found

Example:

```bash
curl --request PUT \
  --url "https://threads-api4.p.rapidapi.com/thread/{thread_id}" \
  --header "X-RapidAPI-Host: threads-api4.p.rapidapi.com" \
  --header "X-RapidAPI-Key: $RAPIDAPI_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "Updated title",
    "content": "Updated content"
  }'
```

#### 4) Delete thread

- Method: `DELETE`
- Path: `/thread/{thread_id}`
- Description: Delete a thread by ID.
- Path params:
  - `thread_id` (string)
- Responses:
  - 204 empty on success
  - 404 not found

Example:

```bash
curl --request DELETE \
  --url "https://threads-api4.p.rapidapi.com/thread/{thread_id}" \
  --header "X-RapidAPI-Host: threads-api4.p.rapidapi.com" \
  --header "X-RapidAPI-Key: $RAPIDAPI_KEY"
```

### Error Codes

- 200 OK, 201 Created, 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 404 Not Found
- 429 Too Many Requests
- 500 Internal Server Error

### Notes

- Rate limits and key rotation: https://docs.rapidapi.com/docs/keys-and-key-rotation
- Test interactively via RapidAPI Playground: https://rapidapi.com/Lundehund/api/threads-api4/playground/apiendpoint_7181af83-476a-4dea-9e03-a8c7f2cf36a7

### Quick start (Node.js)

1) Create `.env` in `solead/`:

```
RAPIDAPI_KEY=your-key
RAPIDAPI_HOST=threads-api4.p.rapidapi.com
```

2) Example request with `node-fetch`/native fetch (Node 18+):

```javascript
// scripts/threadsApiTest.mjs
import 'dotenv/config';

const host = process.env.RAPIDAPI_HOST;
const key = process.env.RAPIDAPI_KEY;

if (!host || !key) {
  console.error('Missing RAPIDAPI_HOST or RAPIDAPI_KEY');
  process.exit(1);
}

// Replace with a real endpoint and params
const path = process.argv[2] || '/thread/{thread_id}';
const url = `https://${host}${path}`;

const res = await fetch(url, {
  method: 'GET',
  headers: {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': host
  }
});

console.log('Status:', res.status, res.statusText);
const text = await res.text();
console.log(text);
```

Run:

```bash
node scripts/threadsApiTest.mjs /thread/{thread_id}
```


