# AI Studio Self Deploy - Setup Instructions

Complete guide to set up your new repository and deploy to Google Cloud.

## 📋 Table of Contents

1. [Create GitHub Repository](#create-github-repository)
2. [Push Your Code](#push-your-code)
3. [Deploy to Google Cloud](#deploy-to-google-cloud)
4. [Verify Deployment](#verify-deployment)

---

## 1. Create GitHub Repository

### Option A: Using GitHub Web Interface

1. **Go to GitHub** and create a new repository:
   - Navigate to https://github.com/new
   - Repository name: `ai-studio-self-deploy`
   - Description: "Self-deployable AI Studio with multiple creative tools powered by Google Gemini"
   - Visibility: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

2. **Copy the repository URL** (it will look like):
   ```
   https://github.com/YOUR_USERNAME/ai-studio-self-deploy.git
   ```

### Option B: Using GitHub CLI (gh)

```bash
# Install GitHub CLI if you haven't
# Windows: winget install --id GitHub.cli
# macOS: brew install gh
# Linux: See https://github.com/cli/cli#installation

# Authenticate
gh auth login

# Create repository
gh repo create ai-studio-self-deploy \
  --public \
  --description "Self-deployable AI Studio with multiple creative tools powered by Google Gemini" \
  --source=. \
  --remote=origin \
  --push
```

If using GitHub CLI with `--push`, you're done! Skip to section 3.

---

## 2. Push Your Code

### Step 1: Add Remote Repository

```bash
# Navigate to your project directory
cd F:\GitRepos\ai-studio

# Add the new remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ai-studio-self-deploy.git

# Verify remote was added
git remote -v
```

### Step 2: Push to GitHub

```bash
# Push to the new repository
git push -u origin main

# If you get an error about branch name, try:
git branch -M main
git push -u origin main
```

### Step 3: Verify on GitHub

Visit your repository at:
```
https://github.com/YOUR_USERNAME/ai-studio-self-deploy
```

You should see all your files, including:
- README.md
- DEPLOYMENT.md
- All components and services
- Video Analyzer integration

---

## 3. Deploy to Google Cloud

Now that your code is on GitHub, let's deploy it to Google Cloud.

### Prerequisites Check

Ensure you have:
- [x] Google Cloud account ([Create one](https://cloud.google.com))
- [x] Billing enabled on your Google Cloud account
- [x] Google Cloud SDK installed (see instructions below)
- [x] Gemini API key ([Get one](https://aistudio.google.com/apikey))

### Step 1: Install Google Cloud SDK

<details>
<summary><strong>Windows Installation</strong></summary>

```powershell
# Download installer from:
# https://cloud.google.com/sdk/docs/install#windows

# Or using Chocolatey:
choco install gcloudsdk

# Restart your terminal, then verify:
gcloud --version
```
</details>

<details>
<summary><strong>macOS Installation</strong></summary>

```bash
# Using Homebrew:
brew install google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install#mac

# Verify installation:
gcloud --version
```
</details>

<details>
<summary><strong>Linux Installation</strong></summary>

```bash
# Add Cloud SDK distribution URI
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import Google Cloud public key
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Install
sudo apt-get update && sudo apt-get install google-cloud-sdk

# Verify:
gcloud --version
```
</details>

### Step 2: Initialize Google Cloud

```bash
# 1. Authenticate with Google Cloud
gcloud auth login

# 2. Create a new project
export PROJECT_ID="ai-studio-deploy-$(date +%s)"
gcloud projects create $PROJECT_ID --name="AI Studio Self Deploy"

# 3. Set as active project
gcloud config set project $PROJECT_ID

# 4. Enable billing (REQUIRED - you'll be prompted to link a billing account)
# Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID

# 5. Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# 6. Set default region (choose closest to your users)
gcloud config set run/region us-central1
```

### Step 3: Deploy to Cloud Run

```bash
# Option 1: Quick deploy from source (RECOMMENDED)
gcloud run deploy ai-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="your_gemini_api_key_here" \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300

# Option 2: Deploy from GitHub (requires setup)
gcloud run deploy ai-studio \
  --source https://github.com/YOUR_USERNAME/ai-studio-self-deploy \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="your_gemini_api_key_here"
```

**Note:** Replace `your_gemini_api_key_here` with your actual Gemini API key.

### Step 4: Get Your Deployment URL

```bash
# Get the service URL
gcloud run services describe ai-studio \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'

# Example output: https://ai-studio-xxxxx-uc.a.run.app
```

### Step 5: Test Your Deployment

1. Open the URL in your browser
2. You should see the AI Studio interface
3. Click settings (gear icon) and enable beta features
4. Try generating something in Hair Studio or Baby Studio

---

## 4. Verify Deployment

### Check Service Status

```bash
# View service details
gcloud run services describe ai-studio --region us-central1

# View logs
gcloud run services logs read ai-studio --region us-central1 --limit 50

# Stream logs (live)
gcloud run services logs tail ai-studio --region us-central1
```

### Monitor Usage

```bash
# View traffic
gcloud run services describe ai-studio \
  --region us-central1 \
  --format="value(status.traffic)"

# View metrics in Cloud Console
echo "https://console.cloud.google.com/run/detail/us-central1/ai-studio/metrics?project=$PROJECT_ID"
```

### Test Features

1. **Hair Studio:**
   - Upload a photo
   - Select hairstyles
   - Generate variations
   - Download results

2. **Video Analyzer (Beta):**
   - Enable beta features in settings
   - Upload a video ad
   - View analysis and storyboard
   - Generate concepts

---

## 🔐 Security Best Practices

### Use Secret Manager (Recommended for Production)

Instead of passing API keys directly, use Google Secret Manager:

```bash
# Create secret
echo -n "your_gemini_api_key" | gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run access
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Redeploy with secret
gcloud run deploy ai-studio \
  --source . \
  --region us-central1 \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest
```

---

## 🌐 Custom Domain Setup (Optional)

### Step 1: Map Domain

```bash
# Map your custom domain
gcloud run domain-mappings create \
  --service ai-studio \
  --domain yourdomain.com \
  --region us-central1
```

### Step 2: Configure DNS

Follow the DNS instructions provided by the command above. Typically:

```
Type: CNAME
Name: yourdomain.com
Value: ghs.googlehosted.com
```

### Step 3: Verify

```bash
# Check domain mapping status
gcloud run domain-mappings describe \
  --domain yourdomain.com \
  --region us-central1
```

---

## 🔄 Update Deployment

When you make changes to your code:

```bash
# 1. Commit changes
git add .
git commit -m "Your update message"
git push origin main

# 2. Redeploy
gcloud run deploy ai-studio \
  --source . \
  --region us-central1
```

Or set up continuous deployment with GitHub Actions (see DEPLOYMENT.md).

---

## 💰 Cost Management

### Monitor Costs

```bash
# View current month's costs
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# Set up budget alerts in Cloud Console
echo "https://console.cloud.google.com/billing/budgets?project=$PROJECT_ID"
```

### Optimize Costs

1. **Scale to Zero:** Cloud Run scales to 0 when not in use (no cost)
2. **Set Limits:**
   ```bash
   # Update service with limits
   gcloud run services update ai-studio \
     --max-instances 5 \
     --memory 256Mi \
     --cpu 1 \
     --region us-central1
   ```

3. **Use Budget Alerts:** Set up alerts when costs exceed thresholds

### Expected Costs

- **Free Tier:** 2M requests/month, 360K GB-seconds/month
- **Personal Use:** $0-5/month (typically free tier covers it)
- **Moderate Use:** $5-20/month
- **High Traffic:** $20-100/month

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><strong>Error: "Permission denied" when deploying</strong></summary>

```bash
# Re-authenticate
gcloud auth login

# Set project again
gcloud config set project $PROJECT_ID

# Verify permissions
gcloud projects get-iam-policy $PROJECT_ID
```
</details>

<details>
<summary><strong>Error: "Billing not enabled"</strong></summary>

1. Go to: https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Enable billing for the project
4. Try deploying again
</details>

<details>
<summary><strong>Error: "Build failed"</strong></summary>

```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format="value(id)")

# Common fixes:
# 1. Ensure package.json has all dependencies
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push

# 2. Rebuild
gcloud run deploy ai-studio --source . --region us-central1
```
</details>

<details>
<summary><strong>Service deployed but not accessible</strong></summary>

```bash
# Check service status
gcloud run services describe ai-studio --region us-central1

# Ensure public access
gcloud run services add-iam-policy-binding ai-studio \
  --region us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```
</details>

---

## 📚 Additional Resources

- **Google Cloud Run Documentation:** https://cloud.google.com/run/docs
- **Google Cloud SDK Reference:** https://cloud.google.com/sdk/gcloud/reference
- **Gemini API Documentation:** https://ai.google.dev/docs
- **Project DEPLOYMENT.md:** See detailed deployment options
- **Project README.md:** Feature documentation and usage

---

## 🎉 Success!

You now have:
- ✅ Code pushed to GitHub
- ✅ Application deployed to Google Cloud Run
- ✅ Public URL for your AI Studio
- ✅ Automatic scaling and HTTPS
- ✅ Monitoring and logging set up

### Next Steps

1. **Share your deployment** with others
2. **Set up custom domain** (optional)
3. **Configure continuous deployment** from GitHub
4. **Monitor usage** and costs
5. **Customize** the studios for your needs

---

## 💬 Need Help?

- **GitHub Issues:** https://github.com/YOUR_USERNAME/ai-studio-self-deploy/issues
- **Google Cloud Support:** https://cloud.google.com/support
- **Gemini API Help:** https://aistudio.google.com

---

**Congratulations on deploying AI Studio! 🚀**

Built with ❤️ using Google Gemini AI
