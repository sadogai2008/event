// ==========================================
// Firebase Configuration
// ==========================================

// Firebase設定情報
const firebaseConfig = {
    apiKey: "AIzaSyDegjlrA3f0YaKD7-sdtHfwvfgb3NE17u4",
    authDomain: "event-scheduler-401cb.firebaseapp.com",
    projectId: "event-scheduler-401cb",
    storageBucket: "event-scheduler-401cb.firebasestorage.app",
    messagingSenderId: "581638129742",
    appId: "1:581638129742:web:99e65adcbf1306339b9b1f",
    measurementId: "G-JSNV1YN60Q"
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
