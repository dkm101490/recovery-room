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

// 인증이 완전히 끝난 뒤에만 콜백을 실행합니다.
// (인증 전에 db.ref(...).on('value') 리스너를 걸면 permission_denied로
//  리스너 자체가 영구적으로 취소되어, 나중에 인증이 끝나도 다시 살아나지 않습니다.)
function onFirebaseReady(callback) {
  if (firebase.auth().currentUser) { callback(); return; }
  const unsubscribe = firebase.auth().onAuthStateChanged(user => {
    if (user) { unsubscribe(); callback(); }
  });
}
