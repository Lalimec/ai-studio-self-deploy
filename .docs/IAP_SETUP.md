# Identity-Aware Proxy (IAP) Setup Guide

This guide explains how to configure Identity-Aware Proxy for your Cloud Run service to restrict access to @lyrebirdstudio.net domain users only.

## Overview

After deploying with `--no-allow-unauthenticated`, your Cloud Run service requires authentication. IAP adds an additional layer that restricts access by email domain.

## Prerequisites

- Deployed Cloud Run service (`ai-studio-v2`)
- Google Workspace domain: `lyrebirdstudio.net`
- Admin access to GCP project: `cemil-scripts`

---

## Step 1: Configure OAuth Consent Screen

1. Go to [GCP Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)

2. **Select User Type:**
   - Choose **Internal** (restricts to your organization)
   - Click **Create**

3. **App Information:**
   - **App name:** AI Studio
   - **User support email:** Your email
   - **Developer contact:** Your email
   - Click **Save and Continue**

4. **Scopes:**
   - Click **Add or Remove Scopes**
   - Select: `openid`, `email`, `profile`
   - Click **Update** → **Save and Continue**

5. **Summary:**
   - Review and click **Back to Dashboard**

---

## Step 2: Enable IAP

1. Go to [Security → Identity-Aware Proxy](https://console.cloud.google.com/security/iap)

2. If prompted, **Enable the IAP API**

3. In the resources list, find your Cloud Run service:
   ```
   Service: ai-studio-v2
   Region: us-central1
   ```

4. **Toggle IAP to ON** for your service

---

## Step 3: Configure Access Policy

### Option A: Domain-Wide Access (Recommended)

1. In the IAP page, select your Cloud Run service
2. Click **Add Principal** in the right panel
3. In "New principals" field, enter:
   ```
   domain:lyrebirdstudio.net
   ```
4. Select role: **IAP-secured Web App User**
5. Click **Save**

### Option B: Specific Users

If you need more granular control:

1. Click **Add Principal**
2. Add individual emails:
   ```
   user@lyrebirdstudio.net
   ```
3. Select role: **IAP-secured Web App User**
4. Click **Save**

---

## Step 4: Grant Cloud Run Invoker Role

IAP users also need permission to invoke Cloud Run services:

1. Go to [Cloud Run → Select your service](https://console.cloud.google.com/run)
2. Click on **ai-studio-v2**
3. Click **Permissions** tab
4. Click **Grant Access**
5. Add principals:
   ```
   domain:lyrebirdstudio.net
   ```
6. Select role: **Cloud Run Invoker**
7. Click **Save**

---

## Step 5: Test Access

1. **Access the service URL** in an incognito window:
   ```
   https://ai-studio-v2-<hash>-uc.a.run.app
   ```

2. **Expected behavior:**
   - Redirected to Google login
   - Only @lyrebirdstudio.net accounts can sign in
   - After authentication, redirected to the app

3. **Test with non-domain email:**
   - Should see: "You don't have access"

---

## Verification Checklist

- [ ] OAuth consent screen configured as Internal
- [ ] IAP enabled for Cloud Run service
- [ ] Domain principal added with IAP-secured Web App User role
- [ ] Domain principal added with Cloud Run Invoker role
- [ ] Tested access with @lyrebirdstudio.net account
- [ ] Verified non-domain accounts are blocked

---

## Managing Access

### Add New User
```bash
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=ai-studio-v2 \
  --member=user:newuser@lyrebirdstudio.net \
  --role=roles/iap.httpsResourceAccessor
```

### Remove User
```bash
gcloud iap web remove-iam-policy-binding \
  --resource-type=backend-services \
  --service=ai-studio-v2 \
  --member=user:olduser@lyrebirdstudio.net \
  --role=roles/iap.httpsResourceAccessor
```

### View Current Access
```bash
gcloud iap web get-iam-policy \
  --resource-type=backend-services \
  --service=ai-studio-v2
```

---

## Troubleshooting

### "You don't have access" Error

**Cause:** User doesn't have IAP-secured Web App User role

**Solution:**
```bash
gcloud projects add-iam-policy-binding cemil-scripts \
  --member=domain:lyrebirdstudio.net \
  --role=roles/iap.httpsResourceAccessor
```

### "403 Forbidden" Error

**Cause:** User doesn't have Cloud Run Invoker role

**Solution:**
```bash
gcloud run services add-iam-policy-binding ai-studio-v2 \
  --region=us-central1 \
  --member=domain:lyrebirdstudio.net \
  --role=roles/run.invoker
```

### IAP Toggle Grayed Out

**Cause:** OAuth consent screen not configured

**Solution:** Complete Step 1 first

---

## Security Best Practices

1. **Use Internal OAuth consent screen** (not External)
2. **Restrict by domain** (`domain:lyrebirdstudio.net`) not individual users
3. **Regularly audit access** via IAM logs
4. **Enable Cloud Audit Logs** to track access attempts
5. **Set up alerts** for unauthorized access attempts

---

## Additional Resources

- [Google Cloud IAP Documentation](https://cloud.google.com/iap/docs)
- [Cloud Run Authentication](https://cloud.google.com/run/docs/authenticating/overview)
- [IAP with Cloud Run](https://cloud.google.com/iap/docs/enabling-cloud-run)

---

## Summary

After completing these steps:
- ✅ Only @lyrebirdstudio.net users can access the app
- ✅ Google handles authentication automatically
- ✅ No code changes needed in your application
- ✅ Audit logs track all access attempts
- ✅ Future deployments respect authentication settings
