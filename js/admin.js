// ملف وظائف JavaScript الخاصة بلوحة تحكم الأدمن

/**
 * تهيئة صفحة الأدمن: التحقق من صلاحيات الأدمن قبل عرض المحتوى.
 * @param {Function} pageSpecificInit - دالة تهيئة خاصة بالصفحة الحالية (مثل تحميل المنتجات أو الطلبات).
 */
function initializeAdminPage(pageSpecificInit) {
    console.log("Initializing admin page...");
    firebase.auth().onAuthStateChanged(async (user) => {
        const adminContent = document.getElementById("admin-content");
        const loadingMessage = document.getElementById("admin-loading-message");
        const accessDeniedMessage = document.getElementById("admin-access-denied");

        if (user) {
            console.log("User logged in, checking admin status...");
            try {
                const db = firebase.firestore();
                const isAdmin = await checkIfAdmin(db, user.uid);

                if (isAdmin) {
                    console.log("Admin access granted.");
                    if(loadingMessage) loadingMessage.classList.add("hidden");
                    if(accessDeniedMessage) accessDeniedMessage.classList.add("hidden");
                    if(adminContent) adminContent.classList.remove("hidden");
                    // استدعاء دالة التهيئة الخاصة بالصفحة إذا كانت موجودة
                    if (typeof pageSpecificInit === "function") {
                        pageSpecificInit(db, user);
                    }
                } else {
                    console.log("Admin access denied.");
                    if(loadingMessage) loadingMessage.classList.add("hidden");
                    if(adminContent) adminContent.classList.add("hidden");
                    if(accessDeniedMessage) accessDeniedMessage.classList.remove("hidden");
                    // اختياري: إعادة التوجيه بعد فترة قصيرة
                    // setTimeout(() => { window.location.href = '../index.html'; }, 3000);
                }
            } catch (error) {
                console.error("Error checking admin status:", error);
                if(loadingMessage) loadingMessage.textContent = "حدث خطأ أثناء التحقق من الصلاحيات.";
                if(loadingMessage) loadingMessage.classList.remove("hidden");
                if(adminContent) adminContent.classList.add("hidden");
                if(accessDeniedMessage) accessDeniedMessage.classList.add("hidden");
            }
        } else {
            console.log("User not logged in. Redirecting to login page.");
            // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول مع حفظ الصفحة الحالية للعودة إليها
            window.location.href = `../login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
    });
}

// --- وظائف إدارة المنتجات (manage-products.html) ---

/**
 * تهيئة صفحة إدارة المنتجات: تحميل المنتجات وعرضها.
 * @param {firebase.firestore.Firestore} db
 */
async function initManageProductsPage(db) {
    console.log("Initializing manage products page...");
    const productsTableBody = document.getElementById("products-table-body");
    const loadingRow = document.getElementById("loading-products-row");
    const noProductsRow = document.getElementById("no-products-row");
    const productForm = document.getElementById("product-form");
    const productModal = document.getElementById("product-modal");
    const addProductButton = document.getElementById("add-product-button");
    const closeProductModalButton = document.getElementById("close-product-modal-button");
    const cancelProductModalButton = document.getElementById("cancel-product-modal-button");
    const productModalTitle = document.getElementById("product-modal-title");
    const productIdInput = document.getElementById("product-id");
    const productImagePreview = document.getElementById("product-image-preview");
    const productImageInput = document.getElementById("product-image");
    const formError = document.getElementById("product-form-error");

    // تحميل وعرض المنتجات
    await loadAndDisplayAdminProducts(db, productsTableBody, loadingRow, noProductsRow);

    // فتح نافذة إضافة منتج
    addProductButton?.addEventListener("click", () => {
        productForm.reset();
        productIdInput.value = "";
        productImagePreview.src = "../assets/images/placeholder.png"; // إعادة الصورة الافتراضية
        productImagePreview.classList.remove("hidden");
        productModalTitle.textContent = "إضافة منتج جديد";
        formError.classList.add("hidden");
        productModal.classList.remove("hidden");
    });

    // إغلاق نافذة المنتج
    closeProductModalButton?.addEventListener("click", () => productModal.classList.add("hidden"));
    cancelProductModalButton?.addEventListener("click", () => productModal.classList.add("hidden"));

    // معاينة الصورة عند اختيار ملف
    productImageInput?.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                productImagePreview.src = e.target.result;
                productImagePreview.classList.remove("hidden");
            }
            reader.readAsDataURL(file);
        } else {
            // إذا ألغى المستخدم اختيار الملف، أعد الصورة الافتراضية إذا لم يكن هناك منتج قيد التعديل
            if (!productIdInput.value) {
                 productImagePreview.src = "../assets/images/placeholder.png";
            }
        }
    });

    // معالجة إرسال نموذج المنتج (إضافة أو تحديث)
    productForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        formError.classList.add("hidden");
        const saveButton = productForm.querySelector("button[type='submit']");
        saveButton.disabled = true;
        saveButton.textContent = "جاري الحفظ...";

        const productId = productIdInput.value;
        const isEditing = !!productId;
        const imageFile = productImageInput.files[0];

        const productData = {
            name: document.getElementById("product-name").value.trim(),
            description: document.getElementById("product-description").value.trim(),
            price: parseFloat(document.getElementById("product-price").value),
            category: document.getElementById("product-category").value.trim(),
            stock: parseInt(document.getElementById("product-stock").value),
            // المقاسات المتوفرة - تحويل النص إلى مصفوفة
            availableSizes: document.getElementById("product-sizes").value.split(',').map(s => s.trim()).filter(s => s !== ""),
            // imageUrl سيتم تحديثه بعد رفع الصورة
        };

        // التحقق من صحة البيانات
        if (!productData.name || !productData.price || isNaN(productData.price) || productData.price <= 0 || !productData.category || isNaN(productData.stock) || productData.stock < 0) {
            formError.textContent = "يرجى ملء جميع الحقول المطلوبة والتأكد من صحة القيم (السعر والمخزون).";
            formError.classList.remove("hidden");
            saveButton.disabled = false;
            saveButton.textContent = "حفظ المنتج";
            return;
        }

        try {
            let imageUrl = document.getElementById("product-image-url-hidden")?.value || null; // الحصول على الرابط القديم إذا كان موجوداً

            // 1. رفع الصورة إذا تم اختيار ملف جديد
            if (imageFile) {
                console.log("Uploading new image...");
                // التأكد من تهيئة Storage
                if (typeof firebase.storage === 'function') {
                    const storage = firebase.storage();
                    imageUrl = await uploadProductImage(storage, imageFile, productData.name);
                    console.log("Image uploaded successfully:", imageUrl);
                } else {
                    throw new Error("Firebase Storage is not initialized correctly.");
                }
            }

            productData.imageUrl = imageUrl; // تحديث رابط الصورة في بيانات المنتج

            // 2. إضافة أو تحديث المنتج في Firestore
            if (isEditing) {
                console.log(`Updating product ${productId}...`);
                await updateProduct(db, productId, productData);
                console.log("Product updated.");
            } else {
                console.log("Adding new product...");
                await addProduct(db, productData);
                console.log("Product added.");
            }

            // 3. إغلاق النافذة وتحديث الجدول
            productModal.classList.add("hidden");
            await loadAndDisplayAdminProducts(db, productsTableBody, loadingRow, noProductsRow);

        } catch (error) {
            console.error("Error saving product:", error);
            formError.textContent = `حدث خطأ: ${error.message}`; // عرض رسالة الخطأ
            formError.classList.remove("hidden");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "حفظ المنتج";
        }
    });
}

/**
 * تحميل وعرض المنتجات في جدول الأدمن.
 * @param {firebase.firestore.Firestore} db
 * @param {HTMLElement} tableBody
 * @param {HTMLElement} loadingRow
 * @param {HTMLElement} noProductsRow
 */
async function loadAndDisplayAdminProducts(db, tableBody, loadingRow, noProductsRow) {
    if (!tableBody || !loadingRow || !noProductsRow) return;

    tableBody.innerHTML = ''; // مسح الجدول
    loadingRow.classList.remove('hidden');
    noProductsRow.classList.add('hidden');

    try {
        // استخدام fetchAllProducts بدون فلاتر أو فرز محدد هنا (يمكن إضافة فرز لاحقاً)
        const products = await fetchAllProducts(db, {}, 'createdAt', 'desc'); // فرز حسب تاريخ الإنشاء

        loadingRow.classList.add('hidden');

        if (products.length === 0) {
            noProductsRow.classList.remove('hidden');
        } else {
            products.forEach(product => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-full object-cover" src="${product.imageUrl || '../assets/images/placeholder.png'}" alt="${product.name}">
                            </div>
                            <div class="mr-4">
                                <div class="text-sm font-medium text-gray-900">${product.name}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.category}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${(product.price || 0).toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.stock}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 space-x-reverse">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-product-button" data-product-id="${product.id}">تعديل</button>
                        <button class="text-red-600 hover:text-red-900 delete-product-button" data-product-id="${product.id}">حذف</button>
                    </td>
                `;
                // تخزين بيانات المنتج مع الأزرار لتسهيل الوصول إليها عند النقر
                const editButton = row.querySelector('.edit-product-button');
                const deleteButton = row.querySelector('.delete-product-button');
                if(editButton) editButton.productData = product;
                if(deleteButton) deleteButton.productData = product;
            });

            // ربط الأحداث لأزرار التعديل والحذف
            tableBody.querySelectorAll('.edit-product-button').forEach(button => {
                button.addEventListener('click', handleEditProductClick);
            });
            tableBody.querySelectorAll('.delete-product-button').forEach(button => {
                button.addEventListener('click', handleDeleteProductClick);
            });
        }
    } catch (error) {
        console.error("Error loading products for admin:", error);
        loadingRow.classList.add('hidden');
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">حدث خطأ أثناء تحميل المنتجات.</td></tr>`;
    }
}

