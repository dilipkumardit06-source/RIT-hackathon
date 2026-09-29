// OPTIGOAL ENGINE - Core Application Scripts
// Professional Firebase + Demo Mode Auth System

// ================= CONFIG =================
const CONFIG = {
    firebase: (typeof window !== 'undefined' && window.firebaseConfig) ? window.firebaseConfig : {
        apiKey: "AIzaSyBxoQ2LKBHaVu89pTRIgdk3OQrGWb5lumE",
        authDomain: "optigoal-engine-4905b.firebaseapp.com",
        projectId: "optigoal-engine-4905b",
        storageBucket: "optigoal-engine-4905b.firebasestorage.app",
        messagingSenderId: "971392607834",
        appId: "1:971392607834:web:bb154e752c4d81808e5a63"
    },
    demo: {
        users: {
            "demo@optigoal.com": { password: "demo1234", name: "Demo User", email: "demo@optigoal.com" }
        }
    }
};

// ================= STATE =================
let currentUser = null;
let firebaseInitialized = false;

// Auto-restore session on page load
try {
    const savedSession = localStorage.getItem('optigoal_user');
    if (savedSession) {
        currentUser = JSON.parse(savedSession);
    }
} catch (e) {
    currentUser = null;
}

// Helper: Check if real Firebase credentials are configured
function isRealFirebaseConfig(cfg) {
    if (!cfg || !cfg.apiKey) return false;
    const k = cfg.apiKey;
    return !k.includes('Dummy') && !k.includes('Replace') && !k.includes('YOUR_API_KEY') && k.startsWith('AIzaSy');
}

// ================= FIREBASE AUTH INITIALIZATION =================
let fbInstance = null;

function getFirebaseInstance() {
    if (fbInstance) return fbInstance;
    try {
        const config = (typeof window !== 'undefined' && window.firebaseConfig) ? window.firebaseConfig : CONFIG.firebase;
        
        if (typeof firebase === 'undefined') {
            return null;
        }

        if (!isRealFirebaseConfig(config)) {
            return null;
        }

        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(config);
        }

        const auth = firebase.auth();

        if (!firebaseInitialized) {
            firebaseInitialized = true;
            
            // Check for redirect result when returning from redirect auth
            auth.getRedirectResult().then((result) => {
                if (result && result.user) {
                    const user = result.user;
                    saveUserSession({
                        displayName: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        photoURL: user.photoURL,
                        uid: user.uid,
                        provider: user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'firebase'
                    });
                    showNotification(`Welcome ${user.displayName || 'back'}! Signed in.`, 'success');
                    redirectToDashboard();
                }
            }).catch((err) => {
                console.error('Redirect authentication error:', err);
            });

            auth.onAuthStateChanged((user) => {
                if (user) {
                    saveUserSession({
                        displayName: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        photoURL: user.photoURL,
                        uid: user.uid,
                        provider: user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'firebase'
                    });
                }
            });
        }

        const googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });

        let db = null;
        if (typeof firebase.firestore === 'function') {
            try {
                db = firebase.firestore();
            } catch (fsErr) {
                console.warn('Firestore initialization warning:', fsErr);
            }
        }

        fbInstance = { auth, googleProvider, db };
        return fbInstance;
    } catch (error) {
        console.warn('Firebase initialization error, using demo fallback:', error);
        return null;
    }
}

// Firestore instance accessor
function getFirestoreInstance() {
    try {
        if (typeof firebase !== 'undefined' && typeof firebase.firestore === 'function') {
            if (!firebase.apps || !firebase.apps.length) {
                const config = window.firebaseConfig;
                if (config) firebase.initializeApp(config);
            }
            return firebase.firestore();
        }
    } catch (e) {
        console.warn('Firestore instance error:', e);
    }
    return null;
}

