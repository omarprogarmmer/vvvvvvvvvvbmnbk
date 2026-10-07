/* ============================================================
   🚀 التشغيل
   ============================================================ */

document.getElementById('lessonName').textContent = CONFIG.id;

document.getElementById('exitBtn').onclick = () => {
  if (confirm(CONFIG.exitConfirmMessage)) {
    window.location.href = CONFIG.exitUrl;
  }
};

const dropZone   = document.getElementById('dropZone');
const itemsPool  = document.getElementById('itemsPool');
const checkBtn   = document.getElementById('checkBtn');
const resetBtn   = document.getElementById('resetBtn');
const resultMsg  = document.getElementById('resultMsg');
const winOverlay = document.getElementById('winOverlay');

/* 🏗️ بناء منطقة الإفلات */
function buildDropZone() {
  dropZone.innerHTML = '';
  CONFIG.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'question-row';

    const label = document.createElement('div');
    label.className = 'question-label';
    label.textContent = item.label;

    const slot = document.createElement('div');
    slot.className = 'drop-slot';
    slot.dataset.slotId = item.id;

    row.appendChild(label);
    row.appendChild(slot);
    dropZone.appendChild(row);
  });
}

/* 🏗️ بناء العناصر */
function buildItems() {
  itemsPool.innerHTML = '';
  const shuffled = [...CONFIG.items].sort(() => Math.random() - 0.5);

  shuffled.forEach(item => {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    slot.dataset.slotId = item.id;

    const el = document.createElement('div');
    el.className = 'drag-item';
    el.draggable = true;
    el.dataset.itemId = item.id;
    el.dataset.target = item.id;
    el.textContent = item.text;

    slot.appendChild(el);
    itemsPool.appendChild(slot);
    attachDragEvents(el);
  });
}

/* 🖱️ أحداث السحب */
let draggedItem = null;

function attachDragEvents(el) {
  el.addEventListener('dragstart', (e) => {
    draggedItem = el;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.dataset.itemId);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    draggedItem = null;
  });

  el.addEventListener('touchstart', handleTouchStart, { passive: false });
  el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
  el.addEventListener('touchend',   handleTouchEnd);
}

/* 🎯 إعداد مناطق الإفلات */
function setupDropSlots() {
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const slot = e.target.closest('.drop-slot');
    document.querySelectorAll('.drop-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
    if (slot && !slot.classList.contains('filled')) {
      slot.classList.add('drag-over');
    }
  });

  document.addEventListener('dragleave', (e) => {
    const slot = e.target.closest('.drop-slot');
    if (slot) slot.classList.remove('drag-over');
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    document.querySelectorAll('.drop-slot.drag-over').forEach(s => s.classList.remove('drag-over'));

    if (!draggedItem) return;

    const slot = e.target.closest('.drop-slot');

    if (slot) {
      placeItemInSlot(draggedItem, slot);
    } else {
      returnItemToPool(draggedItem);
    }
  });
}

/* 👆 دعم اللمس */
let touchClone = null;

function handleTouchStart(e) {
  const el = e.currentTarget;
  draggedItem = el;

  const touch = e.touches[0];
  touchClone = el.cloneNode(true);
  touchClone.style.position = 'fixed';
  touchClone.style.zIndex = '9999';
  touchClone.style.pointerEvents = 'none';
  touchClone.style.opacity = '0.85';
  touchClone.style.transform = 'scale(1.05)';
  touchClone.style.left = (touch.clientX - el.offsetWidth / 2) + 'px';
  touchClone.style.top  = (touch.clientY - el.offsetHeight / 2) + 'px';
  touchClone.style.width = el.offsetWidth + 'px';
  touchClone.style.height = el.offsetHeight + 'px';
  document.body.appendChild(touchClone);

  el.style.opacity = '0.3';
  e.preventDefault();
}

