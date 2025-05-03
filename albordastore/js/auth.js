// ملف وظائف المصادقة (Authentication) باستخدام Firebase Auth

/**
 * مراقبة حالة تسجيل دخول المستخدم وتحديث واجهة المستخدم.
 * تستدعي updateUIBasedOnAuthState من ui.js.
 * @returns {function} دالة لإلغاء الاشتراك في مراقبة الحالة.
 */
function observeAuthState() {
    console.log("Observing auth state changes...");
    const auth = firebase.auth();

    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            // المستخدم مسجل الدخول
            console.log("User is logged in:", user.uid);
            updateUIBasedOnAuthState(user);
            // (اختياري) يمكنك جلب بيانات إضافية للمستخدم من Firestore هنا إذا لزم الأمر
            // getUserData(firebase.firestore(), user.uid).then(userData => { ... });
        } else {
            // المستخدم غير مسجل الدخول
            console.log("User is logged out.");
            updateUIBasedOnAuthState(null);
        }
    });

    // ربط حدث تسجيل الخروج بالأزرار المعنية (في الهيدر وصفحة الملف الشخصي)
    // يتم الربط هنا لضمان وجود دالة handleLogout في النطاق
    const logoutButtonNav = document.getElementById("nav-logout-button");
    const logoutButtonProfile = document.getElementById("logout-button-profile");
    const logoutButtonAdmin = document.getElementById("admin-logout-button"); // زر الخروج في لوحة الأدمن

    if (logoutButtonNav) {
        logoutButtonNav.addEventListener("click", handleLogout);
    }
    if (logoutButtonProfile) {
        logoutButtonProfile.addEventListener("click", handleLogout);
    }
    if (logoutButtonAdmin) {
        logoutButtonAdmin.addEventListener("click", handleLogout);
    }

    return unsubscribe; // إرجاع دالة إلغاء الاشتراك
}

/**
 * تسجيل خروج المستخدم الحالي.
 */
async function handleLogout() {
    console.log("Attempting to log out user...");
    const auth = firebase.auth();
    try {
        await auth.signOut();
        console.log("User logged out successfully.");
        // إعادة التوجيه إلى الصفحة الرئيسية أو صفحة تسجيل الدخول بعد الخروج
        // تأكد من أنك لست في صفحة تتطلب تسجيل الدخول
        if (window.location.pathname.includes("/admin/") || window.location.pathname.includes("profile.html") || window.location.pathname.includes("my-orders.html")) {
             window.location.href = "/index.html"; // أو /login.html
        } else {
            // إذا كنت في صفحة عامة، فقط قم بتحديث الواجهة (سيتم تلقائياً عبر onAuthStateChanged)
            // window.location.reload(); // يمكنك إعادة تحميل الصفحة إذا لزم الأمر
        }
    } catch (error) {
        console.error("Error logging out:", error);
        // عرض رسالة خطأ للمستخدم إذا لزم الأمر
        showUserMessage("logout-error-placeholder", "حدث خطأ أثناء تسجيل الخروج.", "error"); // افترض وجود عنصر لعرض الخطأ
    }
}

/**
 * التحقق مما إذا كان المستخدم الحالي هو أدمن.
 * يعتمد على Custom Claims في Firebase Auth.
 * يجب تعيين Custom Claim للمستخدم (مثلاً: admin: true) يدوياً أو عبر Cloud Function.
 * @returns {Promise<boolean>} بروميس يحتوي على true إذا كان المستخدم أدمن، وإلا false.
 */
async function checkAdminStatus() {
    console.log("Checking admin status...");
    const auth = firebase.auth();
    const user = auth.currentUser;

    if (!user) {
        console.log("No user logged in.");
        return false; // لا يمكن أن يكون أدمن إذا لم يكن مسجلاً
    }

    try {
        // فرض إعادة تحميل التوكن للحصول على أحدث الـ claims
        const idTokenResult = await user.getIdTokenResult(true);
        console.log("User claims:", idTokenResult.claims);
        // التحقق من وجود claim باسم 'admin' وقيمته true
        if (idTokenResult.claims.admin === true) {
            console.log("User is an admin.");
            return true;
        } else {
            console.log("User is not an admin.");
            return false;
        }
    } catch (error) {
        console.error("Error getting ID token result:", error);
        return false; // افتراض أنه ليس أدمن في حالة الخطأ
    }
}

// ملاحظة: وظائف تسجيل الدخول بـ Google و Facebook موجودة مباشرة في login.html
// لتبسيط الأمور، ولكن يمكن نقلها هنا أيضاً إذا أردت تنظيم الكود بشكل أكبر.

