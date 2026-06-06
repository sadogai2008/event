// ==========================================
// Firebase Configuration
// ==========================================

// Firebase設定情報
// Firebase Consoleから以下の情報を取得してください
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ==========================================
// Firebase初期化
// ==========================================

firebase.initializeApp(firebaseConfig);

// Firestore参照
const db = firebase.firestore();

// ==========================================
// Firestore設定
// ==========================================

// オフラインサポート
db.enablePersistence({
    synchronizeTabs: true
}).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('複数のタブでオフラインサポートが有効です');
    } else if (err.code == 'unimplemented') {
        console.warn('ブラウザがオフラインサポートに対応していません');
    }
});

console.log('Firebase initialized successfully');
