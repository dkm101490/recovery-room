const firebaseConfig = {
  apiKey: "AIzaSyDr8vJa2LecT6I5IB2LGLcPkPihJIsSsyM",
  authDomain: "recovery-room-b64e0.firebaseapp.com",
  databaseURL: "https://recovery-room-b64e0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "recovery-room-b64e0",
  storageBucket: "recovery-room-b64e0.firebasestorage.app",
  messagingSenderId: "238238193044",
  appId: "1:238238193044:web:fb53605178b51a7f6deb81"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 보안 규칙이 인증된 사용자만 read/write 하도록 강화되어 있어서,
// 화면단에는 별도 로그인 UI 없이 백그라운드에서 익명 인증으로 자동 로그인합니다.
firebase.auth().signInAnonymously().catch(err => {
  console.error('Firebase 익명 인증 실패:', err);
});
