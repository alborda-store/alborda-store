// ملف وظائف JavaScript الخاصة بصفحة الملف الشخصي (profile.html)

/**
 * تهيئة صفحة الملف الشخصي.
 * يتم استدعاؤها بعد التأكد من أن المستخدم مسجل الدخول.
 */
function initializeProfilePage() {
    console.log("Initializing profile page...");
    const user = firebase.auth().currentUser;
    const db = firebase.firestore();

    if (!user) {
        console.error("User not logged in on profile page.");
        // إظهار رسالة للمستخدم بضرورة تسجيل الدخول
        const profileContent = document.getElementById("profile-content");
        const loginRequiredMsg = document.getElementById("login-required-message-profile");
        if(profileContent) profileContent.classList.add("hidden");
        if(loginRequiredMsg) loginRequiredMsg.classList.remove("hidden");
        return;
    }

    // إظهار محتوى الملف الشخصي وإخفاء رسالة تسجيل الدخول
    const profileContent = document.getElementById("profile-content");
    const loginRequiredMsg = document.getElementById("login-required-message-profile");
    if(profileContent) profileContent.classList.remove("hidden");
    if(loginRequiredMsg) loginRequiredMsg.classList.add("hidden");

    // عرض معلومات المستخدم الأساسية
    displayUserProfileInfo(user);

    // تحميل وعرض قائمة الأمنيات
    loadAndDisplayWishlist(db, user.uid);

    // تحميل وعرض العناوين المحفوظة
    loadAndDisplayAddresses(db, user.uid);

    // ربط أحداث نموذج إضافة/تعديل العنوان
    setupAddressForm(db, user.uid);

    // ربط زر تسجيل الخروج (موجود أيضاً في auth.js)
    const logoutButtonProfile = document.getElementById("logout-button-profile");
    if (logoutButtonProfile) {
        logoutButtonProfile.addEventListener("click", handleLogout);
    }
}

/**
 * عرض معلومات المستخدم الأساسية في صفحة الملف الشخصي.
 * @param {firebase.User} user - كائن المستخدم.
 */
function displayUserProfileInfo(user) {
    const profilePhoto = document.getElementById("profile-photo");
    const displayName = document.getElementById("profile-display-name");
    const email = document.getElementById("profile-email");

    if (profilePhoto) {
        profilePhoto.src = user.photoURL || "assets/images/avatar_placeholder.png";
        profilePhoto.alt = user.displayName || "الصورة الشخصية";
    }
    if (displayName) {
        displayName.textContent = user.displayName || "مستخدم";
    }
    if (email) {
        email.textContent = user.email || "البريد الإلكتروني غير متوفر";
    }
}

// --- وظائف قائمة الأمنيات (Wishlist) --- //

/**
 * تحميل قائمة أمنيات المستخدم وعرضها.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 */
