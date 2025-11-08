# Server Directory

This directory contains the Express.js server that acts as an API proxy to protect the Gemini API key from client-side exposure.

## Purpose

**Critical Security Feature**: Prevents API key exposure in production deployments.

**Server provides:**
- HTTP/WebSocket proxy to Gemini API
- Server-side API key injection
- Rate limiting (100 req/15min per IP)
- CORS handling
- Static file serving for frontend
- Dynamic script injection for interception

## Directory Structure

```
server/
├── server.js                 # Express server (376 lines)
├── package.json              # Dependencies
└── public/
    ├── service-worker.js     # HTTP request interceptor (80+ lines)
    └── websocket-interceptor.js  # WebSocket interceptor (66 lines)
```

## server.js (376 lines)

### Purpose

Production Express server that proxies all Gemini API requests and injects API key server-side.

### Key Features

1. **HTTP Proxy** (`/api-proxy/**`):
   - Intercepts requests to `generativelanguage.googleapis.com`
   - Injects API key in query string: `?key=YOUR_API_KEY`
   - Forwards request to Gemini API
   - Returns response to client
   - **Client never sees API key**

2. **WebSocket Proxy** (same path):
   - Proxies WebSocket connections
   - Used for streaming responses
   - Injects API key in URL
   - Bidirectional message forwarding

3. **CORS Handling**:
   - Exposes Google File API upload headers
   - Handles preflight requests
   - Required for file uploads

4. **Rate Limiting**:
   - 100 requests per 15 minutes per IP
   - Prevents abuse
   - Protects API quota

5. **Static File Serving**:
   - Serves frontend from `dist/` folder
   - SPA fallback (all routes → index.html)

6. **Dynamic Script Injection**:
   - Reads `dist/index.html`
   - Injects `service-worker.js` and `websocket-interceptor.js`
   - Scripts loaded before app initialization

### Configuration

**Environment Variables:**
```bash
GEMINI_API_KEY=your_api_key_here  # Required
# OR
API_KEY=your_api_key_here         # Alternative name

PORT=3000                         # Optional, defaults to 3000
```

**Dependencies:**
- `express` - Web server framework
- `http-proxy-middleware` - HTTP proxy
- `express-ws` - WebSocket support
- `express-rate-limit` - Rate limiting
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Startup

```bash
cd server
npm install
npm start  # Starts server on port 3000
```

**Production:**
```bash
# Build frontend first
npm run build  # (from root)

# Start server
cd server && npm start
```

**Docker:**
```bash
docker build -t ai-studio .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key ai-studio
```

---

## service-worker.js (80+ lines)

### Purpose

Client-side HTTP request interceptor that rewrites Gemini API requests to go through the proxy.

### How It Works

1. **Service Worker Registration** (in App.tsx or index.html):
   ```javascript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/service-worker.js');
   }
   ```

2. **Request Interception**:
   - Service worker intercepts ALL fetch requests
   - Checks if URL contains `generativelanguage.googleapis.com`
   - If yes → Rewrites URL to `/api-proxy/**`
   - If no → Passes through unchanged

3. **URL Rewriting**:
   ```javascript
   // Original request
   https://generativelanguage.googleapis.com/v1beta/models/gemini-pro

   // Rewritten to
   /api-proxy/v1beta/models/gemini-pro
   ```

4. **Header Copying**:
   - Copies essential headers from original request
   - Adds CORS headers if needed

### Benefits

- **Transparent**: No code changes needed in frontend
- **Secure**: API key never in client bundle
- **Compatible**: Works with existing Gemini SDK

### Limitations

- Requires HTTPS in production (service worker requirement)
- Initial page load needed to register worker
- Not active on first visit (subsequent visits only)

---

## websocket-interceptor.js (66 lines)

### Purpose

Client-side WebSocket interceptor using JavaScript Proxy pattern.

### How It Works

1. **Proxy Pattern**:
   ```javascript
   const OriginalWebSocket = window.WebSocket;

   window.WebSocket = new Proxy(OriginalWebSocket, {
     construct(target, args) {
       let url = args[0];

       // Rewrite URL if Gemini API
       if (url.includes('generativelanguage.googleapis.com')) {
         url = url.replace(
           'wss://generativelanguage.googleapis.com',
           `${wsProtocol}//${window.location.host}/api-proxy`
         );
       }

       return new target(url, ...args.slice(1));
     }
   });
   ```

2. **URL Rewriting**:
   ```javascript
   // Original WebSocket
   wss://generativelanguage.googleapis.com/ws

   // Rewritten to
   ws://localhost:3000/api-proxy/ws
   ```

3. **Transparent Interception**:
   - All `new WebSocket()` calls intercepted
   - URL rewritten if Gemini API
   - Otherwise passes through unchanged

### Benefits

- Works with streaming API responses
- Transparent to application code
- No SDK modifications needed

### Limitations

- Must be loaded before any WebSocket creation
- Global scope pollution (wraps `window.WebSocket`)

---

## Security Architecture

### API Key Protection

**Problem**: Vite's `define` feature injects environment variables into client bundle, exposing API key.

**Solution**: Server-side proxy with client-side interception.

**Flow:**
```
Client makes request to generativelanguage.googleapis.com
  ↓
