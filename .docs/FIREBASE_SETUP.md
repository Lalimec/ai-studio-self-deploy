# Firebase Setup Guide

This guide walks you through setting up Firebase Authentication and Firestore for the AI Studio application.

## Overview

The application uses:
- **Firebase Authentication** - Google Sign-In with domain restriction
- **Firestore Database** - User profiles and generation history
- **Firebase Admin SDK** - Server-side token validation and user management

## Prerequisites

- Google Cloud project (`cemil-scripts` or your project)
- Admin access to create Firebase project
- `gcloud` CLI installed and authenticated

---

## Step 1: Create Firebase Project

### Option A: Use Existing GCP Project (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project**
3. Select **Use an existing Google Cloud project**
4. Choose your project (`cemil-scripts`)
5. Enable Google Analytics (optional)
6. Click **Continue**

### Option B: Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Create a project**
3. Name: `AI Studio` (or your choice)
4. Enable Google Analytics (optional)
5. Click **Create project**

---

## Step 2: Enable Authentication

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get started**
3. Click **Sign-in method** tab
4. Enable **Google** sign-in provider:
   - Toggle to **Enabled**
   - Project support email: Your email
   - Click **Save**

5. (Optional) Enable **Email/Password** for additional sign-in method

---

## Step 3: Create Firestore Database

1. In Firebase Console, click **Firestore Database** in left sidebar
2. Click **Create database**
3. Select **Start in production mode**
4. Choose location: `us-central1` (same as Cloud Run)
5. Click **Enable**

### Set Up Security Rules

1. Click **Rules** tab
2. Replace with the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User documents
    match /users/{email} {
      // Users can read their own profile
      allow read: if request.auth != null && request.auth.token.email == email;

      // Only authenticated users can create their profile
      allow create: if request.auth != null && request.auth.token.email == email;

      // Users can update their own lastLoginAt field
      allow update: if request.auth != null &&
                      request.auth.token.email == email &&
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastLoginAt']);
    }

    // Generations collection
    match /generations/{generationId} {
      // Users can read their own generations
      allow read: if request.auth != null &&
                     resource.data.userId == request.auth.token.email;

      // Users can create generations with their own userId
      allow create: if request.auth != null &&
                       request.resource.data.userId == request.auth.token.email;

      // Users can delete their own generations
      allow delete: if request.auth != null &&
                       resource.data.userId == request.auth.token.email;
    }

    // Settings (admin only - read-only for now)
    match /settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only via server-side Admin SDK
    }

    // Admin access (for server-side operations)
    // Server uses Admin SDK which bypasses these rules
  }
}
```

3. Click **Publish**

---

## Step 4: Get Firebase Config (Frontend)

1. In Firebase Console, go to **Project settings** (gear icon)
2. Scroll to **Your apps** section
3. Click **Web** icon (`</>`)
4. Register app:
   - App nickname: `AI Studio Web`
   - Don't enable Firebase Hosting
   - Click **Register app**

5. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Create `.env.local` file in project root:

```bash
# Gemini API Key (existing)
GEMINI_API_KEY=your_gemini_api_key

# Firebase Config (Frontend)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id
VITE_FIREBASE_STORAGE_BUCKET=project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# App Configuration
VITE_ALLOWED_DOMAINS=lyrebirdstudio.net
VITE_ALLOW_EXTERNAL=false
```

---

## Step 5: Generate Service Account Key (Backend)

The server needs Firebase Admin SDK credentials to validate tokens.

### Method 1: Generate New Service Account Key

1. Go to [GCP Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Find or create service account: `firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com`
3. Click **Actions** → **Manage keys**
4. Click **Add key** → **Create new key**
5. Choose **JSON** format
6. Click **Create** → Downloads `project-id-xxxxxx.json`

**⚠️ SECURITY WARNING:** Never commit this file to git!

### Method 2: Use Existing Service Account (GitHub Actions)

If you already have `GCP_SA_KEY` secret in GitHub Actions:

```bash
# Decode base64 key
echo "$GCP_SA_KEY" | base64 -d > service-account.json
```

### Set Environment Variables

**For local development:**

Create `server/.env` file:

```bash
# Option A: Path to service account JSON
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Option B: Inline JSON (for Cloud Run)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Gemini API Key
GEMINI_API_KEY=your_key_here
API_KEY=your_key_here

# Access Control
ALLOW_EXTERNAL=false
ALLOWED_DOMAINS=lyrebirdstudio.net
```

**For production (Cloud Run):**

Set via `gcloud`:

```bash
# Using service account JSON (base64 encoded)
gcloud run services update ai-studio-v2 \
  --region=us-central1 \
  --set-env-vars FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json | jq -c)" \
  --set-env-vars ALLOW_EXTERNAL=false \
  --set-env-vars ALLOWED_DOMAINS=lyrebirdstudio.net
