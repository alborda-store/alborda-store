// ملف تهيئة Firebase
// هذا الملف يحتوي على إعدادات Firebase لمشروع alborda-store

const firebaseConfig = {
  apiKey: "AIzaSyB9QG_B3dipZvI5fMHiNyhuU_cckdzDEjo", // مفتاح API الخاص بك
  authDomain: "alborda-store.firebaseapp.com", // نطاق المصادقة
  projectId: "alborda-store", // معرف المشروع
  storageBucket: "alborda-store.appspot.com", // مستودع التخزين - تم التعديل ليتوافق مع الصيغة الشائعة
  messagingSenderId: "130960898492", // معرف مرسل الرسائل
  appId: "1:130960898492:web:8e0dcc81d25b6cbc9093b9", // معرف التطبيق
  measurementId: "G-1HFT9DWWJR" // معرف القياس (اختياري)
};

// تهيئة Firebase
// التأكد من عدم إعادة التهيئة إذا تم استدعاء الملف أكثر من مرة
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully with provided config.");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    // يمكنك إضافة معالجة خطأ أكثر تفصيلاً هنا إذا لزم الأمر
  }
} else {
  firebase.app(); // إذا تم تهيئته بالفعل، احصل على التطبيق الافتراضي
  console.log("Firebase already initialized.");
}

// ملاحظة هامة: تأكد من أنك أضفت مكتبات Firebase المطلوبة في ملفات HTML.
// تأكد من استخدام نفس إصدارات SDK المتوافقة (v9 compat في الكود الأصلي)
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-storage-compat.js"></script>

