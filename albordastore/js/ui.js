// ملف وظائف واجهة المستخدم العامة (UI)

/** 
 * تهيئة وظائف واجهة المستخدم العامة عند تحميل الصفحة.
 * يربط الأحداث لعناصر مثل زر القائمة للموبايل.
 */
function initializeUI() {
    console.log("Initializing common UI elements...");

    // التعامل مع زر القائمة للموبايل
    const mobileMenuButton = document.getElementById("mobile-menu-button");
    const mobileMenu = document.getElementById("mobile-menu");

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener("click", () => {
            mobileMenu.classList.toggle("hidden");
            // يمكنك إضافة تغيير لشكل الأيقونة هنا (مثلاً من قائمة إلى إغلاق)
            console.log("Mobile menu toggled");
        });
    }

    // يمكنك إضافة تهيئة لعناصر واجهة مستخدم عامة أخرى هنا
    // مثل إغلاق القائمة عند النقر خارجها، أو التعامل مع النوافذ المنبثقة العامة
}

/**
 * تحديث واجهة المستخدم بناءً على حالة تسجيل دخول المستخدم.
 * @param {firebase.User | null} user - كائن المستخدم من Firebase أو null.
 */
function updateUIBasedOnAuthState(user) {
    console.log("Updating UI based on auth state:", user ? user.uid : "Logged out");
    const loginLink = document.getElementById("nav-login-link");
    const profileLink = document.getElementById("nav-profile-link");
    const logoutButton = document.getElementById("nav-logout-button");
    const myOrdersLink = document.querySelector('a[href="my-orders.html"]'); // قد يكون في القائمة الرئيسية أو الموبايل
    const adminUserInfo = document.getElementById("admin-user-info"); // في لوحة التحكم
    const adminUsernameSpan = document.getElementById("admin-username"); // في لوحة التحكم

    if (user) {
        // المستخدم مسجل الدخول
        if (loginLink) loginLink.classList.add("hidden");
        if (profileLink) profileLink.classList.remove("hidden");
        if (logoutButton) logoutButton.classList.remove("hidden");
        if (myOrdersLink) myOrdersLink.classList.remove("hidden"); // تأكد من إظهار رابط طلباتي

        // تحديث معلومات المستخدم في لوحة التحكم (إذا كانت موجودة)
        if (adminUserInfo && adminUsernameSpan) {
            adminUsernameSpan.textContent = user.displayName || user.email || "المستخدم";
            adminUserInfo.classList.remove("hidden");
        }

        // ربط حدث تسجيل الخروج (إذا لم يكن مربوطاً بالفعل في auth.js)
        // يفضل أن يكون الربط في مكان واحد، ربما داخل observeAuthState في auth.js
        // if (logoutButton && !logoutButton.dataset.listenerAttached) {
        //     logoutButton.addEventListener("click", handleLogout); // افترض وجود دالة handleLogout في auth.js
        //     logoutButton.dataset.listenerAttached = "true";
        // }

    } else {
        // المستخدم غير مسجل الدخول
        if (loginLink) loginLink.classList.remove("hidden");
        if (profileLink) profileLink.classList.add("hidden");
        if (logoutButton) logoutButton.classList.add("hidden");
        if (myOrdersLink) myOrdersLink.classList.add("hidden"); // إخفاء رابط طلباتي

        // إخفاء معلومات المستخدم في لوحة التحكم
        if (adminUserInfo) {
            adminUserInfo.classList.add("hidden");
        }
    }
}

/**
 * عرض رسالة للمستخدم (مثل رسائل النجاح أو الخطأ).
 * @param {string} elementId - معرف العنصر الذي ستعرض فيه الرسالة.
 * @param {string} message - نص الرسالة.
 * @param {'success' | 'error' | 'info'} type - نوع الرسالة لتحديد التنسيق.
 * @param {number} duration - مدة عرض الرسالة بالمللي ثانية (0 لتبقى ظاهرة).
 */
function showUserMessage(elementId, message, type = 'info', duration = 5000) {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) {
        console.error(`Message element with ID '${elementId}' not found.`);
        return;
    }

    messageElement.textContent = message;
    messageElement.classList.remove('hidden', 'text-green-600', 'text-red-600', 'text-blue-600', 'bg-green-100', 'bg-red-100', 'bg-blue-100', 'border-green-500', 'border-red-500', 'border-blue-500');

    switch (type) {
        case 'success':
            messageElement.classList.add('text-green-700', 'bg-green-100', 'border', 'border-green-500', 'p-3', 'rounded');
            break;
        case 'error':
            messageElement.classList.add('text-red-700', 'bg-red-100', 'border', 'border-red-500', 'p-3', 'rounded');
            break;
        case 'info':
        default:
            messageElement.classList.add('text-blue-700', 'bg-blue-100', 'border', 'border-blue-500', 'p-3', 'rounded');
            break;
    }

    messageElement.classList.remove('hidden');

    if (duration > 0) {
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, duration);
    }
}


// استدعاء دالة التهيئة عند تحميل المحتوى
document.addEventListener("DOMContentLoaded", initializeUI);