/**
 * معالجة النقر على زر تعديل المنتج.
 */
function handleEditProductClick(event) {
    const button = event.target;
    const product = button.productData;
    if (!product) return;

    const productForm = document.getElementById("product-form");
    const productModal = document.getElementById("product-modal");
    const productModalTitle = document.getElementById("product-modal-title");
    const productIdInput = document.getElementById("product-id");
    const productImagePreview = document.getElementById("product-image-preview");
    const formError = document.getElementById("product-form-error");

    productForm.reset();
    formError.classList.add("hidden");
    productModalTitle.textContent = "تعديل المنتج";

    // ملء النموذج ببيانات المنتج الحالي
    productIdInput.value = product.id;
    document.getElementById("product-name").value = product.name || '';
    document.getElementById("product-description").value = product.description || '';
    document.getElementById("product-price").value = product.price || 0;
    document.getElementById("product-category").value = product.category || '';
    document.getElementById("product-stock").value = product.stock || 0;
    document.getElementById("product-sizes").value = (product.availableSizes || []).join(', ');
    document.getElementById("product-image-url-hidden").value = product.imageUrl || ''; // تخزين الرابط الحالي

    // عرض الصورة الحالية
    if (product.imageUrl) {
        productImagePreview.src = product.imageUrl;
        productImagePreview.classList.remove("hidden");
    } else {
        productImagePreview.src = "../assets/images/placeholder.png";
        productImagePreview.classList.remove("hidden");
    }

    productModal.classList.remove("hidden");
}

