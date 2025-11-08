# Quick Deploy Reference

Fast reference for deploying AI Studio to Google Cloud Run with GitHub Actions.

## 📋 Prerequisites Checklist

- [ ] Google Cloud account with billing enabled
- [ ] GitHub repository access
- [ ] Google Gemini API key

---

## ⚡ Quick Setup (5 minutes)

### 1. Google Cloud Setup

```bash
# Set project ID
export PROJECT_ID="ai-studio-self-deploy"

# Create project (or use existing)
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

# Create service account
export SA_NAME="github-actions-deployer"
gcloud iam service-accounts create $SA_NAME

# Grant roles
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/storage.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${SA_EMAIL}" --role="roles/cloudbuild.builds.editor"

# Create key
gcloud iam service-accounts keys create ~/gcp-key.json --iam-account=$SA_EMAIL
cat ~/gcp-key.json  # Copy this for GitHub
```

### 2. GitHub Secrets Setup

Go to: **Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value |
|------------|-------|
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_SA_KEY` | Entire contents of `gcp-key.json` |
| `GEMINI_API_KEY` | Your Gemini API key from https://makersuite.google.com/app/apikey |

### 3. Deploy

```bash
# Push to main branch
git push origin main
```

✅ Done! Check **Actions** tab for deployment progress.

---

## 🔗 Access Your App

After deployment completes:

```bash
gcloud run services describe ai-studio \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

Or check the GitHub Actions summary for the URL.

---

## 🛠️ Common Commands

### Update Environment Variable

```bash
gcloud run services update ai-studio \
  --update-env-vars GEMINI_API_KEY=new_key \
  --region us-central1
```

### View Logs

```bash
# Recent logs
gcloud run services logs read ai-studio --region us-central1 --limit 50

# Stream logs
gcloud run services logs tail ai-studio --region us-central1
```

### Redeploy Manually

```bash
# From local machine
gcloud run deploy ai-studio \
  --source . \
  --region us-central1
```

### Check Service Status

```bash
gcloud run services describe ai-studio --region us-central1
```

---

## 📁 Created Files

This setup created:

- ✅ `Dockerfile` - Multi-stage Docker build
- ✅ `nginx.conf` - Nginx configuration for Cloud Run
- ✅ `.dockerignore` - Files to exclude from Docker build
- ✅ `.github/workflows/deploy.yml` - GitHub Actions workflow
- ✅ `.docs/GITHUB_ACTIONS_SETUP.md` - Detailed setup guide
- ✅ `.docs/QUICK_DEPLOY_REFERENCE.md` - This file

---

## 🚨 Troubleshooting

**Authentication Failed?**
```bash
# Verify service account roles
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:serviceAccount:${SA_EMAIL}"
```

**Build Failed?**
```bash
# Test locally
npm ci && npm run build
```

**Deployment Failed?**
```bash
# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID
```

**Service Not Accessible?**
```bash
# Check if deployed
gcloud run services list --region us-central1

# Check logs
gcloud run services logs read ai-studio --region us-central1
```

---

## 💰 Cost Estimate

**Free Tier:**
- 2M requests/month
- 360,000 GB-seconds/month
- 180,000 vCPU-seconds/month

**Typical cost:** $0-5/month for personal use

---

## 📚 Full Documentation

For detailed guides, see:
- [GITHUB_ACTIONS_SETUP.md](.docs/GITHUB_ACTIONS_SETUP.md) - Complete setup guide
- [DEPLOYMENT.md](.docs/DEPLOYMENT.md) - All deployment options
- [README.md](README.md) - Project overview

---

## 🔐 Security Reminder

**After setup:**
1. Delete local key file: `rm ~/gcp-key.json`
2. Never commit GCP keys to repository
3. Rotate API keys regularly
4. Monitor Cloud Console for unusual activity

---

**Need help?** Open an issue on GitHub or check the full documentation.
