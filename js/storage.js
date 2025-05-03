// ملف وظائف التفاعل مع Firebase Storage (لتخزين الملفات مثل الصور)

/**
 * رفع ملف (مثل صورة منتج) إلى Firebase Storage.
 * @param {firebase.storage.Storage} storage - كائن Firebase Storage.
 * @param {File} file - الملف المراد رفعه.
 * @param {string} path - المسار داخل Storage لحفظ الملف (مثل 'product_images/image_name.jpg').
 * @param {function} [onProgress] - (اختياري) دالة callback لتتبع تقدم الرفع (تستقبل نسبة التقدم 0-100).
 * @returns {Promise<string>} بروميس يحتوي على رابط التحميل للملف المرفوع (download URL).
 */
async function uploadFileToStorage(storage, file, path, onProgress) {
    console.log(`Uploading file ${file.name} to path: ${path}`);
    const storageRef = storage.ref();
    const fileRef = storageRef.child(path);

    return new Promise((resolve, reject) => {
        const uploadTask = fileRef.put(file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // تتبع تقدم الرفع
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
                if (onProgress && typeof onProgress === 'function') {
                    onProgress(progress);
                }
                switch (snapshot.state) {
                    case firebase.storage.TaskState.PAUSED: // أو 'paused'
                        console.log('Upload is paused');
                        break;
                    case firebase.storage.TaskState.RUNNING: // أو 'running'
                        console.log('Upload is running');
                        break;
                }
            },
            (error) => {
                // معالجة الأخطاء
                console.error("Error uploading file:", error);
                // يمكنك تخصيص رسائل الخطأ بناءً على نوع الخطأ
                // switch (error.code) {
                //     case 'storage/unauthorized':
                //         reject(new Error(" المستخدم غير مصرح له بالرفع."));
                //         break;
                //     case 'storage/canceled':
                //         reject(new Error(" تم إلغاء عملية الرفع."));
                //         break;
                //     // ... حالات خطأ أخرى
                //     default:
                //         reject(new Error(" حدث خطأ غير متوقع أثناء رفع الملف."));
                //         break;
                // }
                reject(error); // إرجاع الخطأ الأصلي
            },
            async () => {
                // اكتمل الرفع بنجاح، الحصول على رابط التحميل
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('File available at', downloadURL);
                    resolve(downloadURL);
                } catch (error) {
                    console.error("Error getting download URL:", error);
                    reject(error);
                }
            }
        );
    });
}

/**
 * حذف ملف من Firebase Storage.
 * @param {firebase.storage.Storage} storage - كائن Firebase Storage.
 * @param {string} path - المسار الكامل للملف داخل Storage المراد حذفه.
 * @returns {Promise<void>} بروميس ينتهي عند اكتمال الحذف.
 */
async function deleteFileFromStorage(storage, path) {
    console.log(`Deleting file from path: ${path}`);
    const storageRef = storage.ref();
    const fileRef = storageRef.child(path);

    try {
        await fileRef.delete();
        console.log(`File at ${path} deleted successfully.`);
    } catch (error) {
        // معالجة الخطأ إذا كان الملف غير موجود أو حدث خطأ آخر
        if (error.code === 'storage/object-not-found') {
            console.warn(`File at ${path} not found, skipping deletion.`);
        } else {
            console.error("Error deleting file from storage:", error);
            throw error; // رمي الخطأ لمعالجته في مكان آخر إذا لزم الأمر
        }
    }
}

/**
 * الحصول على مسار الملف من رابط التحميل (Download URL).
 * هذه الدالة مفيدة إذا كنت تحتاج لحذف ملف بناءً على رابطه المحفوظ في Firestore.
 * @param {string} downloadUrl - رابط التحميل للملف.
 * @returns {string|null} مسار الملف داخل Storage أو null إذا لم يتمكن من استخراجه.
 */
function getPathFromDownloadUrl(downloadUrl) {
    try {
        // الرابط عادة ما يكون بهذا الشكل:
        // https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.appspot.com/o/PATH_TO_FILE?alt=media&token=TOKEN
        const url = new URL(downloadUrl);
        // استخراج المسار المشفر (URL encoded)
        const encodedPath = url.pathname.split('/o/')[1].split('?')[0];
        // فك تشفير المسار
        const decodedPath = decodeURIComponent(encodedPath);
        return decodedPath;
    } catch (error) {
        console.error("Error extracting path from download URL:", error, downloadUrl);
        return null;
    }
}


// مثال لكيفية استخدام دالة الرفع (عادة يكون داخل معالج حدث تغيير حقل الإدخال أو إرسال النموذج)
/*
async function handleImageUpload(fileInputId, storagePathPrefix) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        console.warn("No file selected for upload.");
        return null;
    }

    const file = fileInput.files[0];
    const fileName = `${storagePathPrefix}/${Date.now()}_${file.name}`; // إضافة timestamp لضمان اسم فريد
    const storage = firebase.storage();

    try {
        // عرض مؤشر التقدم للمستخدم
        showUploadProgress(true);
        const downloadURL = await uploadFileToStorage(storage, file, fileName, (progress) => {
            updateUploadProgress(progress); // دالة لتحديث واجهة المستخدم بنسبة التقدم
        });
        showUploadProgress(false);
        console.log("Upload finished. Download URL:", downloadURL);
        return downloadURL;
    } catch (error) {
        showUploadProgress(false);
        showUserMessage("upload-error-placeholder", "فشل رفع الصورة. يرجى المحاولة مرة أخرى.", "error");
        return null;
    }
}
*/