/**
 * معالجة النقر على زر حذف المنتج.
 */
async function handleDeleteProductClick(event) {
    const button = event.target;
    const product = button.productData;
    if (!product) return;

    if (confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${product.name}"؟ سيتم حذف المنتج وصورته (إذا وجدت).`)) {
        console.log(`Attempting to delete product ${product.id}...`);
        button.disabled = true;
        button.textContent = "جاري الحذف...";

        try {
            const db = firebase.firestore();
            // 1. حذف المنتج من Firestore
            await deleteProduct(db, product.id);
            console.log("Product deleted from Firestore.");

            // 2. حذف الصورة من Storage (إذا كان هناك رابط)
            if (product.imageUrl && typeof firebase.storage === 'function') {
                try {
                    const storage = firebase.storage();
                    await deleteProductImage(storage, product.imageUrl);
                    console.log("Product image deleted from Storage.");
                } catch (storageError) {
                    console.error("Error deleting product image from Storage:", storageError);
                    // استمر حتى لو فشل حذف الصورة
                }
            }

            // 3. إعادة تحميل الجدول
            const productsTableBody = document.getElementById("products-table-body");
            const loadingRow = document.getElementById("loading-products-row");
            const noProductsRow = document.getElementById("no-products-row");
            await loadAndDisplayAdminProducts(db, productsTableBody, loadingRow, noProductsRow);

        } catch (error) {
            console.error("Error deleting product:", error);
            alert(`حدث خطأ أثناء حذف المنتج: ${error.message}`);
            button.disabled = false;
            button.textContent = "حذف";
        }
    }
}