async function loadAndDisplayWishlist(db, userId) {
    console.log("Loading wishlist for user:", userId);
    const wishlistContainer = document.getElementById("wishlist-items-container");
    const loadingMsg = document.getElementById("loading-wishlist-message");
    const emptyMsg = document.getElementById("empty-wishlist-message");

    if (!wishlistContainer || !loadingMsg || !emptyMsg) return;

    loadingMsg.classList.remove("hidden");
    emptyMsg.classList.add("hidden");
    wishlistContainer.innerHTML = "; // تفريغ العناصر القديمة مع الاحتفاظ برسائل الحالة
    wishlistContainer.appendChild(loadingMsg);
    wishlistContainer.appendChild(emptyMsg);

    try {
        // جلب معرفات المنتجات من قائمة أمنيات المستخدم
        // نفترض أن قائمة الأمنيات مخزنة كـ collection فرعي للمستخدم أو حقل مصفوفة في وثيقة المستخدم
        // مثال: استخدام حقل مصفوفة `wishlist` في وثيقة المستخدم
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const wishlistProductIds = userDoc.exists ? (userDoc.data().wishlist || []) : [];

        if (wishlistProductIds.length === 0) {
            loadingMsg.classList.add("hidden");
            emptyMsg.classList.remove("hidden");
            return;
        }

        // جلب تفاصيل المنتجات الموجودة في قائمة الأمنيات
        // ملاحظة: استعلام `in` محدود بـ 10 عناصر. لقوائم أكبر، قد تحتاج لجلب المنتجات بشكل فردي أو بطريقة أخرى.
        const productPromises = wishlistProductIds.map(id => fetchProductById(db, id));
        const products = (await Promise.all(productPromises)).filter(p => p !== null); // تصفية المنتجات غير الموجودة

        loadingMsg.classList.add("hidden");

        if (products.length === 0) {
            emptyMsg.classList.remove("hidden");
            return;
        }

        products.forEach(product => {
            const itemDiv = document.createElement("div");
            itemDiv.classList.add("wishlist-item", "flex", "items-center", "justify-between", "border-b", "pb-3");
            itemDiv.dataset.productId = product.id;
            itemDiv.innerHTML = `
                <div class="flex items-center">
                    <img src="${product.imageUrl || ".assets/images/placeholder.png"}" alt="${product.name}" class="w-12 h-12 object-cover rounded mr-3 ml-3">
                    <div>
                        <a href="product-details.html?id=${product.id}" class="font-semibold text-gray-800 hover:text-indigo-600">${product.name}</a>
                        <p class="text-sm text-indigo-600">$${product.price.toFixed(2)}</p>
                    </div>
                </div>
                <button class="remove-from-wishlist-button text-red-500 hover:text-red-700" data-id="${product.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            `;
            // إزالة رسائل التحميل/الفراغ قبل إضافة أول عنصر
            if (wishlistContainer.contains(loadingMsg)) loadingMsg.remove();
            if (wishlistContainer.contains(emptyMsg)) emptyMsg.remove();

            wishlistContainer.appendChild(itemDiv);
        });

        // ربط حدث الحذف لأزرار الحذف
        wishlistContainer.querySelectorAll(".remove-from-wishlist-button").forEach(button => {
            button.addEventListener("click", (e) => handleRemoveFromWishlist(db, userId, e.target.dataset.id));
        });

    } catch (error) {
        console.error("Error loading wishlist:", error);
        loadingMsg.classList.add("hidden");
        wishlistContainer.innerHTML = `<p class="text-red-500">حدث خطأ أثناء تحميل قائمة الأمنيات.</p>`;
    }
}

/**
 * إضافة منتج إلى قائمة أمنيات المستخدم في Firestore.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 * @param {string} productId - معرف المنتج.
 */
async function handleAddToWishlist(db, userId, productId) {
    console.log(`Adding product ${productId} to wishlist for user ${userId}`);
    const userRef = db.collection("users").doc(userId);
    try {
        await userRef.update({
            wishlist: firebase.firestore.FieldValue.arrayUnion(productId)
        });
        console.log("Product added to wishlist successfully.");
        showUserMessage("wishlist-status-placeholder", "تمت إضافة المنتج إلى قائمة الأمنيات.", "success"); // افترض وجود عنصر لعرض الحالة
        // يمكنك تحديث واجهة المستخدم هنا (مثل تغيير شكل أيقونة القلب)
    } catch (error) {
        console.error("Error adding product to wishlist:", error);
        showUserMessage("wishlist-status-placeholder", "حدث خطأ أثناء إضافة المنتج لقائمة الأمنيات.", "error");
    }
}

/**
 * إزالة منتج من قائمة أمنيات المستخدم في Firestore.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 * @param {string} productId - معرف المنتج.
 */
async function handleRemoveFromWishlist(db, userId, productId) {
    console.log(`Removing product ${productId} from wishlist for user ${userId}`);
    const userRef = db.collection("users").doc(userId);
    try {
        await userRef.update({
            wishlist: firebase.firestore.FieldValue.arrayRemove(productId)
        });
        console.log("Product removed from wishlist successfully.");
        // إعادة تحميل قائمة الأمنيات في الواجهة
        loadAndDisplayWishlist(db, userId);
    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        showUserMessage("wishlist-status-placeholder", "حدث خطأ أثناء إزالة المنتج من قائمة الأمنيات.", "error");
    }
}

// --- وظائف العناوين المحفوظة (Saved Addresses) --- //

let currentEditingAddressId = null; // لتتبع العنوان الذي يتم تعديله

/**
 * تحميل عناوين المستخدم المحفوظة وعرضها.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 */
