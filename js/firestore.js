// ملف وظائف التفاعل مع Firestore
// يتضمن وظائف لجلب البيانات، إضافتها، تحديثها، وحذفها من Firestore

/**
 * جلب جميع المنتجات من Firestore.
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {object} filters - (اختياري) كائن يحتوي على معايير التصفية (category, priceRange, rating, size).
 * @param {string} sortBy - (اختياري) حقل للفرز ('price', 'rating', 'name').
 * @param {string} sortDirection - (اختياري) اتجاه الفرز ('asc' أو 'desc').
 * @returns {Promise<Array<object>>} - مصفوفة من كائنات المنتجات.
 */
async function fetchAllProducts(db, filters = {}, sortBy = 'name', sortDirection = 'asc') {
    console.log("Fetching products with filters:", filters, "SortBy:", sortBy, sortDirection);
    let query = db.collection('products');

    // تطبيق الفلاتر
    if (filters.category) {
        query = query.where('category', '==', filters.category);
    }
    if (filters.size) {
        query = query.where('availableSizes', 'array-contains', filters.size);
    }
    if (filters.rating) {
        // Firestore لا يدعم المقارنة >= مباشرة مع الفرز بحقل آخر بسهولة.
        // قد نحتاج لجلب كل المنتجات ثم التصفية في الكلاينت أو استخدام Cloud Function.
        // للتبسيط الآن، سنجلب المنتجات التي تقييمها يساوي أو أكبر.
        query = query.where('averageRating', '>=', Number(filters.rating));
    }
    // فلتر السعر يتطلب معالجة خاصة لأنه نطاق
    // Firestore يتطلب أن تكون أول عملية فرز على نفس حقل نطاق المقارنة
    if (filters.priceRange && filters.priceRange.min !== undefined && filters.priceRange.max !== undefined) {
        // إذا كان الفرز ليس بالسعر، قد لا يعمل هذا الفلتر بشكل صحيح مع الفلاتر الأخرى
        if (sortBy === 'price') {
            query = query.where('price', '>=', Number(filters.priceRange.min))
                       .where('price', '<=', Number(filters.priceRange.max));
        } else {
            // إذا لم يكن الفرز بالسعر، قد نحتاج لتطبيق فلتر السعر في الكلاينت بعد الجلب
            console.warn("Price range filter might not work correctly when not sorting by price.");
            // يمكن محاولة إضافته ولكن قد يتعارض مع where clauses أخرى
             query = query.where('price', '>=', Number(filters.priceRange.min))
                        .where('price', '<=', Number(filters.priceRange.max));
        }
    }

    // تطبيق الفرز
    if (sortBy && sortDirection) {
        try {
            query = query.orderBy(sortBy, sortDirection);
        } catch (sortError) {
            console.error(`Error applying sorting by ${sortBy} ${sortDirection}:`, sortError);
            // قد يحدث خطأ إذا كان الفرز يتعارض مع where clauses (مثل نطاق السعر)
            // في هذه الحالة، يمكن إزالة الفرز أو تعديل الاستعلام
            // كمحاولة أخيرة، نفرز بالاسم
            if (sortBy !== 'name') {
                try {
                    query = query.orderBy('name', 'asc');
                    console.log("Fallback sorting by name applied.");
                } catch (fallbackSortError) {
                    console.error("Error applying fallback sort:", fallbackSortError);
                }
            }
        }
    }

    try {
        const snapshot = await query.get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${products.length} products.`);

        // تطبيق فلتر السعر في الكلاينت إذا لم يتم تطبيقه في الاستعلام بسبب قيود الفرز
        // if (sortBy !== 'price' && filters.priceRange && filters.priceRange.min !== undefined && filters.priceRange.max !== undefined) {
        //     products = products.filter(p => p.price >= Number(filters.priceRange.min) && p.price <= Number(filters.priceRange.max));
        //     console.log(`Filtered ${products.length} products by price client-side.`);
        // }

        return products;
    } catch (error) {
        console.error("Error fetching products:", error);
        throw error; // إعادة رمي الخطأ للمعالجة في مكان الاستدعاء
    }
}

/**
 * جلب منتج واحد بواسطة معرفه (ID).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} productId - معرف المنتج.
 * @returns {Promise<object|null>} - كائن المنتج أو null إذا لم يتم العثور عليه.
 */
async function fetchProductById(db, productId) {
    console.log(`Fetching product with ID: ${productId}`);
    try {
        const docRef = db.collection('products').doc(productId);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            console.log("Product data:", docSnap.data());
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such product!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        throw error;
    }
}

/**
 * إضافة طلب جديد إلى Firestore.
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {object} orderData - بيانات الطلب (userId, items, totalAmount, shippingAddress, paymentMethod, etc.).
 * @returns {Promise<string>} - معرف الطلب الجديد.
 */
async function addOrder(db, orderData) {
    console.log("Adding new order:", orderData);
    if (!orderData.userId || !orderData.items || orderData.items.length === 0 || !orderData.totalAmount || !orderData.shippingAddress) {
        throw new Error("بيانات الطلب غير مكتملة.");
    }
    try {
        const docRef = await db.collection('orders').add({
            ...orderData,
            status: 'pending', // الحالة الأولية للطلب
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // تاريخ إنشاء الطلب
        });
        console.log("Order added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding order: ", error);
        throw error;
    }
}

/**
 * جلب طلبات مستخدم معين.
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} userId - معرف المستخدم.
 * @returns {Promise<Array<object>>} - مصفوفة من كائنات الطلبات مرتبة حسب تاريخ الإنشاء (الأحدث أولاً).
 */
async function fetchUserOrders(db, userId) {
    console.log(`Fetching orders for user ID: ${userId}`);
    if (!userId) throw new Error("User ID is required to fetch orders.");
    try {
        const query = db.collection('orders')
                        .where('userId', '==', userId)
                        .orderBy('createdAt', 'desc'); // فرز الطلبات لعرض الأحدث أولاً
        const snapshot = await query.get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${orders.length} orders for user ${userId}.`);
        return orders;
    } catch (error) {
        console.error("Error fetching user orders:", error);
        throw error;
    }
}