function handleTouchMove(e) {
  if (!touchClone) return;
  const touch = e.touches[0];
  touchClone.style.left = (touch.clientX - touchClone.offsetWidth / 2) + 'px';
  touchClone.style.top  = (touch.clientY - touchClone.offsetHeight / 2) + 'px';

  touchClone.style.display = 'none';
  const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.style.display = '';

  const slot = elBelow?.closest('.drop-slot');
  document.querySelectorAll('.drop-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
  if (slot && !slot.classList.contains('filled')) {
    slot.classList.add('drag-over');
  }

  e.preventDefault();
}

function handleTouchEnd(e) {
  if (!touchClone || !draggedItem) return;

  const touch = e.changedTouches[0];
  touchClone.style.display = 'none';
  const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.remove();
  touchClone = null;

  document.querySelectorAll('.drop-slot.drag-over').forEach(s => s.classList.remove('drag-over'));

  const slot = elBelow?.closest('.drop-slot');

  if (slot) {
    placeItemInSlot(draggedItem, slot);
  } else {
    returnItemToPool(draggedItem);
  }

  draggedItem.style.opacity = '';
  draggedItem = null;
}

/* 📦 وضع العنصر داخل المربع */
function placeItemInSlot(item, slot) {
  const itemId = item.dataset.itemId;
  const isFromAnotherSlot = item.parentElement.classList.contains('drop-slot');
  const sourceSlot = isFromAnotherSlot ? item.parentElement : null;

  const existing = slot.querySelector('.drag-item');

  if (existing && isFromAnotherSlot) {
    existing.remove();
    item.remove();

    slot.classList.remove('filled');
    sourceSlot.classList.remove('filled');

    item.classList.remove('dragging');
    item.style.opacity = '';
    slot.appendChild(item);
    slot.classList.add('filled');

    existing.classList.remove('dragging');
    existing.style.opacity = '';
    sourceSlot.appendChild(existing);
    sourceSlot.classList.add('filled');

    updateTakenMarks();
    resultMsg.textContent = '';
    return;
  }

  if (existing) {
    returnItemToPool(existing);
  }

  if (isFromAnotherSlot) {
    const originalSlot = itemsPool.querySelector(
      `.item-slot[data-slot-id="${itemId}"]`
    );
    if (originalSlot) originalSlot.classList.remove('taken');
    sourceSlot.classList.remove('filled');
  }

  let finalItem;
  if (isFromAnotherSlot) {
    finalItem = item;
    finalItem.classList.remove('dragging');
    finalItem.style.opacity = '';
  } else {
    finalItem = item.cloneNode(true);
    finalItem.classList.remove('dragging');
    finalItem.style.opacity = '';
    finalItem.draggable = true;
    finalItem.dataset.itemId = itemId;
    finalItem.dataset.target = item.dataset.target;
    attachDragEvents(finalItem);
  }

  slot.textContent = '';
  slot.appendChild(finalItem);
  slot.classList.add('filled');

  updateTakenMarks();
  resultMsg.textContent = '';
}

/* 📦 إرجاع العنصر للمخزن */
function returnItemToPool(item) {
  const itemId = item.dataset.itemId;

  if (item.parentElement.classList.contains('drop-slot')) {
    const parentSlot = item.parentElement;
    parentSlot.classList.remove('filled');
    item.remove();
  } else {
    item.style.opacity = '';
  }

  updateTakenMarks();
  resultMsg.textContent = '';
}

/* 🎨 تحديث علامات "taken" */
function updateTakenMarks() {
  document.querySelectorAll('.item-slot').forEach(s => s.classList.remove('taken'));

  document.querySelectorAll('.drop-slot .drag-item').forEach(item => {
    const id = item.dataset.itemId;
    const originalSlot = itemsPool.querySelector(
      `.item-slot[data-slot-id="${id}"]`
    );
    if (originalSlot) originalSlot.classList.add('taken');
  });
}

/* 🔄 زر الإعادة */
resetBtn.onclick = () => {
  if (CONFIG.resetConfirmMessage) {
    if (!confirm(CONFIG.resetConfirmMessage)) return;
  }

  document.querySelectorAll('.drop-slot').forEach(slot => {
    const item = slot.querySelector('.drag-item');
    if (item) item.remove();
    slot.classList.remove('filled');
    slot.classList.remove('drag-over');
  });

  document.querySelectorAll('.item-slot').forEach(slot => {
    slot.classList.remove('taken');
  });

  document.querySelectorAll('.item-slot .drag-item').forEach(item => {
    item.style.opacity = '';
  });

  resultMsg.textContent = '';
  resultMsg.className = 'result-msg';
};

/* ============================================================
   🏆 تسجيل التمرين
   ============================================================ */

function markAsSolved(exerciseId) {
  try {
    let solvedList = [];
    try {
      solvedList = JSON.parse(localStorage.getItem(CONFIG.solvedListKey) || "[]");
    } catch (_) {
      solvedList = [];
    }

    if (solvedList.includes(exerciseId)) {
      console.log("🔒 تم حل هذا التمرين من قبل:", exerciseId);
      return { alreadySolved: true, total: parseInt(localStorage.getItem(CONFIG.exercisesStagesKey) || "0", 10) };
    }

    solvedList.push(exerciseId);
    localStorage.setItem(CONFIG.solvedListKey, JSON.stringify(solvedList));

    const current  = parseInt(localStorage.getItem(CONFIG.exercisesStagesKey) || "0", 10);
    const newCount = current + 1;
    localStorage.setItem(CONFIG.exercisesStagesKey, String(newCount));

    localStorage.setItem("last_completed_stage", String(CONFIG.stageNumber));
    localStorage.setItem("last_completed_stage_id", exerciseId);

    console.log("✅ تم تسجيل التمرين:", exerciseId, "| الإجمالي:", newCount);
    return { alreadySolved: false, total: newCount };

  } catch (e) {
    console.error("markAsSolved error:", e);
    return { alreadySolved: false, total: 0 };
  }
}

/* ============================================================
   🎉 تشغيل تأثير الفوز
   ============================================================ */

function showWinCelebration(callback) {

  const winTextEl = winOverlay.querySelector('.win-text');
  winTextEl.textContent = CONFIG.winText;

  createConfetti(winOverlay);

  winOverlay.classList.add('show');

  setTimeout(() => {
    winOverlay.classList.remove('show');
    if (typeof callback === 'function') callback();
  }, CONFIG.winDuration);
}

/* 🎊 إنشاء قصاصات الاحتفال */
function createConfetti(container) {
  const colors = ['#ffd54f', '#ff7043', '#4caf50', '#42a5f5', '#ab47bc', '#ffffff'];
  const count = 60;

  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    c.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
    container.appendChild(c);

    setTimeout(() => c.remove(), 4000);
  }
}

