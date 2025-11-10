# Firestore Database Schema

This document defines the data structure for AI Studio's Firestore database.

## Collections Overview

```
firestore
├── users/{email}                    # User profiles
├── generations/{generationId}       # All user generations
└── settings/access_control          # App-wide access settings
```

---

## Collection: `users`

Document ID: User's email address (e.g., `user@lyrebirdstudio.net`)

### Schema

```typescript
interface UserProfile {
  // Identity
  email: string;                     // Primary key (document ID)
  displayName: string | null;        // From Google profile
  photoURL: string | null;           // From Google profile

  // Status
  status: 'pending' | 'approved' | 'suspended';
  isAdmin: boolean;                  // Can approve users, manage settings

  // Quotas & Usage
  credits: number;                   // Remaining credits
  usageCount: number;                // Total generations created
  tier: 'free' | 'pro' | 'enterprise';

  // Metadata
  domain: string;                    // Email domain (e.g., 'lyrebirdstudio.net')
  isInternalUser: boolean;           // true if domain in ALLOWED_DOMAINS
  createdAt: string;                 // ISO 8601 timestamp
  lastLoginAt: string;               // ISO 8601 timestamp
  lastActivityAt: string;            // Last generation or action

  // Optional settings
  preferences?: {
    defaultModel?: string;           // Preferred image model
    enableBetaFeatures?: boolean;    // Show beta studios
    emailNotifications?: boolean;    // Receive emails
  };
}
```

### Example Document

```json
{
  "email": "john@lyrebirdstudio.net",
  "displayName": "John Doe",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "status": "approved",
  "isAdmin": false,
  "credits": 8547,
  "usageCount": 1453,
  "tier": "pro",
  "domain": "lyrebirdstudio.net",
  "isInternalUser": true,
  "createdAt": "2025-11-10T10:30:00.000Z",
  "lastLoginAt": "2025-11-10T14:25:00.000Z",
  "lastActivityAt": "2025-11-10T14:30:00.000Z",
  "preferences": {
    "defaultModel": "nanoBanana",
    "enableBetaFeatures": true,
    "emailNotifications": false
  }
}
```

### Indexes

**Primary**: Document ID (email)
**Compound indexes**: None required for basic queries

### Access Patterns

```typescript
// Get user profile
const userDoc = await getDoc(doc(db, 'users', userEmail));

// Update last login
await updateDoc(doc(db, 'users', userEmail), {
  lastLoginAt: new Date().toISOString()
});

// Decrement credits
await updateDoc(doc(db, 'users', userEmail), {
  credits: increment(-1),
  usageCount: increment(1),
  lastActivityAt: new Date().toISOString()
});

// Query pending users (Admin SDK only - requires index)
const q = query(
  collection(db, 'users'),
  where('status', '==', 'pending')
);
```

---

## Collection: `generations`

Document ID: Auto-generated unique ID

### Schema

```typescript
interface Generation {
  // Identity
  id: string;                        // Document ID
  userId: string;                    // User email who created this

  // Generation Info
  studioType: 'hair' | 'baby' | 'image' | 'video' | 'timeline' | 'adCloner' | 'videoAnalyzer';
  sessionId?: string;                // Groups related generations
  batchId?: string;                  // For batch operations

  // Content
  imageUrl: string;                  // GCS public URL
  thumbnailUrl?: string;             // Optional smaller version
  prompt?: string;                   // Generation prompt
  negativePrompt?: string;           // Negative prompt (if applicable)

  // Metadata
  model: string;                     // 'gemini', 'nanoBanana', 'seedream', 'flux', etc.
  aspectRatio?: string;              // '1:1', '16:9', etc.
  dimensions?: {
    width: number;
    height: number;
  };

  // Studio-specific data
  settings?: {
    // Hair Studio
    hairstyle?: string;
    hairColor?: string;
    adornment?: string;

    // Baby Studio
    babyAge?: string;
    babyGender?: string;
    babyStyle?: string;

    // Image Studio
    variationCount?: number;

    // Video Studio
    motionPrompt?: string;
    videoDuration?: number;
    videoUrl?: string;              // For video generations

    // Ad Cloner
    adContext?: string;
    variationType?: string;

    // Any other studio-specific settings
    [key: string]: any;
  };

  // Timestamps
  createdAt: string;                 // ISO 8601

  // Status
  isFavorite?: boolean;              // User marked as favorite
  isDeleted?: boolean;               // Soft delete flag
  deletedAt?: string;                // When deleted

  // File info
  fileSize?: number;                 // Bytes
  mimeType?: string;                 // 'image/png', 'video/mp4', etc.

  // Cost tracking
  creditsUsed: number;               // How many credits this cost
}
```

