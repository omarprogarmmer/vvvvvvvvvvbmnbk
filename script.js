let namesList = JSON.parse(localStorage.getItem('namesList')) || []; // استرجاع الأسماء من LocalStorage إذا كانت موجودة، أو إنشاء مصفوفة فارغة

function addName() {
  const nameInput = document.getElementById('nameInput');
  const name = nameInput.value.trim();

  if (name) {
    namesList.push(name);
    nameInput.value = '';  // مسح الحقل بعد إضافة الاسم
    saveNamesToLocalStorage();  // حفظ الأسماء في LocalStorage
    renderNamesList();  // إعادة رسم القائمة
  }
}

function deleteName(index) {
  namesList.splice(index, 1);  // حذف الاسم من المصفوفة
  saveNamesToLocalStorage();  // حفظ الأسماء بعد الحذف في LocalStorage
  renderNamesList();  // إعادة رسم القائمة
}

function renderNamesList() {
  const namesListContainer = document.getElementById('namesList');
  namesListContainer.innerHTML = '';  // مسح محتويات القائمة الحالية

  namesList.forEach((name, index) => {
    const listItem = document.createElement('li');
    listItem.classList.add('name-item');

    listItem.innerHTML = `
      <span>${name}</span>
      <button class="button button-danger" onclick="deleteName(${index})">حذف</button>
    `;

    namesListContainer.appendChild(listItem);  // إضافة العنصر إلى القائمة
  });
}

// حفظ الأسماء في LocalStorage
function saveNamesToLocalStorage() {
  localStorage.setItem('namesList', JSON.stringify(namesList));  // تحويل الأسماء إلى نص وحفظها
}

// تسجيل Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js") // تأكد من أن المسار صحيح
    .then(() => console.log("Service Worker Registered"))
    .catch(error => console.error("Service Worker Registration Failed", error));
}

// عند تحميل الصفحة، استرجاع الأسماء وعرضها
window.onload = function() {
  renderNamesList();  // استرجاع الأسماء من LocalStorage وعرضها عند تحميل الصفحة
};
