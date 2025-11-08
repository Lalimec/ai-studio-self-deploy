# Deployment Guide - AI Studio Self Deploy

Complete guide for deploying AI Studio to various cloud platforms.

## Table of Contents

- [Google Cloud Run (Recommended)](#google-cloud-run-recommended)
- [Google Cloud Storage (Static)](#google-cloud-storage-static)
- [Vercel](#vercel)
- [Netlify](#netlify)
- [Docker Deployment](#docker-deployment)

---

## Google Cloud Run (Recommended)

Deploy as a containerized application with automatic scaling and HTTPS.

### Prerequisites

- Google Cloud account ([Create one](https://cloud.google.com))
- Google Cloud SDK installed ([Install guide](#installing-google-cloud-sdk))
- Docker installed (optional, for local testing)

### Step 1: Install Google Cloud SDK

#### Windows
```powershell
# Download and run the installer
# https://cloud.google.com/sdk/docs/install#windows

# Or using Chocolatey
choco install gcloudsdk

# Verify installation
gcloud --version
```

#### macOS
```bash
# Using Homebrew
brew install google-cloud-sdk

# Or download installer
# https://cloud.google.com/sdk/docs/install#mac

# Verify installation
gcloud --version
```

#### Linux
```bash
# Add Cloud SDK distribution URI as a package source
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import Google Cloud public key
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Update and install
sudo apt-get update && sudo apt-get install google-cloud-sdk

# Verify installation
gcloud --version
```

### Step 2: Initialize gcloud and Create Project

```bash
# Authenticate with Google Cloud
gcloud auth login

# Create a new project (or use existing)
export PROJECT_ID="ai-studio-self-deploy"
gcloud projects create $PROJECT_ID --name="AI Studio Self Deploy"

# Set as active project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Set default region (choose closest to your users)
gcloud config set run/region us-central1
```

### Step 3: Create Dockerfile

Create `Dockerfile` in your project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Cloud Run uses PORT environment variable)
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Step 4: Create nginx.conf

Create `nginx.conf` in your project root:

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API key handling (injected at runtime)
    location /config.js {
        default_type application/javascript;
        return 200 'window.ENV_CONFIG = { GEMINI_API_KEY: "$GEMINI_API_KEY" };';
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 5: Create .dockerignore

Create `.dockerignore`:

```
node_modules
npm-debug.log
.env.local
.env
dist
.git
.gitignore
README.md
.vscode
.idea
```

### Step 6: Build and Deploy to Cloud Run

**For Linux/macOS (bash):**

```bash
# Build and deploy in one command (recommended - simplest method)
gcloud run deploy ai-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --port 8080

# Or build separately and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/ai-studio

gcloud run deploy ai-studio \
  --image gcr.io/$PROJECT_ID/ai-studio \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

**For Windows (PowerShell):**

```powershell
# Build and deploy in one command (recommended - simplest method)
gcloud run deploy ai-studio `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars GEMINI_API_KEY=your_key_here `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 10 `
  --port 8080

# Or build separately and deploy
gcloud builds submit --tag gcr.io/$env:PROJECT_ID/ai-studio

gcloud run deploy ai-studio `
  --image gcr.io/$env:PROJECT_ID/ai-studio `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars GEMINI_API_KEY=your_key_here
```

**Note:** Replace `your_key_here` with your actual Gemini API key.

### Step 7: Get Your Deployment URL

**Linux/macOS:**
```bash
# Get service URL
gcloud run services describe ai-studio \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

**Windows PowerShell:**
```powershell
# Get service URL
gcloud run services describe ai-studio `
  --platform managed `
  --region us-central1 `
  --format 'value(status.url)'
```

### Optional: Set up Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service ai-studio \
  --domain yourdomain.com \
  --region us-central1

# Follow the DNS instructions provided
```

### Optional: Use Secret Manager for API Key

```bash
# Create secret
echo -n "your_api_key" | gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run access to secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Deploy with secret
gcloud run deploy ai-studio \
  --image gcr.io/$PROJECT_ID/ai-studio \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --region us-central1
```

### Cost Estimation (Google Cloud Run)

**Free Tier:**
- 2 million requests/month
- 360,000 GB-seconds/month
- 180,000 vCPU-seconds/month

**Typical Cost:** $0-5/month for personal use

---

## Google Cloud Storage (Static)

Deploy as a static website (cheaper, but requires client-side API keys).

### Prerequisites

- Google Cloud SDK installed
- Project created and billing enabled

### Step 1: Build Your Application

```bash
# Build for production
npm run build

# Your built files are now in ./dist/
```

### Step 2: Create Cloud Storage Bucket

```bash
# Set variables
export PROJECT_ID="ai-studio-self-deploy"
export BUCKET_NAME="${PROJECT_ID}-web"

# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l US gs://$BUCKET_NAME/

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Enable website configuration
gsutil web set -m index.html -e index.html gs://$BUCKET_NAME
```

### Step 3: Deploy Built Files

```bash
# Upload all files
gsutil -m rsync -r -d ./dist gs://$BUCKET_NAME

# Set cache control for assets
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
  "gs://$BUCKET_NAME/assets/**"

# Set cache control for HTML
gsutil -m setmeta -h "Cache-Control:public, max-age=0, must-revalidate" \
  "gs://$BUCKET_NAME/*.html"
```

### Step 4: Access Your Site

```bash
# Get public URL
echo "https://storage.googleapis.com/$BUCKET_NAME/index.html"
```

### Optional: Set up Custom Domain with Load Balancer

```bash
# Reserve static IP
gcloud compute addresses create ai-studio-ip \
  --global

# Create backend bucket
gcloud compute backend-buckets create ai-studio-backend \
  --gcs-bucket-name=$BUCKET_NAME

# Create URL map
gcloud compute url-maps create ai-studio-url-map \
  --default-backend-bucket=ai-studio-backend

# Create HTTP proxy
gcloud compute target-http-proxies create ai-studio-http-proxy \
  --url-map=ai-studio-url-map

# Create forwarding rule
gcloud compute forwarding-rules create ai-studio-http-rule \
  --global \
  --target-http-proxy=ai-studio-http-proxy \
  --ports=80 \
  --address=ai-studio-ip

# For HTTPS, create SSL certificate
gcloud compute ssl-certificates create ai-studio-cert \
  --domains=yourdomain.com

# Create HTTPS proxy
gcloud compute target-https-proxies create ai-studio-https-proxy \
  --url-map=ai-studio-url-map \
  --ssl-certificates=ai-studio-cert

# Create HTTPS forwarding rule
gcloud compute forwarding-rules create ai-studio-https-rule \
  --global \
  --target-https-proxy=ai-studio-https-proxy \
  --ports=443 \
  --address=ai-studio-ip
```

### Cost Estimation (Cloud Storage)

- **Storage:** $0.02/GB/month
- **Network egress:** $0.12/GB (first 1TB)
- **Typical cost:** $1-3/month for low traffic

---

## Vercel

One-click deployment with automatic HTTPS and global CDN.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login and Deploy

```bash
# Login to Vercel
vercel login

# Deploy (run from project root)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? ai-studio-self-deploy
# - Directory? ./
# - Override settings? No
```

### Step 3: Set Environment Variables

```bash
# Add environment variable
vercel env add GEMINI_API_KEY

# Choose environment: Production
# Enter your API key

# Redeploy to apply changes
vercel --prod
```

### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Netlify

Simple static hosting with continuous deployment.

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login and Deploy

```bash
# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

### Step 3: Configure Environment

```bash
# Set environment variable
netlify env:set GEMINI_API_KEY your_api_key_here
```

### Netlify Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Docker Deployment

Run locally or on any Docker-compatible platform.

### Step 1: Build Docker Image

```bash
# Build image
docker build -t ai-studio-self-deploy .

# Run container
docker run -d \
  -p 8080:8080 \
  -e GEMINI_API_KEY=your_api_key_here \
  --name ai-studio \
  ai-studio-self-deploy

# Access at http://localhost:8080
```

### Step 2: Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  ai-studio:
    build: .
    ports:
      - "8080:8080"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: unless-stopped
```

Run with:

```bash
# Create .env file with your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Start
docker-compose up -d

# Stop
docker-compose down
```

---

## Continuous Deployment

### GitHub Actions for Cloud Run

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ai-studio-self-deploy
  SERVICE_NAME: ai-studio
  REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'

    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'

    - name: 'Build and push image'
      run: |
        gcloud builds submit \
          --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

    - name: 'Deploy to Cloud Run'
      run: |
        gcloud run deploy $SERVICE_NAME \
          --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
          --platform managed \
          --region $REGION \
          --set-env-vars GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
```

---

## Monitoring and Maintenance

### Cloud Run Monitoring

```bash
# View logs
gcloud run services logs read ai-studio \
  --region us-central1 \
  --limit 50

# Stream logs
gcloud run services logs tail ai-studio \
  --region us-central1

# View metrics
gcloud run services describe ai-studio \
  --region us-central1 \
  --format="value(status.traffic)"
```

### Update Deployment

```bash
# Rebuild and redeploy
gcloud run deploy ai-studio \
  --source . \
  --region us-central1

# Or with new image
gcloud builds submit --tag gcr.io/$PROJECT_ID/ai-studio
gcloud run deploy ai-studio \
  --image gcr.io/$PROJECT_ID/ai-studio:latest \
  --region us-central1
```

---

## Troubleshooting

### Common Issues

**Issue:** Build fails
```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")
```

**Issue:** Service not accessible
```bash
# Check service status
gcloud run services describe ai-studio --region us-central1

# Check IAM permissions
gcloud run services get-iam-policy ai-studio --region us-central1
```

**Issue:** Environment variables not working
```bash
# List current environment variables
gcloud run services describe ai-studio \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"

# Update environment variable
gcloud run services update ai-studio \
  --update-env-vars GEMINI_API_KEY=new_key \
  --region us-central1
```

---

## Security Best Practices

1. **API Keys:**
   - Use Secret Manager for production
   - Rotate keys regularly
   - Never commit to version control

2. **CORS:**
   - Configure allowed origins
   - Implement rate limiting

3. **Authentication:**
   - Consider adding user authentication for production
   - Use Firebase Auth or similar

4. **Monitoring:**
   - Set up Cloud Monitoring alerts
   - Track API quota usage
   - Monitor error rates

---

## Cost Optimization

1. **Cloud Run:**
   - Use minimum instances = 0 (scale to zero)
   - Set appropriate memory limits
   - Enable CPU throttling

2. **Cloud Storage:**
   - Enable lifecycle policies
   - Use Cloud CDN for caching
   - Compress assets

3. **API Usage:**
   - Implement client-side caching
   - Use mock data in development
   - Monitor quota usage

---

**Need help?** Check the [main README](./README.md) or open an issue on GitHub.