/* ✅ زر التحقق */
checkBtn.onclick = () => {
  const slots = document.querySelectorAll('.drop-slot');
  let allCorrect = true;
  let allFilled  = true;

  slots.forEach(slot => {
    const item = slot.querySelector('.drag-item');

    if (!item) {
      allFilled = false;
      return;
    }

    if (item.dataset.target !== slot.dataset.slotId) {
      allCorrect = false;
    }
  });

  if (!allFilled) {
    resultMsg.textContent = CONFIG.emptyMessage;
    resultMsg.className = 'result-msg error';
    return;
  }

  if (allCorrect) {
    resultMsg.textContent = CONFIG.successMessage;
    resultMsg.className = 'result-msg success';

    if (CONFIG.id) markAsSolved(CONFIG.id);

    checkBtn.disabled = true;

    if (CONFIG.successRedirectUrl) {
      showWinCelebration(() => {
        window.location.href = CONFIG.successRedirectUrl;
      });
    }

  } else {
    resultMsg.textContent = CONFIG.retryMessage;
    resultMsg.className = 'result-msg error';
  }
    /* 🔊 صوت لكل الأزرار */
  const clickSound = document.getElementById('clickSound');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }, true);
};

/* 🚀 التشغيل */
buildDropZone();
buildItems();
setupDropSlots();