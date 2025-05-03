// ملف وظائف سلة التسوق (Cart)

const CART_STORAGE_KEY = "albordastore_cart";

/**
 * جلب عناصر سلة التسوق من Local Storage.
 * @returns {Array<object>} مصفوفة من عناصر السلة.
 */
function getCartItems() {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    try {
        const cart = cartJson ? JSON.parse(cartJson) : [];
        // التأكد من أن كل عنصر يحتوي على الكمية والسعر
        return cart.map(item => ({
            ...item,
            quantity: item.quantity || 1, // قيمة افتراضية للكمية
            price: item.price || 0 // قيمة افتراضية للسعر
        }));
    } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
        localStorage.removeItem(CART_STORAGE_KEY); // إزالة البيانات التالفة
        return [];
    }
}

/**
 * حفظ عناصر سلة التسوق في Local Storage.
 * @param {Array<object>} cartItems - مصفوفة عناصر السلة الجديدة.
 */
function saveCartItems(cartItems) {
    try {
        // التأكد من عدم حفظ قيم غير ضرورية أو دوال
        const itemsToSave = cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image, // حفظ رابط الصورة إذا كان متاحاً
            size: item.size // حفظ المقاس إذا كان متاحاً
            // أضف أي خصائص أخرى تريد حفظها
        }));
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itemsToSave));
        updateCartCount(); // تحديث عدد العناصر في الهيدر بعد الحفظ
    } catch (error) {
        console.error("Error saving cart to localStorage:", error);
    }
}

/**
 * إضافة منتج إلى سلة التسوق أو تحديث كميته.
 * @param {object} product - المنتج المراد إضافته (يجب أن يحتوي على id, name, price).
 * @param {number} quantity - الكمية المراد إضافتها (افتراضي 1).
 * @param {string} [size] - المقاس المختار (اختياري).
 */
function addToCart(product, quantity = 1, size = null) {
    console.log(`Adding product ${product.id} (Qty: ${quantity}, Size: ${size}) to cart.`);
    if (!product || !product.id || !product.name || typeof product.price !== 'number') {
        console.error("Invalid product data provided to addToCart:", product);
        showUserMessage("cart-message-placeholder", "خطأ: بيانات المنتج غير صالحة.", "error"); // افترض وجود عنصر لعرض الرسالة
        return;
    }

    const cartItems = getCartItems();
    // معرف فريد للعنصر في السلة، يأخذ المقاس في الاعتبار
    const cartItemId = size ? `${product.id}_${size}` : product.id;
    const existingItemIndex = cartItems.findIndex(item => (size ? `${item.id}_${item.size}` : item.id) === cartItemId);

    if (existingItemIndex > -1) {
        // المنتج موجود بنفس المقاس (أو لا يوجد مقاس)، قم بزيادة الكمية
        cartItems[existingItemIndex].quantity += quantity;
        console.log(`Updated quantity for item ${cartItemId} to ${cartItems[existingItemIndex].quantity}`);
    } else {
        // منتج جديد أو بنفس المعرف ولكن بمقاس مختلف
        cartItems.push({
            ...product,
            cartItemId: cartItemId, // استخدام المعرف الفريد للسلة
            quantity: quantity,
            size: size // إضافة المقاس للعنصر
        });
        console.log(`Added new item ${cartItemId} to cart.`);
    }

    saveCartItems(cartItems);
    showUserMessage("cart-message-placeholder", `تمت إضافة '${product.name}' إلى السلة بنجاح!`, "success");
}

/**
 * تحديث كمية منتج في سلة التسوق.
 * @param {string} cartItemId - المعرف الفريد للعنصر في السلة (product.id أو product.id_size).
 * @param {number} newQuantity - الكمية الجديدة.
 */
function updateCartItemQuantity(cartItemId, newQuantity) {
    console.log(`Updating quantity for cart item ${cartItemId} to ${newQuantity}`);
    let cartItems = getCartItems();
    const itemIndex = cartItems.findIndex(item => (item.size ? `${item.id}_${item.size}` : item.id) === cartItemId);

    if (itemIndex > -1) {
        if (newQuantity > 0) {
            cartItems[itemIndex].quantity = newQuantity;
        } else {
            // إذا كانت الكمية 0 أو أقل، قم بإزالة العنصر
            cartItems.splice(itemIndex, 1);
            console.log(`Removed item ${cartItemId} due to zero quantity.`);
        }
        saveCartItems(cartItems);
    } else {
        console.warn(`Item with cartItemId ${cartItemId} not found in cart for update.`);
    }
}

/**
 * إزالة منتج من سلة التسوق.
 * @param {string} cartItemId - المعرف الفريد للعنصر في السلة (product.id أو product.id_size).
 */
function removeFromCart(cartItemId) {
    console.log(`Removing item ${cartItemId} from cart.`);
    let cartItems = getCartItems();
    const updatedCart = cartItems.filter(item => (item.size ? `${item.id}_${item.size}` : item.id) !== cartItemId);

    if (updatedCart.length < cartItems.length) {
        saveCartItems(updatedCart);
        console.log(`Item ${cartItemId} removed successfully.`);
        // يمكنك إضافة رسالة تأكيد للمستخدم هنا
    } else {
        console.warn(`Item with cartItemId ${cartItemId} not found in cart for removal.`);
    }
}

/**
 * حساب المجموع الإجمالي لسلة التسوق.
 * @returns {number} المجموع الإجمالي.
 */
function calculateCartTotal() {
    const cartItems = getCartItems();
    const total = cartItems.reduce((sum, item) => {
        // التأكد من أن السعر والكمية أرقام صالحة
        const price = typeof item.price === 'number' ? item.price : 0;
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        return sum + (price * quantity);
    }, 0);
    console.log(`Calculated cart total: ${total}`);
    return total;
}

/**
 * تفريغ سلة التسوق بالكامل.
 */
function clearCart() {
    console.log("Clearing the cart...");
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCount(); // تحديث عدد العناصر في الهيدر
    // يمكنك إعادة تحميل صفحة السلة أو تحديث الواجهة
    if (window.location.pathname.includes("cart.html") || window.location.pathname.includes("checkout.html")) {
        // تحديث الواجهة في صفحات السلة والدفع
        displayCartItems(); // افترض وجود هذه الدالة في صفحة السلة
        updateCheckoutSummary(); // افترض وجود هذه الدالة في صفحة الدفع
    }
}

/**
 * تحديث عدد العناصر المعروض في أيقونة السلة بالهيدر.
 */
function updateCartCount() {
    const cartItems = getCartItems();
    const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const countElement = document.getElementById("cart-item-count");
    if (countElement) {
        countElement.textContent = totalQuantity;
        countElement.classList.toggle("hidden", totalQuantity === 0);
        console.log(`Updated cart count display to: ${totalQuantity}`);
    } else {
        // console.warn("Cart count element not found in the DOM.");
    }
}

// استدعاء تحديث العدد عند تحميل أي صفحة تحتوي على الهيدر
document.addEventListener("DOMContentLoaded", updateCartCount);