Service worker intercepts → Rewrites to /api-proxy/**
  ↓
Express server receives request
  ↓
Server injects API key: ?key=SECRET_KEY
  ↓
Server forwards to generativelanguage.googleapis.com
  ↓
Gemini API responds
  ↓
Server forwards response to client
  ↓
Client receives response (no knowledge of API key)
```

**Key Points:**
- API key stored server-side only (environment variable)
- Client bundle does NOT contain API key
- Network traffic does NOT expose API key (proxied through server)
- API key visible only in server logs (secure)

### Rate Limiting

**Configuration:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api-proxy', limiter);
```

**Benefits:**
- Prevents abuse
- Protects API quota
- Per-IP tracking (not per-user)

**Limitations:**
- Shared IP (e.g., office, VPN) affected
- Can be bypassed with IP rotation (not a concern for internal app)

---

## Deployment Patterns

### Local Development

**NOT RECOMMENDED** - Use Vite dev server instead:
```bash
npm run dev  # Vite dev server with .env.local
```

**Why?**
- Faster hot reload
- No proxy needed (API key in .env.local acceptable for local dev)

### Production (Cloud Run)

**Recommended deployment:**

1. **Build frontend:**
   ```bash
   npm run build  # Creates dist/
   ```

2. **Start server:**
   ```bash
   cd server
   npm install
   npm start
   ```

3. **Set environment variable:**
   ```bash
   export GEMINI_API_KEY=your_key
   ```

4. **Access app:**
   ```
   http://localhost:3000
   ```

### Docker Deployment

**Dockerfile** (in root):
```dockerfile
# Multi-stage build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY server/server.js ./
COPY server/public ./public

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
```

**Build and run:**
```bash
docker build -t ai-studio .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key ai-studio
```

### Cloud Run Deployment

**GitHub Actions** (`.github/workflows/deploy.yml`):
- Builds Docker image
- Pushes to Artifact Registry
- Deploys to Cloud Run
- Sets GEMINI_API_KEY from GitHub Secrets

**Manual deployment:**
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-studio

# Deploy
gcloud run deploy ai-studio-v2 \
  --image gcr.io/PROJECT_ID/ai-studio \
  --platform managed \
  --region us-central1 \
  --set-env-vars GEMINI_API_KEY=your_key \
  --no-allow-unauthenticated  # IAP required
```

---

## Common Server Tasks

### Update API Key

**Development:**
```bash
# Update .env.local
GEMINI_API_KEY=new_key
```

**Production:**
```bash
# Update Cloud Run env var
gcloud run services update ai-studio-v2 \
  --set-env-vars GEMINI_API_KEY=new_key
```

### Debug Proxy Issues

1. **Check server logs:**
   ```bash
   # Local
   npm start  # View console

   # Cloud Run
   gcloud logging read "resource.type=cloud_run_revision" --limit 50
   ```

2. **Test proxy endpoint directly:**
   ```bash
   curl http://localhost:3000/api-proxy/v1beta/models
   ```

3. **Verify service worker registration:**
   - Open DevTools → Application → Service Workers
   - Check if `/service-worker.js` is active

4. **Check network tab:**
   - Requests should go to `/api-proxy/**`
   - NOT to `generativelanguage.googleapis.com`

### Adjust Rate Limit

**In server.js:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,  // Increase to 200
});
```

**Restart server** for changes to take effect.

### Add New Proxy Route

**Example: Proxy another API:**
```javascript
app.use('/other-api-proxy', createProxyMiddleware({
  target: 'https://other-api.com',
  changeOrigin: true,
  pathRewrite: { '^/other-api-proxy': '' },
}));
```

---

## Performance Considerations

- **Proxy Overhead**: ~10-50ms per request (negligible)
- **Connection Pooling**: Express reuses connections (efficient)
- **Memory Usage**: ~50-100MB (lightweight)
- **Concurrent Requests**: Handles 100+ concurrent (Node.js event loop)

---

## Security Considerations

### API Key Exposure

**Development (Vite):**
- ❌ API key in client bundle (visible in DevTools)
- ✅ Acceptable for local development only

**Production (Server Proxy):**
- ✅ API key server-side only
- ✅ Not in client bundle
- ✅ Not in network traffic
- ✅ Rate limited

### CORS

**Configuration:**
```javascript
app.use(cors({
  origin: '*',  // Allow all origins (change for stricter security)
  exposedHeaders: ['X-Goog-Upload-URL', ...],
}));
```

**Recommendation**: Restrict to specific origins in production:
```javascript
origin: 'https://your-domain.com'
```

### HTTPS

**Required for:**
- Service worker registration (browser security policy)
- Production deployments
- Cloud Run (automatic HTTPS)

**Not required for:**
- Local development (localhost exempt from HTTPS requirement)

---

## Troubleshooting

### Service Worker Not Active

**Symptoms:** Requests still go directly to Gemini API

**Solutions:**
1. Hard refresh (Ctrl+Shift+R)
2. Check DevTools → Application → Service Workers
3. Unregister and re-register
4. Check HTTPS (required in production)

### WebSocket Connection Failed

**Symptoms:** Streaming responses don't work

**Solutions:**
1. Check `websocket-interceptor.js` loaded before app
2. Verify WebSocket proxy route in `server.js`
3. Check WebSocket protocol (ws vs wss)
4. Test with direct WebSocket connection

### Rate Limit Hit

**Symptoms:** 429 Too Many Requests

**Solutions:**
1. Wait 15 minutes
2. Increase rate limit in `server.js`
3. Check for request loops (bug in frontend)

---

## Related Documentation

- **Root CLAUDE.md**: Project overview with security architecture
- **services/CLAUDE.md**: Service layer that makes API calls
- **.docs/DEPLOYMENT.md**: Complete deployment guide
- **.docs/IAP_SETUP.md**: Identity-Aware Proxy configuration