async function loadAndDisplayAddresses(db, userId) {
    console.log("Loading addresses for user:", userId);
    const addressesContainer = document.getElementById("addresses-list-container");
    const loadingMsg = document.getElementById("loading-addresses-message");
    const emptyMsg = document.getElementById("empty-addresses-message");

    if (!addressesContainer || !loadingMsg || !emptyMsg) return;

    loadingMsg.classList.remove("hidden");
    emptyMsg.classList.add("hidden");
    addressesContainer.innerHTML = "; // تفريغ العناصر القديمة
    addressesContainer.appendChild(loadingMsg);
    addressesContainer.appendChild(emptyMsg);

    try {
        // جلب العناوين من collection فرعي للمستخدم
        const addressesRef = db.collection("users").doc(userId).collection("addresses");
        const snapshot = await addressesRef.orderBy("createdAt", "desc").get(); // عرض الأحدث أولاً

        loadingMsg.classList.add("hidden");

        if (snapshot.empty) {
            emptyMsg.classList.remove("hidden");
            return;
        }

        snapshot.forEach(doc => {
            const address = doc.data();
            const addressId = doc.id;
            const itemDiv = document.createElement("div");
            itemDiv.classList.add("address-item", "border", "p-3", "rounded", "flex", "justify-between", "items-start");
            itemDiv.dataset.addressId = addressId;
            itemDiv.innerHTML = `
                <div>
                    <p class="font-semibold">${address.recipientName || "غير محدد"}</p>
                    <p class="text-sm text-gray-600">${address.addressLine}, ${address.city}, ${address.country}</p>
                    <p class="text-sm text-gray-600">الهاتف: ${address.phone || "غير محدد"}</p>
                </div>
                <div class="flex space-x-2 space-x-reverse text-sm">
                    <button class="edit-address-button text-blue-600 hover:underline" data-id="${addressId}">تعديل</button>
                    <button class="delete-address-button text-red-600 hover:underline" data-id="${addressId}">حذف</button>
                </div>
            `;
            // إزالة رسائل التحميل/الفراغ قبل إضافة أول عنصر
            if (addressesContainer.contains(loadingMsg)) loadingMsg.remove();
            if (addressesContainer.contains(emptyMsg)) emptyMsg.remove();

            addressesContainer.appendChild(itemDiv);
        });

        // ربط الأحداث لأزرار التعديل والحذف
        addressesContainer.querySelectorAll(".edit-address-button").forEach(button => {
            button.addEventListener("click", (e) => handleEditAddress(db, userId, e.target.dataset.id));
        });
        addressesContainer.querySelectorAll(".delete-address-button").forEach(button => {
            button.addEventListener("click", (e) => handleDeleteAddress(db, userId, e.target.dataset.id));
        });

    } catch (error) {
        console.error("Error loading addresses:", error);
        loadingMsg.classList.add("hidden");
        addressesContainer.innerHTML = `<p class="text-red-500">حدث خطأ أثناء تحميل العناوين.</p>`;
    }
}

/**
 * تهيئة نموذج إضافة/تعديل العنوان وربط الأحداث.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 */
function setupAddressForm(db, userId) {
    const addAddressButton = document.getElementById("add-new-address-button");
    const addressFormModal = document.getElementById("address-form-modal");
    const cancelFormButton = document.getElementById("cancel-address-form-button");
    const addressForm = document.getElementById("address-form");

    // فتح نموذج إضافة عنوان جديد
    if (addAddressButton) {
        addAddressButton.addEventListener("click", () => {
            resetAddressForm();
            currentEditingAddressId = null;
            document.getElementById("address-form-title").textContent = "إضافة عنوان جديد";
            if (addressFormModal) addressFormModal.classList.remove("hidden");
        });
    }

    // إغلاق النموذج
    if (cancelFormButton) {
        cancelFormButton.addEventListener("click", () => {
            if (addressFormModal) addressFormModal.classList.add("hidden");
        });
    }

    // التعامل مع إرسال النموذج
    if (addressForm) {
        addressForm.addEventListener("submit", (event) => {
            event.preventDefault();
            handleSaveAddress(db, userId);
        });
    }
}

/**
 * إعادة تعيين حقول نموذج العنوان.
 */
function resetAddressForm() {
    const form = document.getElementById("address-form");
    if (form) form.reset();
    document.getElementById("address-id-input").value = "";
    // يمكنك إضافة مسح رسائل الخطأ هنا إذا وجدت
    document.getElementById("save-address-form-button").disabled = false;
    document.getElementById("save-address-form-button").textContent = "حفظ العنوان";
}

/**
 * معالجة حفظ (إضافة أو تحديث) العنوان.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 */
