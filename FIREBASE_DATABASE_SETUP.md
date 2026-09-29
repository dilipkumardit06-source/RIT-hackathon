# 🔥 Firebase Firestore Database Setup Guide
**Project:** `optigoal-engine-4905b`  
**Platform:** Optigoal Engine - Financial & Goal Intelligence

This guide walks you through activating and configuring Cloud Firestore database for storing all user profiles, financial ledgers, strategic goals, and AI audit history.

---

## ⚡ 1. Activate Cloud Firestore in 30 Seconds

1. Go to the [Firebase Console](https://console.firebase.google.com/project/optigoal-engine-4905b/firestore).
2. Click **Create database** (or **Get started**).
3. **Database location**: Choose a region closest to you (e.g., `asia-south1` for Mumbai, or `us-central1`).
4. **Security rules**:
   - Choose **Start in test mode** for hackathon testing (allows immediate reads and writes), **OR**
   - Choose **Production mode** and paste the rules from `firestore.rules`.
5. Click **Create** / **Enable**. Firestore will provision in ~10 seconds.

---

## 🔒 2. Security Rules (`firestore.rules`)

In the Firebase Console under **Firestore Database** > **Rules** tab, paste the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Secure user documents: each user only reads & writes their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // All subcollections (such as AI audits)
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // For open hackathon demo mode testing:
    // match /{document=**} {
    //   allow read, write: if true;
    // }
  }
}
```
Click **Publish**.

---

## 📊 3. Database Schema Overview

Optigoal Engine structures user data in the `users` collection as follows:

```
users/ (Collection)
  └── {userId}/ (Document)
        ├── account: {
        │     displayName: "Alex Mercer",
        │     email: "alex@example.com",
        │     photoURL: "https://...",
        │     provider: "google" | "password",
        │     lastLoginAt: Timestamp,
        │     role: "Admin Account"
        │   }
        ├── financialProfile: {
        │     income: 120000,
        │     expenses: 45000,
        │     investments: 25000,
        │     reserve: 200000,
        │     currency: "₹",
        │     riskTolerance: "balanced",
        │     updatedAt: Timestamp
        │   }
        ├── goals: [
        │     {
        │       id: "goal_1710000000000",
        │       name: "House Down Payment",
        │       category: "Real Estate",
        │       priority: "High",
        │       amount: 1500000,
        │       months: 36,
        │       monthly_req: 41666.67,
        │       current: 200000,
        │       status: "Active"
        │     }
        │   ]
        └── audits/ (Subcollection)
              └── {auditId}: {
                    timestamp: Timestamp,
                    prompt: "Run strategic audit",
                    model: "openrouter/gpt-4o-mini",
                    provider: "OpenRouter AI",
                    feasibility: "FEASIBLE",
                    netDisposable: 50000,
                    surplusDeficit: 8333.33,
                    adviceSnippet: "..."
                  }
```

---

## 🚀 4. Offline-First & Real-Time Sync Features

- **Offline Persistence**: Optigoal Engine automatically enables Firestore IndexedDB offline persistence (`synchronizeTabs: true`). Even if you lose internet connectivity, all changes are saved locally and automatically sync back to Firebase when reconnected.
- **Multi-Device Live Sync**: When you update a goal or financial profile on one device or tab, Firestore's `onSnapshot` listener updates the dashboard everywhere in real time.
- **Fail-Safe Local Mode**: If Firestore is not yet activated in the Firebase console, the engine seamlessly saves to localStorage without interrupting the user experience.