// --- وظائف عرض الطلبات (view-orders.html) ---

/**
 * تهيئة صفحة عرض الطلبات للأدمن.
 * @param {firebase.firestore.Firestore} db
 */
async function initViewOrdersPage(db) {
    console.log("Initializing view orders page...");
    const ordersTableBody = document.getElementById("orders-table-body");
    const loadingRow = document.getElementById("loading-orders-row");
    const noOrdersRow = document.getElementById("no-orders-row");
    const statusFilter = document.getElementById("status-filter");

    // تحميل وعرض الطلبات عند تحميل الصفحة
    await loadAndDisplayAdminOrders(db, ordersTableBody, loadingRow, noOrdersRow);

    // إعادة تحميل الطلبات عند تغيير الفلتر
    statusFilter?.addEventListener("change", () => {
        loadAndDisplayAdminOrders(db, ordersTableBody, loadingRow, noOrdersRow, statusFilter.value);
    });
}

/**
 * تحميل وعرض الطلبات في جدول الأدمن.
 * @param {firebase.firestore.Firestore} db
 * @param {HTMLElement} tableBody
 * @param {HTMLElement} loadingRow
 * @param {HTMLElement} noOrdersRow
 * @param {string|null} statusFilter - فلتر الحالة المطلوب.
 */
