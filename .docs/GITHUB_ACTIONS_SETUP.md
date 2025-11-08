# GitHub Actions Setup Guide for Google Cloud Run Deployment

This guide walks you through setting up automated deployment to Google Cloud Run using GitHub Actions.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Set Up Google Cloud Project](#step-1-set-up-google-cloud-project)
- [Step 2: Create Service Account](#step-2-create-service-account)
- [Step 3: Configure GitHub Secrets](#step-3-configure-github-secrets)
- [Step 4: Enable GitHub Actions](#step-4-enable-github-actions)
- [Step 5: Deploy](#step-5-deploy)
- [Troubleshooting](#troubleshooting)

---

## Overview

The GitHub Actions workflow automatically:
1. Builds the Node.js application
2. Creates a Docker container
3. Pushes the image to Google Container Registry (GCR)
4. Deploys to Google Cloud Run
5. Provides the service URL in the deployment summary

**Workflow file:** `.github/workflows/deploy.yml`

---

## Prerequisites

- Google Cloud account with billing enabled
- GitHub repository with admin access
- Google Gemini API key

---

## Step 1: Set Up Google Cloud Project

### 1.1 Create or Select a Project

```bash
# Create a new project
gcloud projects create ai-studio-self-deploy --name="AI Studio Self Deploy"

# Or list existing projects
gcloud projects list

# Set the project
export PROJECT_ID="ai-studio-self-deploy"
gcloud config set project $PROJECT_ID
```

### 1.2 Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Artifact Registry API (optional, for future use)
gcloud services enable artifactregistry.googleapis.com

# Enable Secret Manager API (recommended)
gcloud services enable secretmanager.googleapis.com
```

### 1.3 Enable Billing

Make sure billing is enabled for your project:
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Navigate to **Billing** → Select your project
- Link a billing account

---

## Step 2: Create Service Account

### 2.1 Create the Service Account

```bash
# Set variables
export PROJECT_ID="ai-studio-self-deploy"
export SA_NAME="github-actions-deployer"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for deploying from GitHub Actions"
```

### 2.2 Grant Required Roles

```bash
# Cloud Run Admin (to deploy services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Storage Admin (to push/pull container images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

# Service Account User (to act as service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Cloud Build Editor (to build containers)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"
```

### 2.3 Create and Download Key

```bash
# Create JSON key
gcloud iam service-accounts keys create ~/gcp-key.json \
  --iam-account=$SA_EMAIL

# Display the key (you'll need this for GitHub)
cat ~/gcp-key.json

# IMPORTANT: Keep this file secure and delete after adding to GitHub
```

**⚠️ Security Warning:**
- Never commit this JSON key to your repository
- Store it securely in GitHub Secrets only
- Delete the local file after use: `rm ~/gcp-key.json`

---

## Step 3: Configure GitHub Secrets

Navigate to your GitHub repository and add the following secrets:

### 3.1 Access GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### 3.2 Add Required Secrets

Create the following secrets:

#### **GCP_PROJECT_ID**
- **Name:** `GCP_PROJECT_ID`
- **Value:** Your Google Cloud project ID (e.g., `ai-studio-self-deploy`)

#### **GCP_SA_KEY**
- **Name:** `GCP_SA_KEY`
- **Value:** Entire contents of the `gcp-key.json` file
  ```json
  {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "...",
    "private_key": "...",
    ...
  }
  ```

#### **GEMINI_API_KEY**
- **Name:** `GEMINI_API_KEY`
- **Value:** Your Google Gemini API key
- Get your API key from: https://makersuite.google.com/app/apikey

### 3.3 Verify Secrets

Your repository secrets should now include:
- ✅ `GCP_PROJECT_ID`
- ✅ `GCP_SA_KEY`
- ✅ `GEMINI_API_KEY`

---

## Step 4: Enable GitHub Actions

### 4.1 Workflow Permissions

Ensure GitHub Actions has the correct permissions:

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
3. Click **Save**

### 4.2 Workflow File Location

The workflow is located at:
```
.github/workflows/deploy.yml
```

### 4.3 Workflow Triggers

The deployment runs automatically on:
- **Push to `main` branch**
- **Manual trigger** via GitHub Actions UI

---

## Step 5: Deploy

### 5.1 Automatic Deployment

Push to the `main` branch:

```bash
git add .
git commit -m "feat: Add GitHub Actions deployment workflow"
git push origin main
```

The workflow will automatically:
1. ✅ Checkout code
2. ✅ Install Node.js dependencies
3. ✅ Build the application
4. ✅ Authenticate with Google Cloud
5. ✅ Build Docker image
6. ✅ Push to Google Container Registry
7. ✅ Deploy to Cloud Run
8. ✅ Display service URL

### 5.2 Manual Deployment

Trigger manually from GitHub:

1. Go to **Actions** tab
2. Select **Deploy to Google Cloud Run**
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

### 5.3 Monitor Deployment

Watch the deployment progress:
1. Go to **Actions** tab
2. Click on the running workflow
3. View logs for each step
4. Check deployment summary for service URL

### 5.4 Access Your Application

After successful deployment:
1. Check the workflow summary for the service URL
2. Or get it manually:
   ```bash
   gcloud run services describe ai-studio \
     --platform managed \
     --region us-central1 \
     --format 'value(status.url)'
   ```

---

## Workflow Configuration

### Environment Variables

Edit in `.github/workflows/deploy.yml`:

```yaml
env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  SERVICE_NAME: ai-studio          # Change service name
  REGION: us-central1              # Change region
  REGISTRY: gcr.io                 # Change registry
```

### Cloud Run Settings

Modify deployment parameters:

```yaml
gcloud run deploy $SERVICE_NAME \
  --memory 512Mi           # Adjust memory (256Mi, 512Mi, 1Gi, 2Gi)
  --cpu 1                  # Adjust CPU (1, 2, 4)
  --max-instances 10       # Set max instances
  --min-instances 0        # Set min instances (0 = scale to zero)
  --timeout 300            # Request timeout in seconds
  --concurrency 80         # Max concurrent requests per instance
```

---

## Troubleshooting

### Issue: Authentication Failed

**Error:** `ERROR: (gcloud.run.deploy) PERMISSION_DENIED`

**Solution:**
1. Verify service account has correct roles
2. Check `GCP_SA_KEY` secret is valid JSON
3. Ensure APIs are enabled in Google Cloud

```bash
# Re-check service account roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}"
```

### Issue: Build Failed

**Error:** `npm ci failed` or `npm run build failed`

**Solution:**
1. Test build locally: `npm ci && npm run build`
2. Check `package.json` scripts
3. Review build logs in Actions tab

### Issue: Container Push Failed

**Error:** `denied: Permission "storage.buckets.create" denied`

**Solution:**
1. Grant Storage Admin role to service account
2. Enable Container Registry API

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### Issue: Deployment Failed

**Error:** `ERROR: (gcloud.run.deploy) The user does not have permission`

**Solution:**
1. Verify Cloud Run Admin role
2. Verify Service Account User role

```bash
# Grant Cloud Run Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Grant Service Account User
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

### Issue: Service URL Not Accessible

**Error:** `403 Forbidden` or `Service not found`

**Solution:**
1. Check if service is deployed:
   ```bash
   gcloud run services list --region us-central1
   ```
2. Verify `--allow-unauthenticated` is set
3. Check Cloud Run logs:
   ```bash
   gcloud run services logs read ai-studio --region us-central1
   ```

### Issue: Environment Variables Not Working

**Error:** Application can't access `GEMINI_API_KEY`

**Solution:**
1. Verify `GEMINI_API_KEY` secret exists in GitHub
2. Check environment variable is set in workflow
3. Update environment variable in Cloud Run:
   ```bash
   gcloud run services update ai-studio \
     --update-env-vars GEMINI_API_KEY=your_key_here \
     --region us-central1
   ```

---

## Cost Optimization

### Free Tier Limits (Cloud Run)
- **2 million requests/month**
- **360,000 GB-seconds/month**
- **180,000 vCPU-seconds/month**

### Reduce Costs
1. **Scale to zero:** Set `--min-instances 0`
2. **Lower memory:** Use `--memory 256Mi` if possible
3. **Set max instances:** Limit with `--max-instances 5`
4. **Enable billing alerts** in Google Cloud Console

---

## Security Best Practices

### 1. Rotate API Keys Regularly

```bash
# Update GitHub secret with new key
# Then update Cloud Run service:
gcloud run services update ai-studio \
  --update-env-vars GEMINI_API_KEY=new_key_here \
  --region us-central1
```

### 2. Use Secret Manager (Advanced)

Instead of environment variables, use Secret Manager:

```bash
# Create secret
echo -n "your_api_key" | gcloud secrets create gemini-api-key --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Update workflow to use secret
gcloud run deploy ai-studio \
  --image gcr.io/$PROJECT_ID/ai-studio:latest \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --region us-central1
```

### 3. Restrict Service Account Permissions

Use principle of least privilege:
- Only grant necessary roles
- Create separate service accounts for different environments
- Regularly audit IAM policies

### 4. Enable Cloud Armor (Production)

Add DDoS protection and WAF:
```bash
# Create security policy
gcloud compute security-policies create ai-studio-policy

# Add rules and attach to Cloud Run
```

---

## Monitoring and Logging

### View Logs

```bash
# Recent logs
gcloud run services logs read ai-studio \
  --region us-central1 \
  --limit 50

# Stream logs
gcloud run services logs tail ai-studio \
  --region us-central1

# Filter by severity
gcloud run services logs read ai-studio \
  --region us-central1 \
  --log-filter="severity>=ERROR"
```

### Set Up Alerts

1. Go to [Cloud Console Monitoring](https://console.cloud.google.com/monitoring)
2. Create alert policies for:
   - High error rates
   - High latency
   - Resource usage
   - Budget thresholds

---

## Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Container Registry Guide](https://cloud.google.com/container-registry/docs)
- [IAM Best Practices](https://cloud.google.com/iam/docs/best-practices)

---

## Support

For issues or questions:
1. Check [DEPLOYMENT.md](.docs/DEPLOYMENT.md) for general deployment guide
2. Review workflow logs in GitHub Actions
3. Check Cloud Run logs in Google Cloud Console
4. Open an issue on GitHub repository

---

**Last updated:** 2025-11-08