/**
 * جلب طلب واحد بواسطة معرفه (ID).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} orderId - معرف الطلب.
 * @returns {Promise<object|null>} - كائن الطلب أو null إذا لم يتم العثور عليه.
 */
async function fetchOrderById(db, orderId) {
    console.log(`Fetching order with ID: ${orderId}`);
    try {
        const docRef = db.collection('orders').doc(orderId);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            console.log("Order data:", docSnap.data());
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such order!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching order by ID:", error);
        throw error;
    }
}

/**
 * إضافة رسالة محادثة إلى طلب معين.
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} orderId - معرف الطلب.
 * @param {string} senderId - معرف المرسل (المستخدم أو الأدمن).
 * @param {string} text - نص الرسالة.
 * @returns {Promise<void>}
 */
async function addChatMessageToOrder(db, orderId, senderId, text) {
    console.log(`Adding chat message to order ${orderId} from ${senderId}`);
    if (!orderId || !senderId || !text) {
        throw new Error("معلومات الرسالة غير مكتملة.");
    }
    try {
        const chatMessagesRef = db.collection('orders').doc(orderId).collection('chatMessages');
        await chatMessagesRef.add({
            senderId: senderId,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Chat message added successfully.");
    } catch (error) {
        console.error("Error adding chat message:", error);
        throw error;
    }
}

/**
 * إضافة منتج جديد (خاص بالأدمن).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {object} productData - بيانات المنتج.
 * @returns {Promise<string>} - معرف المنتج الجديد.
 */
async function addProduct(db, productData) {
    console.log("Adding new product (admin):");
    // يمكن إضافة تحقق إضافي هنا للتأكد من أن المستخدم أدمن قبل السماح بالإضافة
    try {
        const docRef = await db.collection('products').add({
            ...productData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Product added with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding product: ", error);
        throw error;
    }
}

/**
 * تحديث منتج موجود (خاص بالأدمن).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} productId - معرف المنتج المراد تحديثه.
 * @param {object} productData - البيانات الجديدة للمنتج.
 * @returns {Promise<void>}
 */
async function updateProduct(db, productId, productData) {
    console.log(`Updating product ${productId} (admin):`);
    try {
        const productRef = db.collection('products').doc(productId);
        await productRef.update({
            ...productData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Product updated successfully.");
    } catch (error) {
        console.error("Error updating product: ", error);
        throw error;
    }
}

/**
 * حذف منتج (خاص بالأدمن).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} productId - معرف المنتج المراد حذفه.
 * @returns {Promise<void>}
 */
async function deleteProduct(db, productId) {
    console.log(`Deleting product ${productId} (admin):`);
    try {
        const productRef = db.collection('products').doc(productId);
        await productRef.delete();
        console.log("Product deleted successfully.");
        // ملاحظة: قد تحتاج أيضًا لحذف الصورة المرتبطة من Storage هنا
    } catch (error) {
        console.error("Error deleting product: ", error);
        throw error;
    }
}

/**
 * جلب جميع الطلبات (خاص بالأدمن).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} statusFilter - (اختياري) فلترة حسب حالة الطلب.
 * @returns {Promise<Array<object>>} - مصفوفة من كائنات الطلبات.
 */
async function fetchAllOrders(db, statusFilter = null) {
    console.log(`Fetching all orders (admin)${statusFilter ? ' with status: ' + statusFilter : ''}`);
    let query = db.collection('orders');
    if (statusFilter) {
        query = query.where('status', '==', statusFilter);
    }
    query = query.orderBy('createdAt', 'desc'); // الأحدث أولاً

    try {
        const snapshot = await query.get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${orders.length} orders.`);
        return orders;
    } catch (error) {
        console.error("Error fetching all orders:", error);
        throw error;
    }
}

/**
 * تحديث حالة طلب (خاص بالأدمن).
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} orderId - معرف الطلب.
 * @param {string} newStatus - الحالة الجديدة للطلب ('processing', 'shipped', 'delivered', 'cancelled').
 * @returns {Promise<void>}
 */
async function updateOrderStatus(db, orderId, newStatus) {
    console.log(`Updating status for order ${orderId} to ${newStatus} (admin):`);
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error("حالة الطلب غير صالحة.");
    }
    try {
        const orderRef = db.collection('orders').doc(orderId);
        await orderRef.update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Order status updated successfully.");
    } catch (error) {
        console.error("Error updating order status: ", error);
        throw error;
    }
}

// --- وظائف التحقق من الأدمن --- (جديد)

/**
 * التحقق مما إذا كان المستخدم الحالي هو أدمن.
 * الطريقة: البحث عن معرف المستخدم في مجموعة 'admins'.
 * @param {firebase.firestore.Firestore} db - كائن قاعدة بيانات Firestore.
 * @param {string} userId - معرف المستخدم للتحقق منه.
 * @returns {Promise<boolean>} - true إذا كان المستخدم أدمن، false خلاف ذلك.
 */
async function checkIfAdmin(db, userId) {
    if (!userId) {
        console.log("User ID not provided for admin check.");
        return false; // لا يمكن أن يكون أدمن بدون معرف
    }
    console.log(`Checking admin status for user ID: ${userId}`);
    try {
        const adminDocRef = db.collection('admins').doc(userId);
        const adminDocSnap = await adminDocRef.get();

        if (adminDocSnap.exists) {
            console.log(`User ${userId} is an admin.`);
            return true;
        } else {
            console.log(`User ${userId} is NOT an admin.`);
            return false;
        }
    } catch (error) {
        console.error("Error checking admin status:", error);
        // في حالة الخطأ، نفترض أنه ليس أدمن كإجراء احترازي
        return false;
    }
}

// --- نهاية وظائف التحقق من الأدمن ---