async function loadAndDisplayAdminOrders(db, tableBody, loadingRow, noOrdersRow, statusFilter = null) {
    if (!tableBody || !loadingRow || !noOrdersRow) return;

    tableBody.innerHTML = ''; // مسح الجدول
    loadingRow.classList.remove('hidden');
    noOrdersRow.classList.add('hidden');

    try {
        const effectiveFilter = statusFilter === "all" ? null : statusFilter;
        const orders = await fetchAllOrders(db, effectiveFilter);

        loadingRow.classList.add('hidden');

        if (orders.length === 0) {
            noOrdersRow.classList.remove('hidden');
        } else {
            orders.forEach(order => {
                const row = tableBody.insertRow();
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('ar-EG') : 'غير محدد';
                const totalAmount = (order.totalAmount || 0).toFixed(2);
                const customerName = order.shippingAddress?.recipientName || 'غير متوفر';
                const customerEmail = order.userEmail || order.userId; // عرض الإيميل إن وجد، وإلا الـ ID

                // تحديد لون ونص الحالة
                let statusText = 'غير معروف';
                let statusColor = 'gray';
                switch (order.status) {
                    case 'pending': statusText = 'قيد المراجعة'; statusColor = 'yellow'; break;
                    case 'processing': statusText = 'قيد التجهيز'; statusColor = 'blue'; break;
                    case 'shipped': statusText = 'تم الشحن'; statusColor = 'indigo'; break;
                    case 'delivered': statusText = 'تم التوصيل'; statusColor = 'green'; break;
                    case 'cancelled': statusText = 'ملغي'; statusColor = 'red'; break;
                }

                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${orderDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customerName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customerEmail}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${totalAmount}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800">
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 space-x-reverse">
                        <button class="text-blue-600 hover:text-blue-900 view-order-details-admin-button" data-order-id="${order.id}">التفاصيل</button>
                        <select class="text-xs border-gray-300 rounded change-order-status-select" data-order-id="${order.id}">
                            <option value="" disabled ${!order.status ? 'selected' : ''}>تغيير الحالة</option>
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد المراجعة</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>قيد التجهيز</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                        </select>
                    </td>
                `;
                // تخزين بيانات الطلب مع زر التفاصيل
                const detailsButton = row.querySelector('.view-order-details-admin-button');
                 if(detailsButton) detailsButton.orderData = order;
            });

            // ربط الأحداث لأزرار التفاصيل وقوائم تغيير الحالة
            tableBody.querySelectorAll('.view-order-details-admin-button').forEach(button => {
                button.addEventListener('click', handleViewOrderDetailsAdminClick);
            });
            tableBody.querySelectorAll('.change-order-status-select').forEach(select => {
                select.addEventListener('change', handleOrderStatusChange);
            });
        }
    } catch (error) {
        console.error("Error loading orders for admin:", error);
        loadingRow.classList.add('hidden');
        tableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">حدث خطأ أثناء تحميل الطلبات.</td></tr>`;
    }
}

/**
 * معالجة تغيير حالة الطلب من قبل الأدمن.
 */
async function handleOrderStatusChange(event) {
    const selectElement = event.target;
    const orderId = selectElement.dataset.orderId;
    const newStatus = selectElement.value;

    if (!orderId || !newStatus) return;

    console.log(`Changing status for order ${orderId} to ${newStatus}...`);
    selectElement.disabled = true;

    try {
        const db = firebase.firestore();
        await updateOrderStatus(db, orderId, newStatus);
        console.log("Order status updated.");
        // تحديث لون النص في الجدول (اختياري، يتطلب إعادة تحميل أو تعديل DOM مباشر)
        // الطريقة الأسهل هي إعادة تحميل القائمة بنفس الفلتر الحالي
        const statusFilter = document.getElementById("status-filter");
        const ordersTableBody = document.getElementById("orders-table-body");
        const loadingRow = document.getElementById("loading-orders-row");
        const noOrdersRow = document.getElementById("no-orders-row");
        await loadAndDisplayAdminOrders(db, ordersTableBody, loadingRow, noOrdersRow, statusFilter?.value);

    } catch (error) {
        console.error("Error updating order status:", error);
        alert(`حدث خطأ أثناء تحديث حالة الطلب: ${error.message}`);
        // إعادة القيمة القديمة في حالة الخطأ
        // selectElement.value = القيمة القديمة; // يتطلب تخزين القيمة القديمة
        selectElement.disabled = false;
    }
}

/**
 * معالجة النقر على زر عرض تفاصيل الطلب للأدمن (وظيفة وهمية حالياً).
 * يمكن فتح نافذة مشابهة لتلك الموجودة في my-orders.html
 */
function handleViewOrderDetailsAdminClick(event) {
    const button = event.target;
    const order = button.orderData;
    if (!order) return;

    alert(`سيتم عرض تفاصيل الطلب رقم: ${order.id}\nالعميل: ${order.shippingAddress?.recipientName}\nالمجموع: $${(order.totalAmount || 0).toFixed(2)}\n(التفاصيل الكاملة لم يتم تنفيذها بعد في هذه النافذة)`);
    // يمكنك هنا فتح نافذة modal وعرض تفاصيل الطلب الكاملة باستخدام بيانات order
    // يمكن إعادة استخدام نفس الكود المستخدم في my-orders.html لعرض التفاصيل
}


// --- تهيئة الصفحات --- 
// يتم استدعاء الدالة المناسبة بناءً على الصفحة الحالية
document.addEventListener('DOMContentLoaded', () => {
    const pagePath = window.location.pathname;

    if (pagePath.includes('/admin/manage-products.html')) {
        initializeAdminPage(initManageProductsPage);
    } else if (pagePath.includes('/admin/view-orders.html')) {
        initializeAdminPage(initViewOrdersPage);
    } else if (pagePath.includes('/admin/index.html')) {
        initializeAdminPage(); // صفحة الأدمن الرئيسية قد لا تحتاج تهيئة خاصة
    } else if (pagePath.includes('/admin/statistics.html')) {
        initializeAdminPage(); // صفحة الإحصائيات تحتاج تهيئة خاصة لاحقاً
    }
    // يمكن إضافة صفحات أدمن أخرى هنا
});