### Example Document (Hair Studio)

```json
{
  "id": "gen_abc123xyz",
  "userId": "john@lyrebirdstudio.net",
  "studioType": "hair",
  "sessionId": "session_20251110_143000",
  "imageUrl": "https://storage.googleapis.com/your-bucket/generations/john@lyrebirdstudio.net/hair/20251110/abc123.png",
  "thumbnailUrl": "https://storage.googleapis.com/your-bucket/thumbnails/john@lyrebirdstudio.net/hair/20251110/abc123_thumb.png",
  "prompt": "Professional woman with long wavy blonde hair, outdoor setting",
  "model": "nanoBanana",
  "aspectRatio": "1:1",
  "dimensions": {
    "width": 1024,
    "height": 1024
  },
  "settings": {
    "hairstyle": "Long Wavy",
    "hairColor": "Blonde",
    "adornment": "None"
  },
  "createdAt": "2025-11-10T14:30:45.123Z",
  "isFavorite": false,
  "isDeleted": false,
  "fileSize": 2457600,
  "mimeType": "image/png",
  "creditsUsed": 1
}
```

### Example Document (Video Studio)

```json
{
  "id": "gen_video456",
  "userId": "jane@company.com",
  "studioType": "video",
  "imageUrl": "https://storage.googleapis.com/your-bucket/generations/jane@company.com/video/20251110/input456.png",
  "videoUrl": "https://storage.googleapis.com/your-bucket/generations/jane@company.com/video/20251110/output456.mp4",
  "prompt": "Gentle camera pan across sunset landscape",
  "model": "seedance",
  "settings": {
    "motionPrompt": "Gentle camera pan across sunset landscape",
    "videoDuration": 5
  },
  "createdAt": "2025-11-10T15:12:30.000Z",
  "isFavorite": true,
  "fileSize": 8912340,
  "mimeType": "video/mp4",
  "creditsUsed": 5
}
```

### Indexes

**Required composite indexes:**

1. **User generations by date (descending)**
   - Collection: `generations`
   - Fields: `userId` (Ascending), `createdAt` (Descending)
   - Purpose: Get user's recent generations

2. **User generations by studio type**
   - Collection: `generations`
   - Fields: `userId` (Ascending), `studioType` (Ascending), `createdAt` (Descending)
   - Purpose: Filter by studio type

3. **User favorites**
   - Collection: `generations`
   - Fields: `userId` (Ascending), `isFavorite` (Ascending), `createdAt` (Descending)
   - Purpose: Show only favorites

### Access Patterns

```typescript
// Save new generation
const generationRef = await addDoc(collection(db, 'generations'), {
  userId: userEmail,
  studioType: 'hair',
  imageUrl: gcsUrl,
  prompt: promptText,
  model: 'nanoBanana',
  createdAt: new Date().toISOString(),
  creditsUsed: 1,
  // ... other fields
});

// Get user's recent generations (requires index)
const q = query(
  collection(db, 'generations'),
  where('userId', '==', userEmail),
  where('isDeleted', '!=', true),
  orderBy('createdAt', 'desc'),
  limit(50)
);
const snapshot = await getDocs(q);

// Get generations by studio type (requires index)
const q = query(
  collection(db, 'generations'),
  where('userId', '==', userEmail),
  where('studioType', '==', 'hair'),
  orderBy('createdAt', 'desc'),
  limit(20)
);

// Get favorites (requires index)
const q = query(
  collection(db, 'generations'),
  where('userId', '==', userEmail),
  where('isFavorite', '==', true),
  orderBy('createdAt', 'desc')
);

// Soft delete
await updateDoc(doc(db, 'generations', generationId), {
  isDeleted: true,
  deletedAt: new Date().toISOString()
});

// Toggle favorite
await updateDoc(doc(db, 'generations', generationId), {
  isFavorite: !currentFavoriteState
});
```

---

## Collection: `settings`

### Document: `access_control`

```typescript
interface AccessControlSettings {
  allowedDomains: string[];          // ['lyrebirdstudio.net']
  allowExternal: boolean;            // Allow non-domain users
  whitelistedEmails: string[];       // Specific external emails allowed

  // Default credits
  internalUserCredits: number;       // Credits for internal users
  externalUserCredits: number;       // Credits for external users

  // Auto-approval
  internalAutoApprove: boolean;      // true = auto-approve internal
  externalAutoApprove: boolean;      // false = need admin approval

  // Feature flags
  enableBetaFeatures: boolean;       // Global beta toggle
  maintenanceMode: boolean;          // Disable all generation

  // Rate limiting
  maxGenerationsPerHour?: number;    // Per-user limit
  maxGenerationsPerDay?: number;     // Per-user limit
}
```