async function handleSaveAddress(db, userId) {
    console.log("Saving address for user:", userId);
    const saveButton = document.getElementById("save-address-form-button");
    const addressFormModal = document.getElementById("address-form-modal");

    saveButton.disabled = true;
    saveButton.textContent = "جاري الحفظ...";

    // جمع البيانات من النموذج
    const addressData = {
        recipientName: document.getElementById("form-shipping-name").value.trim(),
        addressLine: document.getElementById("form-shipping-address").value.trim(),
        city: document.getElementById("form-shipping-city").value.trim(),
        country: document.getElementById("form-shipping-country").value.trim(),
        phone: document.getElementById("form-shipping-phone").value.trim(),
    };

    // التحقق من الحقول المطلوبة
    if (!addressData.recipientName || !addressData.addressLine || !addressData.city || !addressData.country || !addressData.phone) {
        alert("يرجى ملء جميع حقول العنوان."); // يمكنك استخدام showUserMessage بدلاً من alert
        saveButton.disabled = false;
        saveButton.textContent = "حفظ العنوان";
        return;
    }

    try {
        const addressesRef = db.collection("users").doc(userId).collection("addresses");
        if (currentEditingAddressId) {
            // وضع التعديل
            await addressesRef.doc(currentEditingAddressId).update({
                ...addressData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Address ${currentEditingAddressId} updated.`);
        } else {
            // وضع الإضافة
            await addressesRef.add({
                ...addressData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("New address added.");
        }

        // إغلاق النموذج وإعادة تحميل قائمة العناوين
        if (addressFormModal) addressFormModal.classList.add("hidden");
        loadAndDisplayAddresses(db, userId);
        // يمكنك إظهار رسالة نجاح هنا

    } catch (error) {
        console.error("Error saving address:", error);
        alert("حدث خطأ أثناء حفظ العنوان. يرجى المحاولة مرة أخرى."); // استخدم showUserMessage
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "حفظ العنوان";
    }
}

/**
 * معالجة النقر على زر تعديل العنوان.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 * @param {string} addressId - معرف العنوان.
 */
async function handleEditAddress(db, userId, addressId) {
    console.log(`Editing address ${addressId} for user ${userId}`);
    const addressFormModal = document.getElementById("address-form-modal");
    resetAddressForm();

    try {
        const addressRef = db.collection("users").doc(userId).collection("addresses").doc(addressId);
        const doc = await addressRef.get();

        if (!doc.exists) {
            alert("لم يتم العثور على العنوان المحدد."); // استخدم showUserMessage
            return;
        }
        const addressData = doc.data();

        // ملء النموذج بالبيانات الحالية
        document.getElementById("address-id-input").value = addressId;
        document.getElementById("form-shipping-name").value = addressData.recipientName || "";
        document.getElementById("form-shipping-address").value = addressData.addressLine || "";
        document.getElementById("form-shipping-city").value = addressData.city || "";
        document.getElementById("form-shipping-country").value = addressData.country || "";
        document.getElementById("form-shipping-phone").value = addressData.phone || "";

        // تحديث حالة التعديل وفتح النموذج
        currentEditingAddressId = addressId;
        document.getElementById("address-form-title").textContent = "تعديل العنوان";
        if (addressFormModal) addressFormModal.classList.remove("hidden");

    } catch (error) {
        console.error("Error fetching address for edit:", error);
        alert("حدث خطأ أثناء جلب بيانات العنوان للتعديل."); // استخدم showUserMessage
    }
}

/**
 * معالجة النقر على زر حذف العنوان.
 * @param {firebase.firestore.Firestore} db - كائن Firestore.
 * @param {string} userId - معرف المستخدم.
 * @param {string} addressId - معرف العنوان.
 */
async function handleDeleteAddress(db, userId, addressId) {
    console.log(`Deleting address ${addressId} for user ${userId}`);

    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا العنوان؟")) {
        return;
    }

    try {
        const addressRef = db.collection("users").doc(userId).collection("addresses").doc(addressId);
        await addressRef.delete();
        console.log(`Address ${addressId} deleted.`);
        // إعادة تحميل قائمة العناوين
        loadAndDisplayAddresses(db, userId);
        // يمكنك إظهار رسالة نجاح هنا
    } catch (error) {
        console.error("Error deleting address:", error);
        alert("حدث خطأ أثناء حذف العنوان."); // استخدم showUserMessage
    }
}