// Save user financial profile to Firebase Cloud Firestore
async function saveUserProfileToCloud(uid, profile) {
    const db = getFirestoreInstance();
    if (!db || !uid) return false;
    try {
        await db.collection('users').doc(uid).set({
            profile: profile,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (e) {
        console.warn('Error saving profile to Firestore:', e);
        return false;
    }
}

// Save user strategic goals list to Firebase Cloud Firestore
async function saveGoalsToCloud(uid, goals) {
    const db = getFirestoreInstance();
    if (!db || !uid) return false;
    try {
        await db.collection('users').doc(uid).set({
            goals: goals,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (e) {
        console.warn('Error saving goals to Firestore:', e);
        return false;
    }
}

// Load all user data (profile & goals) from Firebase Cloud Firestore
async function loadUserDataFromCloud(uid) {
    const db = getFirestoreInstance();
    if (!db || !uid) return null;
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (e) {
        console.warn('Error loading data from Firestore:', e);
    }
    return null;
}

// Real-time listener for user data in Firebase Cloud Firestore
function subscribeToUserData(uid, onUpdate) {
    const db = getFirestoreInstance();
    if (!db || !uid) return () => {};
    try {
        return db.collection('users').doc(uid).onSnapshot((doc) => {
            if (doc.exists && typeof onUpdate === 'function') {
                onUpdate(doc.data());
            }
        }, (err) => {
            console.warn('Firestore subscription error:', err);
        });
    } catch (e) {
        console.warn('Firestore subscribe error:', e);
        return () => {};
    }
}

// Pre-initialize on load
async function initFirebase() {
    return getFirebaseInstance();
}

// Session persistence helper
function saveUserSession(user) {
    currentUser = user;
    try {
        localStorage.setItem('optigoal_user', JSON.stringify(user));
    } catch (e) {}
    if (window.OptigoalDB && typeof window.OptigoalDB.syncUserAccount === 'function') {
        window.OptigoalDB.syncUserAccount(user).catch(function(err) {
            console.warn('[script.js] Account cloud sync notice:', err);
        });
    }
    updateUIForAuth();
}

// ================= GOOGLE SIGN-IN =================
let isAuthInProgress = false;

async function signInWithGoogle() {
    if (isAuthInProgress) {
        console.warn('Sign-in already in progress, ignoring duplicate click.');
        return;
    }
    isAuthInProgress = true;

    const fb = getFirebaseInstance();

    if (!fb) {
        showLoading(true, 'Connecting demo mode...');
        await simulateAuth('Google', 'Alex Mercer', 'alex.mercer@gmail.com');
        isAuthInProgress = false;
        return;
    }

    showLoading(true, 'Connecting to Google...');

    try {
        console.log('Initiating Google Sign-In with Firebase...');
        const result = await fb.auth.signInWithPopup(fb.googleProvider);
        const user = result.user;
        
        saveUserSession({
            displayName: user.displayName || 'Google User',
            email: user.email,
            photoURL: user.photoURL,
            uid: user.uid,
            provider: 'google'
        });
        
        showLoading(true, 'Welcome! Loading your dashboard...');
        showNotification(`Welcome ${user.displayName || 'back'}! Signed in with Google.`, 'success');
        redirectToDashboard();
    } catch (error) {
        console.warn('Google Sign-In caught error:', error.code, error.message);

        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            showLoading(true, 'Opening Google Sign-In in this window...');
            showNotification('Popup blocked. Redirecting to Google account...', 'info');
            try {
                await fb.auth.signInWithRedirect(fb.googleProvider);
                return;
            } catch (redirectErr) {
                console.error('Redirect failed:', redirectErr);
                showNotification(redirectErr.message || 'Redirect failed', 'error');
            }
        } else if (error.code === 'auth/popup-closed-by-user') {
            showNotification('Google sign-in was cancelled.', 'info');
        } else if (error.code === 'auth/unauthorized-domain') {
            showNotification('Error: localhost is not authorized in Firebase Console.', 'error');
        } else {
            showNotification(error.message || 'Google sign-in failed. Please try again.', 'error');
        }
        showLoading(false);
    } finally {
        isAuthInProgress = false;
    }
}



// ================= DEMO AUTH SIMULATION =================
async function simulateAuth(provider, defaultName, defaultEmail) {
    await new Promise(resolve => setTimeout(resolve, 600));

    saveUserSession({
        email: defaultEmail || 'demo@optigoal.com',
        displayName: defaultName || 'Demo User',
        photoURL: null,
        provider: provider.toLowerCase()
    });

    showNotification(`Signed in with ${provider} (Demo Mode)`, 'success');
    redirectToDashboard();
}

// ================= LOCAL PERSISTENCE HELPERS =================
function saveLocalUser(email, password, name) {
    try {
        const registered = JSON.parse(localStorage.getItem('optigoal_registered_users') || '{}');
        registered[email.toLowerCase()] = {
            password: password,
            name: name || email.split('@')[0],
            email: email,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('optigoal_registered_users', JSON.stringify(registered));
    } catch (e) {
        console.warn('Could not save user locally:', e);
    }
}

function getLocalUser(email) {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    try {
        const registered = JSON.parse(localStorage.getItem('optigoal_registered_users') || '{}');
        if (registered[clean]) return registered[clean];
    } catch (e) {}
    if (CONFIG && CONFIG.demo && CONFIG.demo.users && CONFIG.demo.users[clean]) {
        return CONFIG.demo.users[clean];
    }
    return null;
}

// ================= EMAIL/PASSWORD AUTH =================
async function signUpWithEmail(email, password, name) {
    try {
        showLoading(true, 'Creating your account...');

        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address.');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters.');
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = (name || cleanEmail.split('@')[0]).trim();

        const fb = await initFirebase();

        if (fb) {
            try {
                // Real Firebase Email Sign Up
                const cred = await fb.auth.createUserWithEmailAndPassword(cleanEmail, password);
                if (cleanName && cred.user && cred.user.updateProfile) {
                    await cred.user.updateProfile({ displayName: cleanName });
                }
                saveUserSession({
                    displayName: cleanName,
                    email: cleanEmail,
                    photoURL: null,
                    uid: cred.user.uid,
                    provider: 'password'
                });
                showNotification('Account created successfully with Firebase!', 'success');
                redirectToDashboard();
                return;
            } catch (fbErr) {
                console.warn('Firebase createUser caught:', fbErr.code, fbErr.message);

                if (fbErr.code === 'auth/email-already-in-use') {
                    throw new Error('An account with this email already exists. Please switch to the "Log In" tab.');
                } else if (fbErr.code === 'auth/weak-password') {
                    throw new Error('Password is too weak. Please use at least 8 characters.');
                } else if (fbErr.code === 'auth/operation-not-allowed') {
                    console.info('Firebase Email/Password is disabled in Firebase Console. Using local session mode.');
                    // Seamless local registration so hackathon demo is NEVER blocked
                    saveLocalUser(cleanEmail, password, cleanName);
                    saveUserSession({
                        displayName: cleanName,
                        email: cleanEmail,
                        photoURL: null,
                        uid: 'local_' + Date.now(),
                        provider: 'password'
                    });
                    showNotification('Account created! (Firebase Email/Password is not enabled in Console; saved to local session). Loading...', 'success', 5000);
                    redirectToDashboard();
                    return;
                } else {
                    // Resilient fallback for other Firebase issues (network, etc.)
                    console.warn('Firebase sign up error, registering locally:', fbErr.message);
                    saveLocalUser(cleanEmail, password, cleanName);
                    saveUserSession({
                        displayName: cleanName,
                        email: cleanEmail,
                        photoURL: null,
                        uid: 'local_' + Date.now(),
                        provider: 'password'
                    });
                    showNotification('Account registered (Local Session). Loading dashboard...', 'success');
                    redirectToDashboard();
                    return;
                }
            }
        }

        // Demo Mode / No Firebase
        await new Promise(resolve => setTimeout(resolve, 400));
        saveLocalUser(cleanEmail, password, cleanName);
        saveUserSession({
            email: cleanEmail,
            displayName: cleanName,
            photoURL: null,
            uid: 'demo_' + Date.now(),
            provider: 'password'
        });

        showNotification('Account created successfully!', 'success');
        redirectToDashboard();
    } catch (error) {
        console.error('Sign Up Error:', error);
        showNotification(error.message || 'Failed to create account.', 'error');
        showLoading(false);
    }
}

async function signInWithEmail(email, password) {
    try {
        showLoading(true, 'Signing you in...');

        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address.');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters.');
        }

        const cleanEmail = email.trim().toLowerCase();

        const fb = await initFirebase();

        if (fb) {
            try {
                // Real Firebase Email Sign In
                const cred = await fb.auth.signInWithEmailAndPassword(cleanEmail, password);
                saveUserSession({
                    displayName: cred.user.displayName || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    photoURL: cred.user.photoURL,
                    uid: cred.user.uid,
                    provider: 'password'
                });
                showNotification('Welcome back! Signed in with Firebase.', 'success');
                redirectToDashboard();
                return;
            } catch (fbErr) {
                console.warn('Firebase signIn caught:', fbErr.code, fbErr.message);

                if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/invalid-login-credentials') {
                    throw new Error('Incorrect email or password. Please try again.');
                } else if (fbErr.code === 'auth/operation-not-allowed') {
                    console.info('Firebase Email/Password is disabled in Firebase Console. Checking local users...');
                    const localUser = getLocalUser(cleanEmail);
                    if (localUser) {
                        if (localUser.password !== password) {
                            throw new Error('Incorrect password. Please try again.');
                        }
                        saveUserSession({
                            email: cleanEmail,
                            displayName: localUser.name || cleanEmail.split('@')[0],
                            photoURL: null,
                            uid: 'local_' + Date.now(),
                            provider: 'password'
                        });
                        showNotification('Welcome back! Signed in successfully (Local Session).', 'success');
                        redirectToDashboard();
                        return;
                    } else {
                        throw new Error('No account found for this email. Please switch to the "Sign Up" tab first to create an account.');
                    }
                } else if (fbErr.code === 'auth/user-not-found') {
                    const localUser = getLocalUser(cleanEmail);
                    if (localUser) {
                        if (localUser.password !== password) {
                            throw new Error('Incorrect password. Please try again.');
                        }
                        saveUserSession({
                            email: cleanEmail,
                            displayName: localUser.name || cleanEmail.split('@')[0],
                            photoURL: null,
                            uid: 'local_' + Date.now(),
                            provider: 'password'
                        });
                        showNotification('Welcome back! Signed in successfully.', 'success');
                        redirectToDashboard();
                        return;
                    }
                    throw new Error('No account found for this email. Please switch to "Sign Up" tab to register.');
                } else {
                    const localUser = getLocalUser(cleanEmail);
                    if (localUser && localUser.password === password) {
                        saveUserSession({
                            email: cleanEmail,
                            displayName: localUser.name || cleanEmail.split('@')[0],
                            photoURL: null,
                            uid: 'local_' + Date.now(),
                            provider: 'password'
                        });
                        showNotification('Signed in successfully (Offline fallback).', 'success');
                        redirectToDashboard();
                        return;
                    }
                    throw fbErr;
                }
            }
        }

        // Demo / Local Mode Sign In
        await new Promise(resolve => setTimeout(resolve, 400));
        const user = getLocalUser(cleanEmail);

        if (!user) {
            throw new Error('No account found for this email. Please switch to "Sign Up" tab to register.');
        }

        if (user.password && user.password !== password) {
            throw new Error('Incorrect password. Please try again.');
        }

        const displayName = user.name || cleanEmail.split('@')[0];
        saveUserSession({
            email: cleanEmail,
            displayName: displayName,
            photoURL: null,
            uid: 'local_' + Date.now(),
            provider: 'password'
        });

        showNotification('Welcome back! Signed in successfully.', 'success');
        redirectToDashboard();
    } catch (error) {
        console.error('Sign In Error:', error);
        showNotification(error.message || 'Failed to sign in.', 'error');
        showLoading(false);
    }
}

// ================= LOGOUT =================
function signOut() {
    try {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.apps && firebase.apps.length) {
            firebase.auth().signOut().catch(() => {});
        }
    } catch (e) {}

    currentUser = null;
    try {
        localStorage.removeItem('optigoal_user');
    } catch (e) {}

    updateUIForAuth();
    showNotification('Signed out successfully.', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 400);
}

// ================= UI UPDATES =================
function updateUIForAuth() {
    const authButtons = document.querySelectorAll('[data-auth-action]');
    const userDisplay = document.getElementById('user-display');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');
    const userAvatarInitials = document.getElementById('user-avatar-initials');

    if (currentUser) {
        // User is logged in
        authButtons.forEach(btn => {
            if (btn.dataset.authAction === 'login') {
                btn.innerHTML = `
                    <span class="flex items-center gap-2">
                        <span>${currentUser.displayName || 'Workspace'}</span>
                        <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    </span>
                `;
                btn.href = 'dashboard.html';
            }
        });

        if (userDisplay) {
            userDisplay.textContent = currentUser.displayName || 'User';
        }

        if (userDisplayName) {
            userDisplayName.textContent = currentUser.displayName || 'Active Member';
        }

        if (userDisplayRole) {
            userDisplayRole.textContent = currentUser.email || 'Admin';
        }

        if (userAvatarInitials) {
            const name = currentUser.displayName || currentUser.email || 'JD';
            const parts = name.trim().split(' ');
            let initials = parts[0][0].toUpperCase();
            if (parts.length > 1) initials += parts[1][0].toUpperCase();
            userAvatarInitials.textContent = initials;
        }
    } else {
        // User is logged out
        authButtons.forEach(btn => {
            if (btn.dataset.authAction === 'login') {
                btn.innerHTML = 'Log In';
                btn.href = 'login.html';
            }
        });

        if (userDisplay) {
            userDisplay.textContent = '';
        }
    }
}

// ================= VALIDATION =================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return password && password.length >= 8;
}