### Example Document

```json
{
  "allowedDomains": ["lyrebirdstudio.net"],
  "allowExternal": false,
  "whitelistedEmails": ["partner@external.com"],
  "internalUserCredits": 10000,
  "externalUserCredits": 100,
  "internalAutoApprove": true,
  "externalAutoApprove": false,
  "enableBetaFeatures": false,
  "maintenanceMode": false,
  "maxGenerationsPerHour": 100,
  "maxGenerationsPerDay": 500
}
```

---

## Storage Strategy

### Image/Video Files

Files are stored in **Google Cloud Storage**, not Firestore (Firestore only stores URLs).

**GCS Bucket structure:**

```
your-bucket-name/
├── generations/
│   ├── {userId}/
│   │   ├── hair/
│   │   │   ├── {YYYYMMDD}/
│   │   │   │   ├── {generationId}.png
│   │   │   │   └── ...
│   │   ├── baby/
│   │   ├── image/
│   │   ├── video/
│   │   └── ...
│   └── ...
├── thumbnails/
│   ├── {userId}/
│   │   └── ... (same structure)
└── temp/
    └── ... (cleanup after 24h)
```

**File naming convention:**

```
generations/{userId}/{studioType}/{YYYYMMDD}/{generationId}.{ext}
```

Example:
```
generations/john@lyrebirdstudio.net/hair/20251110/gen_abc123xyz.png
```

**Advantages:**
- ✅ Firestore has 1MB document size limit
- ✅ GCS optimized for large files
- ✅ CDN-ready URLs for fast access
- ✅ Lifecycle policies (auto-delete old files)
- ✅ Cost-effective ($0.020/GB vs Firestore's $0.18/GB)

---

## Data Lifecycle

### User Signup Flow

```
1. User signs in with Google
2. Check if user exists in Firestore
3. If not, create user document:
   - Extract domain from email
   - Check if internal user (domain in ALLOWED_DOMAINS)
   - Set status: internal ? 'approved' : 'pending'
   - Set credits: internal ? 10000 : 100
   - Set tier: 'free'
4. Update lastLoginAt
```

### Generation Flow

```
1. User initiates generation
2. Check credits >= cost
3. Generate image/video
4. Upload to GCS (using existing imageUploadService)
5. Save generation document to Firestore with GCS URL
6. Decrement user credits
7. Update user.lastActivityAt
```

### Cleanup Policy

**Soft deletes:**
- Generations marked as deleted stay in Firestore
- Files remain in GCS for 30 days (lifecycle policy)
- Admin can permanently delete

**Hard deletes:**
- Only via Admin SDK
- Removes Firestore document
- Marks GCS file for deletion

---

## Security Rules Summary

```javascript
// Users can only read/write their own data
match /users/{email} {
  allow read: if authenticated && email == userEmail;
  allow create: if authenticated && email == userEmail;
  allow update: if authenticated && email == userEmail && limitedFields;
}

// Users can only read/write their own generations
match /generations/{generationId} {
  allow read: if authenticated && resource.data.userId == userEmail;
  allow create: if authenticated && request.resource.data.userId == userEmail;
  allow delete: if authenticated && resource.data.userId == userEmail;
}

// Settings are read-only (server writes via Admin SDK)
match /settings/{document} {
  allow read: if authenticated;
  allow write: if false;
}
```

**Admin operations** (user approval, credit adjustment) use Firebase Admin SDK which bypasses security rules.

---

## Cost Estimation

### Firestore

**Pricing:**
- Document reads: $0.06 per 100k
- Document writes: $0.18 per 100k
- Storage: $0.18/GB/month

**Expected usage (1000 users, 10 generations/user/month):**
- Reads: ~100k/month = $0.06
- Writes: ~10k/month = $0.02
- Storage: ~50MB = $0.01
- **Total: ~$0.10/month**

### Google Cloud Storage

**Pricing:**
- Storage: $0.020/GB/month (Standard)
- Operations: Negligible for this scale

**Expected usage (10k images, avg 2MB each):**
- Storage: 20GB = $0.40/month
- **Total: ~$0.40/month**

### Combined Cost

**Total monthly cost: ~$0.50** (very affordable at this scale)

At 10k users: ~$5-10/month

---

## Migration Strategy

If moving from current sessionStorage to Firestore:

1. **Phase 1:** Add Firestore without removing sessionStorage
2. **Phase 2:** Save new generations to both
3. **Phase 3:** Add gallery to show Firestore generations
4. **Phase 4:** Stop using sessionStorage

No data migration needed since sessionStorage is temporary.

---

## Resources

- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Security Rules Reference](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Cloud Storage Integration](https://firebase.google.com/docs/storage)
