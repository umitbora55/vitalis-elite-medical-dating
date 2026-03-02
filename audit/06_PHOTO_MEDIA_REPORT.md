# Agent 6: Photo & Media Specialist Audit Report

## Mission
Fast, reliable photo upload and display.

**SLO Target:** SLO-10: Image load time p95 < 1.5s

---

## Executive Summary

| Category | Status | Risk Level |
|----------|--------|------------|
| Photo Upload Flow | CRITICAL GAPS | HIGH |
| Image Optimization | NOT IMPLEMENTED | HIGH |
| Caching Strategy | NOT IMPLEMENTED | MEDIUM |
| Progressive Loading | NOT IMPLEMENTED | MEDIUM |
| Signed URL Handling | PARTIAL | MEDIUM |
| Photo Validation | PARTIAL (Documents only) | HIGH |
| Multiple Photo Handling | MOCK ONLY | HIGH |
| Error Handling | PARTIAL | MEDIUM |

**Overall Assessment:** The photo and media system has significant implementation gaps that will likely cause SLO-10 violations and poor user experience. Profile photo upload flow is entirely missing, while the app relies on external URLs (picsum.photos, unsplash) for mock data.

---

## Evidence Dossier

### 1. Photo Upload Flow

#### Finding: CRITICAL - No Profile Photo Upload Implementation

**Location:** `services/profileService.ts`, `components/MyProfileView.tsx`

**Evidence:**
```typescript
// services/profileService.ts - Lines 1-70
// NO photo upload function exists
// Only profile metadata upsert is implemented

const mapProfileToRow = (profile: Profile) => {
  return {
    name: profile.name,
    age: profile.age,
    // ... NO image/photo handling
  };
};
```

**MyProfileView Analysis:**
- Lines 1-810: No photo upload UI component exists
- No file input for profile photos
- No photo management interface (reorder, delete, set primary)
- Camera icon imported but only used for verification badge display

**Database Schema Exists:** (`supabase/migrations/20260209_init.sql`, lines 50-60)
```sql
CREATE TABLE IF NOT EXISTS profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    performance_score INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Gap:** Database table exists but NO corresponding:
- Storage bucket for profile photos
- Upload service function
- UI component for photo management
- Photo retrieval service

**SLO Impact:** HIGH - Cannot upload photos = cannot create functional profiles

---

### 2. Image Optimization

#### Finding: CRITICAL - No Client-Side Image Processing

**Evidence Search Results:** No occurrences of:
- `canvas` or image resizing
- `compress` or compression libraries
- `resize` operations
- `webp` conversion
- `srcset` or responsive images

**Current Image Sources:** (`constants.ts`, lines 136-143, 251-483)
```typescript
// External URLs without optimization
'https://picsum.photos/id/338/800/1200'
'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80'
```

**Analysis:**
- Images served at fixed 800x1200 resolution
- No device-aware sizing (mobile vs desktop)
- No quality adaptation based on network
- Unsplash URLs use `auto=format&fit=crop&q=80` but this is 3rd party, not app-controlled

**SLO Impact:** HIGH - Large unoptimized images will exceed p95 < 1.5s on slower connections

---

### 3. Caching Strategy

#### Finding: NOT IMPLEMENTED - No Image Caching Layer

**Evidence:**
```typescript
// components/ProfileCard.tsx - Line 77
style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}

// components/StoryViewer.tsx - Lines 127-131
<img
    src={currentStory.imageUrl}
    alt="Story"
    className="w-full h-full object-cover"
/>
```

**Missing Implementation:**
- No Service Worker for image caching
- No IndexedDB image storage
- No HTTP cache headers configuration for Supabase Storage
- No preloading of next profile images
- No image preconnect/prefetch hints

**Browser Native Caching:**
- Relies entirely on browser's HTTP cache
- No control over cache duration
- No cache invalidation strategy

**SLO Impact:** MEDIUM - Repeated image loads without caching increases latency

---

### 4. Progressive/Lazy Loading

#### Finding: NOT IMPLEMENTED - No Progressive Image Loading

**Evidence Review:**

**ProfileCard.tsx (Line 76-78):**
```typescript
<div
  className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out"
  style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
