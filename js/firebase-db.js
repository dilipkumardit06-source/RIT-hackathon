/**
 * OPTIGOAL ENGINE - Firebase Firestore Database Layer
 * Project: optigoal-engine-4905b
 * 
 * Provides unified, offline-first Cloud Database persistence for:
 * 1. User Authentication Profiles (metadata, roles, login history)
 * 2. Financial Profiles (income, fixed expenses, investments, reserve, currency, risk tolerance)
 * 3. Strategic Goals Ledger (real-time synchronized initiatives)
 * 4. AI Strategic Advisory Sessions & Audit History
 */

(function (window) {
  'use strict';

  // Global namespace
  const OptigoalDB = {
    db: null,
    isInitialized: false,
    persistenceEnabled: false,
    activeSubscription: null,
    connectionState: 'initializing', // 'synced' | 'syncing' | 'offline' | 'needs_setup' | 'error'
    statusListeners: [],

    /**
     * Initializes Firebase and Cloud Firestore with offline cache
     */
    init: function () {
      if (this.isInitialized && this.db) return this.db;

      try {
        if (typeof firebase === 'undefined') {
          console.warn('[OptigoalDB] Firebase SDK not loaded.');
          this.setConnectionState('error', 'Firebase SDK Missing');
          return null;
        }

        const config = window.firebaseConfig;
        if (!config || !config.apiKey) {
          console.warn('[OptigoalDB] firebaseConfig missing or invalid.');
          this.setConnectionState('error', 'Config Missing');
          return null;
        }

        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }

        if (typeof firebase.firestore !== 'function') {
          console.warn('[OptigoalDB] Firestore SDK not available.');
          this.setConnectionState('error', 'Firestore SDK Missing');
          return null;
        }

        this.db = firebase.firestore();

        // Enable offline persistence (cache data locally in IndexedDB)
        if (!this.persistenceEnabled && this.db.enablePersistence) {
          this.db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
              this.persistenceEnabled = true;
              console.log('[OptigoalDB] Offline persistence enabled.');
            })
            .catch((err) => {
              if (err.code === 'failed-precondition') {
                console.info('[OptigoalDB] Multiple tabs open, persistence enabled in first tab.');
              } else if (err.code === 'unimplemented') {
                console.info('[OptigoalDB] Browser does not support Firestore offline persistence.');
              } else {
                console.warn('[OptigoalDB] Persistence error:', err);
              }
            });
        }

        this.isInitialized = true;
        this.setConnectionState('synced', 'Cloud Database Active');
        console.log('[OptigoalDB] Initialized successfully for project:', config.projectId);
        return this.db;
      } catch (err) {
        console.warn('[OptigoalDB] Initialization caught error:', err);
        this.setConnectionState('error', 'Database Error');
        return null;
      }
    },

    /**
     * Registers a listener for connection status changes
     */
    onStatusChange: function (callback) {
      if (typeof callback === 'function') {
        this.statusListeners.push(callback);
        callback(this.connectionState);
      }
    },

    /**
     * Updates and broadcasts connection state
     */
    setConnectionState: function (state, message) {
      this.connectionState = state;
      this.statusListeners.forEach((fn) => {
        try {
          fn(state, message);
        } catch (e) {}
      });
    },

    /**
     * Resolves the current active user ID
     */
    getUserId: function () {
      try {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
          return firebase.auth().currentUser.uid;
        }
        const cached = JSON.parse(localStorage.getItem('optigoal_user') || '{}');
        if (cached && cached.uid) return cached.uid;
        if (cached && cached.email) return 'user_' + cached.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      } catch (e) {}
      return 'guest_user';
    },

    /**
     * Generates a unique local cache key
     */
    getCacheKey: function (prefix) {
      const uid = this.getUserId();
      return `optigoal_${prefix}_${uid}`;
    },

    // =========================================================================
    // 1. USER AUTH & ACCOUNT METADATA
    // =========================================================================

    /**
     * Saves or updates the user profile record in Firestore
     */
    syncUserAccount: async function (userData) {
      const db = this.init();
      const uid = userData.uid || this.getUserId();
      if (!db || !uid || uid === 'guest_user') return false;

      this.setConnectionState('syncing', 'Saving User Profile...');
      try {
        const userDocRef = db.collection('users').doc(uid);
        const payload = {
          displayName: userData.displayName || 'Optigoal Member',
          email: userData.email || '',
          photoURL: userData.photoURL || null,
          provider: userData.provider || 'email',
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          role: userData.role || 'Admin Account'
        };

        await userDocRef.set({ account: payload }, { merge: true });
        this.setConnectionState('synced', 'Cloud Synced');
        console.log('[OptigoalDB] User account synced to Firestore:', uid);
        return true;
      } catch (err) {
        this.handleFirestoreError(err, 'syncUserAccount');
        return false;
      }
    },

    // =========================================================================
    // 2. FINANCIAL PROFILE PERSISTENCE
    // =========================================================================

    /**
     * Saves user financial profile (income, expenses, investments, reserve, currency, risk)
     */
    saveFinancialProfile: async function (profile) {
      // 1. Always write to fast local cache first
      try {
        localStorage.setItem(this.getCacheKey('profile'), JSON.stringify(profile));
      } catch (e) {}

      // 2. Sync to Cloud Firestore
      const db = this.init();
      const uid = this.getUserId();
      if (!db || !uid || uid === 'guest_user') return false;

      this.setConnectionState('syncing', 'Saving Financial Profile...');
      try {
        await db.collection('users').doc(uid).set({
          financialProfile: {
            income: Number(profile.income) || 0,
            expenses: Number(profile.expenses) || 0,
            investments: Number(profile.investments) || 0,
            reserve: Number(profile.reserve) || 0,
            currency: profile.currency || '₹',
            riskTolerance: profile.riskTolerance || 'balanced',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }
        }, { merge: true });

        this.setConnectionState('synced', 'Cloud Synced');
        console.log('[OptigoalDB] Financial profile saved to Firestore.');
        return true;
      } catch (err) {
        this.handleFirestoreError(err, 'saveFinancialProfile');
        return false;
      }
    },

    /**
     * Loads financial profile (returns cached immediately, then syncs from Firestore)
     */
    loadFinancialProfile: async function () {
      const defaultProfile = {
        income: 0,
        expenses: 0,
        investments: 0,
        reserve: 0,
        currency: '₹',
        riskTolerance: 'balanced'
      };

      // 1. Read local cache
      let profile = defaultProfile;
      try {
        const raw = localStorage.getItem(this.getCacheKey('profile'));
        if (raw) profile = JSON.parse(raw);
      } catch (e) {}

      // 2. Attempt Cloud fetch if online
      const db = this.init();
      const uid = this.getUserId();
      if (db && uid && uid !== 'guest_user') {
        try {
          const doc = await db.collection('users').doc(uid).get();
          if (doc.exists) {
            const data = doc.data();
            if (data && (data.financialProfile || data.profile)) {
              const cloudProfile = data.financialProfile || data.profile;
              profile = { ...defaultProfile, ...cloudProfile };
              localStorage.setItem(this.getCacheKey('profile'), JSON.stringify(profile));
              this.setConnectionState('synced', 'Cloud Synced');
            }
          }
        } catch (err) {
          this.handleFirestoreError(err, 'loadFinancialProfile');
        }
      }

      return profile;
    },

    // =========================================================================
    // 3. STRATEGIC GOALS PERSISTENCE
    // =========================================================================

    /**
     * Saves user goals to Cloud Firestore and local cache
     */
    saveGoals: async function (goals) {
      // 1. Write to local cache
      try {
        localStorage.setItem(this.getCacheKey('goals'), JSON.stringify(goals));
      } catch (e) {}

      // 2. Sync to Cloud Firestore
      const db = this.init();
      const uid = this.getUserId();
      if (!db || !uid || uid === 'guest_user') return false;

      this.setConnectionState('syncing', 'Saving Goals to Cloud...');
      try {
        await db.collection('users').doc(uid).set({
          goals: goals,
          goalsCount: goals.length,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        this.setConnectionState('synced', 'Cloud Synced');
        console.log('[OptigoalDB] Goals synced to Firestore:', goals.length);
        return true;
      } catch (err) {
        this.handleFirestoreError(err, 'saveGoals');
        return false;
      }
    },

    /**
     * Loads goals (returns cached immediately, then syncs from Firestore)
     */
    loadGoals: async function () {
      let goals = [];
      try {
        const raw = localStorage.getItem(this.getCacheKey('goals'));
        if (raw) goals = JSON.parse(raw) || [];
      } catch (e) {}

      const db = this.init();
      const uid = this.getUserId();
      if (db && uid && uid !== 'guest_user') {
        try {
          const doc = await db.collection('users').doc(uid).get();
          if (doc.exists) {
            const data = doc.data();
            if (data && Array.isArray(data.goals)) {
              goals = data.goals;
              localStorage.setItem(this.getCacheKey('goals'), JSON.stringify(goals));
              this.setConnectionState('synced', 'Cloud Synced');
            }
          }
        } catch (err) {
          this.handleFirestoreError(err, 'loadGoals');
        }
      }

      return goals;
    },

    // =========================================================================
    // 4. AI ADVISORY SESSION AUDITS LOGGING
    // =========================================================================

    /**
     * Logs an AI Advisor audit session to Firestore for history tracking
     */
    saveAdvisoryAudit: async function (auditRecord) {
      const db = this.init();
      const uid = this.getUserId();
      if (!db || !uid || uid === 'guest_user') return false;

      try {
        const auditData = {
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          prompt: auditRecord.prompt || 'Strategic Audit',
          model: auditRecord.model || 'openrouter/gpt-4o-mini',
          provider: auditRecord.provider || 'OpenRouter AI',
          feasibility: auditRecord.metrics ? auditRecord.metrics.feasibility : 'UNKNOWN',
          netDisposable: auditRecord.metrics ? auditRecord.metrics.net_disposable : 0,
          totalDemand: auditRecord.metrics ? auditRecord.metrics.total_goal_demand : 0,
          surplusDeficit: auditRecord.metrics ? auditRecord.metrics.surplus_deficit : 0,
          adviceSnippet: (auditRecord.advice || '').substring(0, 500)
        };

        // Save into subcollection: users/{uid}/audits
        await db.collection('users').doc(uid).collection('audits').add(auditData);
        console.log('[OptigoalDB] Advisory audit logged to Firestore.');
        return true;
      } catch (err) {
        console.warn('[OptigoalDB] Advisory audit log warning:', err.message);
        return false;
      }
    },

    // =========================================================================
    // 5. REAL-TIME MULTI-DEVICE SYNCHRONIZATION
    // =========================================================================

    /**
     * Subscribes to real-time changes on the user document
     */
    subscribeToUserData: function (onDataChange) {
      const db = this.init();
      const uid = this.getUserId();

      if (this.activeSubscription) {
        this.activeSubscription();
        this.activeSubscription = null;
      }

      if (!db || !uid || uid === 'guest_user') {
        this.setConnectionState('offline', 'Local Mode');
        return () => {};
      }

      this.setConnectionState('syncing', 'Connecting to Cloud...');

      const unsubscribe = db.collection('users').doc(uid).onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() || {};
            this.setConnectionState('synced', 'Cloud Synced');
            if (typeof onDataChange === 'function') {
              onDataChange(data);
            }
          } else {
            this.setConnectionState('synced', 'Ready to Sync');
          }
        },
        (error) => {
          this.handleFirestoreError(error, 'subscribeToUserData');
        }
      );

      this.activeSubscription = unsubscribe;
      return unsubscribe;
    },

    // =========================================================================
    // 6. ERROR HANDLING & DIAGNOSTICS
    // =========================================================================

    handleFirestoreError: function (err, context) {
      console.warn(`[OptigoalDB] ${context} error:`, err.code, err.message);

      if (err.code === 'permission-denied' || (err.message && err.message.includes('has not been used in project'))) {
        this.setConnectionState('needs_setup', 'Firestore Activation Required');
      } else if (err.code === 'unavailable' || err.code === 'network-request-failed') {
        this.setConnectionState('offline', 'Offline Mode (Local Cache Active)');
      } else {
        this.setConnectionState('offline', 'Local Cache Active');
      }
    }
  };

  // Expose to window
  window.OptigoalDB = OptigoalDB;

  // Auto-initialize when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => OptigoalDB.init());
    } else {
      OptigoalDB.init();
    }
  }

})(typeof window !== 'undefined' ? window : this);