```

Or use GitHub Actions secret (already configured).

---

## Step 6: Set Up Firestore Indexes

Some queries require composite indexes.

1. In Firestore Console, click **Indexes** tab
2. Click **+ Create index**
3. Create the following indexes:

**Index 1: Generations by user and timestamp**
- Collection ID: `generations`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection
- Click **Create**

**Index 2: Generations by user and studio**
- Collection ID: `generations`
- Fields:
  - `userId` (Ascending)
  - `studioType` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection
- Click **Create**

These indexes enable efficient querying of user generations.

---

## Step 7: Initialize Admin Panel User

Create an admin user to approve other users:

1. Sign in to the app with your @lyrebirdstudio.net email
2. Your account will be auto-approved
3. Use Firestore Console to manually set admin flag:
   - Go to Firestore Database
   - Navigate to `users/{your-email}`
   - Add field: `isAdmin: true`

Alternatively, use Firebase Admin SDK:

```javascript
// One-time script
const admin = require('firebase-admin');
admin.initializeApp();

await admin.firestore()
  .collection('users')
  .doc('your-email@lyrebirdstudio.net')
  .update({ isAdmin: true });
```

---

## Step 8: Configure Access Control Settings

Create initial access control document:

1. In Firestore Console, click **+ Start collection**
2. Collection ID: `settings`
3. Document ID: `access_control`
4. Fields:

```json
{
  "allowedDomains": ["lyrebirdstudio.net"],
  "allowExternal": false,
  "whitelistedEmails": [],
  "internalUserCredits": 10000,
  "externalUserCredits": 100,
  "internalAutoApprove": true,
  "externalAutoApprove": false
}
```

5. Click **Save**

---

## Verification Checklist

- [ ] Firebase project created and linked to GCP
- [ ] Google Authentication enabled
- [ ] Firestore database created in production mode
- [ ] Security rules published
- [ ] Composite indexes created
- [ ] Frontend config added to `.env.local`
- [ ] Service account key generated
- [ ] Backend environment variables set
- [ ] Access control settings document created
- [ ] Admin user created and flagged

---

## Testing Authentication

### Local Development

1. Start dev server:
```bash
npm run dev
```

2. Start backend server:
```bash
cd server
npm start
```

3. Open http://localhost:5173
4. Click "Sign in with Google"
5. Should redirect to Google OAuth
6. After sign-in, profile created in Firestore

### Production (Cloud Run)

1. Deploy with Firebase credentials:
```bash
npm run build
cd server
gcloud run deploy ai-studio-v2 \
  --region=us-central1 \
  --source . \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_SERVICE_ACCOUNT_JSON="..." \
  --set-env-vars ALLOW_EXTERNAL=false
```

2. Access Cloud Run URL
3. Should show login screen
4. Sign in with @lyrebirdstudio.net account
5. Profile auto-approved and created

---

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"

**Cause:** Your domain is not authorized in Firebase Console

**Solution:**
1. Go to Firebase Console → Authentication → Settings
2. Click **Authorized domains** tab
3. Add your domain (e.g., `ai-studio-v2-xxx.run.app`, `localhost`)
4. Click **Add**

### "Permission denied" errors in Firestore

**Cause:** Security rules are blocking the operation

**Solution:**
1. Check Firestore rules match the ones in this guide
2. Ensure user is authenticated (`request.auth != null`)
3. Check Rules simulator in Firestore Console

### "Firebase Admin initialization error"

**Cause:** Service account credentials not found or invalid

**Solution:**
1. Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
2. Or verify `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON
3. Check service account has proper permissions (Firebase Admin SDK)

### External users can't sign up

**Cause:** `ALLOW_EXTERNAL=false` in environment variables

**Solution:**
1. Update environment variable to `ALLOW_EXTERNAL=true`
2. Redeploy or restart server
3. External users can now sign up (pending approval)

---

## Security Best Practices

1. **Never commit service account keys** to git
   - Add `service-account.json` to `.gitignore`
   - Use environment variables for production

2. **Rotate service account keys** periodically
   - Every 90 days recommended
   - Delete old keys after rotation

3. **Use least-privilege IAM roles**
   - Service account only needs Firestore and Auth permissions
   - Don't grant Owner or Editor roles

4. **Monitor authentication logs**
   - Cloud Logging captures all auth events
   - Set up alerts for suspicious activity

5. **Enable MFA for admin accounts**
   - Require 2FA for @lyrebirdstudio.net admins
   - Configure in Google Workspace

6. **Review Firestore security rules regularly**
   - Ensure rules match application requirements
   - Test with Rules simulator

---

## Next Steps

After setup:
1. Create login screen component
2. Update App.tsx with auth gate
3. Implement user profile management
4. Add generation storage service
5. Build user gallery component

See main CLAUDE.md for implementation details.

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth - Web](https://firebase.google.com/docs/auth/web/start)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