>
```
- Uses CSS `background-image` - no native lazy loading
- No placeholder/skeleton while loading
- No blur-up technique

**ProfileDetailView.tsx (Lines 130-136):**
```typescript
{profile.images.map((img, idx) => (
    <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
        <img
            src={img}
            className="w-full h-full object-cover"
            alt={`${profile.name} - photo ${idx + 1}`}
        />
```
- No `loading="lazy"` attribute
- All images load immediately
- No IntersectionObserver for viewport-based loading

**MessageBubble.tsx (Lines 73-77):**
```typescript
<img
    src={msg.imageUrl}
    alt="Shared"
    className="w-full h-auto max-w-[240px] max-h-[300px] object-cover"
/>
```
- Chat images load without lazy loading
- No placeholder during load

**SLO Impact:** MEDIUM - All images loading simultaneously degrades initial page performance

---

### 5. Signed URL Handling

#### Finding: PARTIAL - Only Verification Documents Have Signed URLs

**Verification Documents:** (`services/verificationService.ts`, lines 123-150)
```typescript
export const uploadVerificationDocument = async (
  file: File,
): Promise<{ documentPath: string | null; error: Error | null }> => {
  // ... proper implementation with auth check
  const { error } = await supabase.storage
    .from(VERIFICATION_DOC_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
```

**Profile Photos:** NO implementation found
- No `profile-photos` bucket creation in migrations
- No signed URL generation for profile images
- No URL refresh mechanism for expired signed URLs

**Storage Buckets in Migrations:**
```sql
-- Only verification-documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
```

**SLO Impact:** MEDIUM - Missing infrastructure for secure profile photo URLs

---

### 6. Photo Validation

#### Finding: PARTIAL - Only Document Validation Exists

**Verification Documents:** (`services/verificationService.ts`, lines 10-16, 131-136)
```typescript
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
  return { documentPath: null, error: new Error('Unsupported document format') };
}
if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
  return { documentPath: null, error: new Error('Document is larger than 10 MB') };
}
```

**Registration Flow:** (`components/RegistrationFlow.tsx`, lines 25-31, 800-821)
```typescript
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

// File validation for documents only
```

**Profile Photos:** NO validation exists
- No aspect ratio enforcement
- No dimension validation
- No NSFW detection
- No duplicate detection
- No face detection for primary photo

**SLO Impact:** HIGH - Invalid images could cause rendering issues

---

### 7. Multiple Photo Handling

#### Finding: MOCK ONLY - No Real Implementation

**Type Definition:** (`types.ts`, lines 241-242)
```typescript
images: string[];
photoMetadata?: PhotoMetadata[]; // Detailed stats for photos
```

**PhotoMetadata Interface:** (`types.ts`, lines 190-197)
```typescript
export interface PhotoMetadata {
  id: string;
  url: string;
  performanceScore: number; // 0-100 score relative to others
  likeRateDifference: number; // e.g., +34 or -10 (percentage)
  isBlurry: boolean;
  isBest: boolean;
}
```

**Current Usage:** (`constants.ts`, lines 526-535)
```typescript
// Only mock data - no real implementation
photoMetadata: [
  { id: 'img1', url: '...', performanceScore: 65, likeRateDifference: -5, isBlurry: false, isBest: false },
  { id: 'img2', url: '...', performanceScore: 98, likeRateDifference: 34, isBlurry: false, isBest: true },
  { id: 'img3', url: '...', performanceScore: 20, likeRateDifference: -40, isBlurry: true, isBest: false }
]
```

**Missing Features:**
- Photo reordering UI
- Smart Photo (performance-based auto-ordering)
- Photo deletion
- Primary photo selection
- Photo limit enforcement (typically 6-9 photos)

**SLO Impact:** HIGH - Core dating app feature missing

---

### 8. Error Handling for Uploads

#### Finding: PARTIAL - Only Verification Document Errors Handled

**Verification Service:** (`services/verificationService.ts`, lines 145-150)
```typescript
if (error) {
  return { documentPath: null, error: error as unknown as Error };
}
return { documentPath: path, error: null };
```

**App.tsx Error Handling:** (lines 382-388)
```typescript
const uploadResult = await uploadVerificationDocument(
    verification.documentFile,
);
if (uploadResult.error || !uploadResult.documentPath) {
    showToast(uploadResult.error?.message || 'Verification document upload failed.');
    return;
}
```

**Missing Error Scenarios:**
- Network failure during upload (no retry logic)
- Partial upload recovery
- Storage quota exceeded
- Invalid image format after upload
- Image processing failure
- Rate limiting

**SLO Impact:** MEDIUM - Poor error handling leads to user frustration and abandonment

---

## Storage Infrastructure Analysis

### Current State

| Bucket | Exists | Public | RLS Policies |
|--------|--------|--------|--------------|
| verification-documents | YES | NO | YES (owner-only) |
| profile-photos | NO | N/A | N/A |
| chat-media | NO | N/A | N/A |
| story-media | NO | N/A | N/A |

### Required Buckets

```sql
-- profile-photos bucket (needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true);  -- Public for CDN

-- chat-media bucket (needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false);  -- Private, signed URLs

-- story-media bucket (needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-media', 'story-media', false);  -- Private, TTL 24h
```

---

## SLO-10 Impact Assessment

### Current State vs Target

| Metric | Target | Current Estimate | Gap |
|--------|--------|------------------|-----|
| Image Load p50 | < 500ms | 800-1200ms | HIGH |
| Image Load p95 | < 1.5s | 2-4s | CRITICAL |
| Image Upload p95 | < 3s | N/A (not implemented) | CRITICAL |
| Time to Interactive | < 3s | 4-6s (all images blocking) | HIGH |

### Root Causes for SLO Violations

1. **No image optimization** - Full resolution images (800x1200) served to all devices
2. **No lazy loading** - All images load simultaneously on page render
3. **No caching** - Browser-only caching with no control
4. **No CDN** - Direct Supabase Storage (if implemented) vs CDN edge delivery
5. **No progressive loading** - Full image or nothing, no blur-up/LQIP

---

## Required Implementations (Priority Order)

### P0 - Blocking Launch

1. **Profile Photo Upload Service**
   ```typescript
   // services/photoService.ts
   export const uploadProfilePhoto = async (file: File, orderIndex: number)
   export const deleteProfilePhoto = async (photoId: string)
   export const reorderPhotos = async (photoIds: string[])
   export const setPrimaryPhoto = async (photoId: string)
   ```

2. **Storage Bucket Creation**
   ```sql
   -- New migration: 20260218_profile_photos_storage.sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('profile-photos', 'profile-photos', true);

   -- RLS policies for profile photos
   ```

3. **Photo Upload UI Component**
   - Add to MyProfileView.tsx
   - Drag-and-drop reordering
   - Delete confirmation
   - Max 6 photos limit

### P1 - Critical for Performance

4. **Image Optimization Pipeline**
   - Client-side resize before upload (max 1200px width)
   - WebP conversion where supported
   - Quality reduction (80% for standard, 60% for thumbnails)

5. **Lazy Loading Implementation**
   - Add `loading="lazy"` to all `<img>` tags
   - Implement IntersectionObserver for background images
   - Preload next profile in swipe stack

6. **Progressive Loading**
   - Generate blur hash/LQIP on upload
   - Display placeholder during load
   - Fade-in on load complete

### P2 - Performance Optimization

7. **Caching Strategy**
   - Service Worker for offline image cache
   - Configure Supabase Storage cache headers
   - Implement stale-while-revalidate

8. **CDN Integration**
   - Supabase CDN or Cloudflare
   - Edge caching for public profile photos
   - Image transformation at edge

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Photo Upload Flow                        │
├─────────────────────────────────────────────────────────────┤
│  1. User selects photo                                      │
│  2. Client-side validation (size, type, dimensions)         │
│  3. Client-side optimization (resize, compress, WebP)       │
│  4. Generate blur hash for progressive loading              │
│  5. Upload to Supabase Storage (profile-photos bucket)      │
│  6. Save metadata to profile_photos table                   │
│  7. Return optimized URL + blur hash                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Photo Display Flow                       │
├─────────────────────────────────────────────────────────────┤
│  1. Display blur hash placeholder immediately               │
│  2. Lazy load actual image when in/near viewport            │
│  3. Serve from CDN edge cache                               │
│  4. Fade-in on load complete                                │
│  5. Cache in Service Worker for offline                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Coverage Analysis

| Test Category | Status |
|---------------|--------|
| Photo upload unit tests | NOT EXISTS |
| Image optimization tests | NOT EXISTS |
| Lazy loading integration tests | NOT EXISTS |
| Cache behavior tests | NOT EXISTS |
| Error scenario tests | NOT EXISTS |

---

## Summary

The photo and media system represents the **most significant gap** in the Vitalis codebase. A dating app fundamentally depends on profile photos, yet:

1. **No upload mechanism exists** - Users cannot add their own photos
2. **No optimization exists** - Images will be slow on mobile networks
3. **No lazy loading exists** - Initial page load will be degraded
4. **Mock data only** - All images are external placeholder URLs

### Recommended Action

**LAUNCH BLOCKER** - Profile photo upload must be implemented before any public release. This is core functionality for a dating application.

**Estimated Implementation Time:**
- P0 (Upload flow): 2-3 days
- P1 (Optimization): 2-3 days
- P2 (CDN/Caching): 1-2 days

---

*Report generated by Agent 6: Photo & Media Specialist*
*Date: 2026-02-17*