// ================= LOADING STATE =================
function showLoading(show, message) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
            const msgEl = overlay.querySelector('p');
            if (msgEl && message) msgEl.textContent = message;
        } else {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }
}

// ================= NOTIFICATIONS =================
function showNotification(message, type = 'info', duration = 3500) {
    // Remove existing notifications
    const existing = document.querySelector('.auth-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `auth-notification fixed top-4 right-4 z-[9999] px-6 py-3.5 rounded-xl shadow-2xl text-sm font-semibold transform transition-all duration-300 translate-x-[120%] max-w-md`;

    const colors = {
        success: 'bg-emerald-500 text-white shadow-emerald-500/20',
        error: 'bg-red-500 text-white shadow-red-500/20',
        info: 'bg-brand-cyan text-white shadow-brand-cyan/20',
        warning: 'bg-amber-500 text-white shadow-amber-500/20'
    };

    notification.className += ` ${colors[type] || colors.info}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
    });

    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ================= NAVIGATION =================
function redirectToDashboard() {
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 500);
}

// ================= GLOBAL EVENT LISTENERS =================
document.addEventListener("DOMContentLoaded", () => {
    // Navigation button -> index.html
    const btnBackHome = document.getElementById("btn-back-home");
    if (btnBackHome) {
        btnBackHome.addEventListener("click", () => {
            window.location.href = "index.html";
        });
    }

    // Modal backdrop click to close
    const modalBackdrop = document.getElementById("modal-backdrop");
    if (modalBackdrop) {
        modalBackdrop.addEventListener("click", closeModal);
    }

    // Close modal button
    const btnCloseModal = document.getElementById("btn-close-modal");
    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", closeModal);
    }

    // Get Started Free button (header)
    const btnGetStarted = document.getElementById("btn-get-started");
    if (btnGetStarted) {
        btnGetStarted.addEventListener("click", openModal);
    }

    // Claim Savings button
    const btnClaim = document.getElementById("btn-claim-savings");
    if (btnClaim) {
        btnClaim.addEventListener("click", openModal);
    }

    // Open Dashboard button
    const btnOpenDashboard = document.getElementById("btn-open-dashboard");
    if (btnOpenDashboard) {
        btnOpenDashboard.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
    }

    // Pricing buttons
    const btnPricingStarter = document.getElementById("btn-pricing-starter");
    if (btnPricingStarter) {
        btnPricingStarter.addEventListener("click", openModal);
    }

    const btnPricingPro = document.getElementById("btn-pricing-pro");
    if (btnPricingPro) {
        btnPricingPro.addEventListener("click", openModal);
    }

    const btnPricingEnterprise = document.getElementById("btn-pricing-enterprise");
    if (btnPricingEnterprise) {
        btnPricingEnterprise.addEventListener("click", openModal);
    }

    // Hero buttons
    const btnHeroGetStarted = document.getElementById("hero-get-started");
    if (btnHeroGetStarted) {
        btnHeroGetStarted.addEventListener("click", openModal);
    }

    const btnHeroExplore = document.getElementById("hero-explore");
    if (btnHeroExplore) {
        btnHeroExplore.addEventListener("click", scrollToNextSection);
    }

    const btnScrollDashboard = document.getElementById("btn-scroll-to-dashboard");
    if (btnScrollDashboard) {
        btnScrollDashboard.addEventListener("click", scrollToNextSection);
    }

    // Video replay button
    const btnReplay = document.getElementById("btn-replay-video");
    if (btnReplay) {
        btnReplay.addEventListener("click", replayVideo);
    }

    // Skip to Dashboard button
    const btnSkipDashboard = document.getElementById("btn-skip-dashboard");
    if (btnSkipDashboard) {
        btnSkipDashboard.addEventListener("click", scrollToNextSection);
    }

    // OAuth button (Google)
    const oauthGoogle = document.getElementById("oauth-google");
    if (oauthGoogle) {
        oauthGoogle.addEventListener("click", signInWithGoogle);
    }

    // Login page tab buttons
    const tabSignup = document.getElementById("tab-signup");
    const tabLogin = document.getElementById("tab-login");
    if (tabSignup) {
        tabSignup.addEventListener("click", () => {
            "undefined" !== typeof switchAuthTab && switchAuthTab("signup");
        });
    }
    if (tabLogin) {
        tabLogin.addEventListener("click", () => {
            "undefined" !== typeof switchAuthTab && switchAuthTab("login");
        });
    }

    // Logout button
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", signOut);
    }

    // Initialize UI for current user
    updateUIForAuth();

    // Initialize Firebase
    initFirebase();
});

// ================= HERO VIDEO & AUTO-SCROLL LOGIC =================
function initHeroVideo() {
    const video = document.getElementById("hero-intro-video");
    let hasScrolled = false;

    if (!video) return;

    // Ensure video is muted for 100% reliable autoplay across all browsers
    video.muted = true;

    // Play video
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Autoplay was prevented by browser policy, user interaction required:", error);
        });
    }

    // When video completes playing, automatically transition to next section
    video.addEventListener("ended", () => {
        if (!hasScrolled) {
            hasScrolled = true;
            setTimeout(() => {
                scrollToNextSection();
            }, 500); // graceful pause on final logo frame
        }
    });

    // Fallback timer: in case browser blocks or pauses video, auto-scroll after 4s
    setTimeout(() => {
        // If user hasn't scrolled and video ended or reached near end
        if (!hasScrolled && video.currentTime > 2.0) {
            hasScrolled = true;
            scrollToNextSection();
        }
    }, 3800);
}

function replayVideo() {
    const video = document.getElementById("hero-intro-video");
    if (video) {
        video.currentTime = 0;
        video.play();
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
}

function scrollToNextSection() {
    const target = document.getElementById("dashboard");
    if (target) {
        const navHeight = 70;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({
            top: targetPos,
            behavior: "smooth"
        });
    }
}

// ================= NAVBAR SCROLL STYLING =================
function initNavbarScroll() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 30) {
            navbar.classList.add("shadow-md");
            navbar.style.background = "rgba(255, 255, 255, 0.92)";
        } else {
            navbar.classList.remove("shadow-md");
            navbar.style.background = "rgba(255, 255, 255, 0.75)";
        }
    });
}

// ================= LIVE OPTIMIZATION SIMULATOR (CHART.JS) =================
let growthChart = null;
let chartUpdateTimeout = null;

function initChart() {
    const ctx = document.getElementById("growthChart");
    if (!ctx) return;

    const revSlider = document.getElementById("revSlider");
    const growthSlider = document.getElementById("growthSlider");
    const timeSlider = document.getElementById("timeSlider");

    if (!revSlider || !growthSlider || !timeSlider) return;

    const updateChart = () => {
        const currentRev = parseInt(revSlider.value) || 100000;
        const growthRate = Math.max(0, Math.min(1, (parseInt(growthSlider.value) || 25) / 100));
        const months = Math.max(1, Math.min(36, parseInt(timeSlider.value) || 12));

        document.getElementById("revDisplay").textContent = `₹${currentRev.toLocaleString('en-IN')}`;
        document.getElementById("growthDisplay").textContent = `${growthSlider.value}%`;
        document.getElementById("timeDisplay").textContent = `${months} Months`;

        // Calculate projection arrays
        const labels = Array.from({ length: months + 1 }, (_, i) => `Month ${i}`);
        const baselineData = Array.from({ length: months + 1 }, () => currentRev);
        const projectedData = [currentRev];

        const monthlyRate = Math.pow(1 + growthRate, 1 / 12) - 1;
        let runningRev = currentRev;

        for (let i = 1; i <= months; i++) {
            runningRev = runningRev * (1 + monthlyRate);
            projectedData.push(Math.round(runningRev));
        }

        const totalArrIncrease = Math.round((projectedData[months] - currentRev) * 12);
        const kpiEl = document.getElementById("kpi-arr");
        if (kpiEl) kpiEl.textContent = `+₹${totalArrIncrease.toLocaleString('en-IN')}`;

        const chartCtx = ctx.getContext("2d");
        if (chartCtx) {
            if (growthChart) {
                growthChart.data.labels = labels;
                growthChart.data.datasets[0].data = projectedData;
                growthChart.data.datasets[1].data = baselineData;
                growthChart.update("none");
            } else {
                growthChart = new Chart(chartCtx, {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Optigoal AI Trajectory (₹)",
                                data: projectedData,
                                borderColor: "#00B4DB",
                                backgroundColor: "rgba(0, 180, 219, 0.12)",
                                borderWidth: 3,
                                fill: true,
                                tension: 0.35,
                                pointRadius: months > 24 ? 2 : 4,
                                pointBackgroundColor: "#0083B0",
                                pointHoverRadius: 6
                            },
                            {
                                label: "Baseline / Status Quo (₹)",
                                data: baselineData,
                                borderColor: "#D1D5DB",
                                borderWidth: 2,
                                borderDash: [6, 6],
                                fill: false,
                                tension: 0,
                                pointRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: "index",
                            intersect: false
                        },
                        plugins: {
                            legend: {
                                position: "top",
                                labels: {
                                    boxWidth: 12,
                                    font: {
                                        family: "'Plus Jakarta Sans', sans-serif",
                                        weight: "600",
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString('en-IN')}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                grid: {
                                    color: "rgba(0, 0, 0, 0.05)"
                                },
                                ticks: {
                                    callback: function (value) {
                                        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                                        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                                        if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                                        return `₹${value}`;
                                    },
                                    font: {
                                        family: "'Plus Jakarta Sans', sans-serif",
                                        size: 10
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    font: {
                                        family: "'Plus Jakarta Sans', sans-serif",
                                        size: 10
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    };

    const debouncedUpdate = () => {
        if (chartUpdateTimeout) clearTimeout(chartUpdateTimeout);
        chartUpdateTimeout = setTimeout(updateChart, 150);
    };

    revSlider.addEventListener("input", debouncedUpdate);
    growthSlider.addEventListener("input", debouncedUpdate);
    timeSlider.addEventListener("input", debouncedUpdate);

    updateChart();
}

// ================= INTERACTIVE ROI CALCULATOR =================
function initRoiCalculator() {
    const teamSlider = document.getElementById("roiTeamSlider");
    const goalsSlider = document.getElementById("roiGoalsSlider");

    if (!teamSlider || !goalsSlider) return;

    const calculateRoi = () => {
        const teamSize = parseInt(teamSlider.value);
        const goalsCount = parseInt(goalsSlider.value);

        document.getElementById("roiTeamVal").textContent = `${teamSize} Members`;
        document.getElementById("roiGoalsVal").textContent = `${goalsCount} Goals`;

        // Benchmark: 18 hours saved per team member monthly * ₹3,500/hr average loaded cost
        const monthlyHoursSaved = teamSize * 18;
        const annualValue = Math.round(monthlyHoursSaved * 12 * 350);

        document.getElementById("roiSavingsDisplay").textContent = `₹${annualValue.toLocaleString('en-IN')} / yr`;
    };

    teamSlider.addEventListener("input", calculateRoi);
    goalsSlider.addEventListener("input", calculateRoi);
    calculateRoi();
}

// ================= PRICING TOGGLE =================
function initPricing() {
    const toggle = document.getElementById("pricingToggle");
    const prices = document.querySelectorAll(".price-val");

    if (!toggle) return;

    toggle.addEventListener("change", (e) => {
        const isAnnual = e.target.checked;
        prices.forEach(el => {
            const val = isAnnual ? el.getAttribute("data-annual") : el.getAttribute("data-monthly");
            el.textContent = `₹${parseInt(val).toLocaleString('en-IN')}`;
        });
    });
}

// ================= ONBOARDING MODAL =================
function openModal() {
    const modal = document.getElementById("onboardingModal");
    if (!modal) return;

    // Reset views
    document.getElementById("modalForm").style.display = "block";
    document.getElementById("modalLoading").style.display = "none";
    document.getElementById("modalSuccess").style.display = "none";

    modal.classList.add("modal-open");
    setTimeout(() => {
        modal.classList.add("modal-show");
    }, 10);
}

function closeModal() {
    const modal = document.getElementById("onboardingModal");
    if (!modal) return;

    modal.classList.remove("modal-show");
    setTimeout(() => {
        modal.classList.remove("modal-open");
    }, 300);
}

function handleOnboarding(e) {
    e.preventDefault();

    const form = document.getElementById("modalForm");
    const loading = document.getElementById("modalLoading");
    const success = document.getElementById("modalSuccess");
    const loadingBar = document.getElementById("loadingBar");

    form.style.display = "none";
    loading.style.display = "flex";

    // Progress bar animation
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loading.style.display = "none";
                success.style.display = "flex";
            }, 300);
        } else {
            width += 5;
            loadingBar.style.width = width + "%";
        }
    }, 60);
}

// ================= INITIALIZE =================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase
    initFirebase().then(() => {
        initHeroVideo();
        initChart();
        initRoiCalculator();
        initPricing();
        initNavbarScroll();
    });

    // Logout handler for dashboard
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            if (currentUser) {
                const firebase = window.firebase?.auth();
                if (firebase) {
                    firebase.signOut().then(() => {
                        showNotification('Logged out successfully', 'info');
                        setTimeout(() => window.location.href = 'login.html', 1000);
                    }).catch(() => {
                        currentUser = null;
                        showNotification('Logged out successfully', 'info');
                        setTimeout(() => window.location.href = 'login.html', 1000);
                    });
                } else {
                    signOut();
                }
            } else {
                signOut();
            }
        });
    }
});