/* ============================================================
   🧠 منطق التطبيق — سحب وإفلات، تحقق، فوز
   ============================================================ */

(function() {
  const dropZone   = document.getElementById('dropZone');
  const itemsPool  = document.getElementById('itemsPool');
  const resultMsg  = document.getElementById('resultMsg');
  const resetBtn   = document.getElementById('resetBtn');
  const checkBtn   = document.getElementById('checkBtn');
  const exitBtn    = document.getElementById('exitBtn');
  const lessonName = document.getElementById('lessonName');
  const winOverlay = document.getElementById('winOverlay');
  const clickSound = document.getElementById('clickSound');

  if (lessonName) lessonName.textContent = CONFIG.id;

  let draggedItem = null;
  let dragSourceSlot = null;

  /* ---------- بناء الواجهة ---------- */
  function render() {
    dropZone.innerHTML = '';
    itemsPool.innerHTML = '';

    const shuffled = [...CONFIG.items].sort(() => Math.random() - 0.5);

    CONFIG.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'question-row';

      const label = document.createElement('div');
      label.className = 'question-label';
      label.textContent = item.label;

      const slot = document.createElement('div');
      slot.className = 'drop-slot';
      slot.dataset.correctId = item.id;
      slot.dataset.slotIndex = index;

      slot.addEventListener('dragover',  handleDragOver);
      slot.addEventListener('dragleave', handleDragLeave);
      slot.addEventListener('drop',      handleDrop);

      slot.addEventListener('touchstart', handleTouchStart, { passive: false });
      slot.addEventListener('touchmove',  handleTouchMove,  { passive: false });
      slot.addEventListener('touchend',   handleTouchEnd);

      row.appendChild(label);
      row.appendChild(slot);
      dropZone.appendChild(row);
    });

    shuffled.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'item-slot';
      slot.dataset.itemId = item.id;

      const dragEl = document.createElement('div');
      dragEl.className = 'drag-item';
      dragEl.textContent = item.text;
      dragEl.draggable = true;
      dragEl.dataset.itemId = item.id;

      dragEl.addEventListener('dragstart', handleDragStart);
      dragEl.addEventListener('dragend',   handleDragEnd);

      dragEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      dragEl.addEventListener('touchmove',  handleTouchMove,  { passive: false });
      dragEl.addEventListener('touchend',   handleTouchEnd);

      slot.appendChild(dragEl);
      itemsPool.appendChild(slot);
    });

    resultMsg.textContent = '';
    resultMsg.classList.remove('error');
    winOverlay.classList.remove('show');
  }

  /* ---------- ✅ تحديث حالة الفراغات والمخزون ---------- */
  function updateSlotsState() {
    document.querySelectorAll('.drop-slot').forEach(slot => {
      if (slot.querySelector('.drag-item')) {
        slot.classList.add('filled');
      } else {
        slot.classList.remove('filled');
      }
    });

    document.querySelectorAll('.item-slot').forEach(slot => {
      if (slot.querySelector('.drag-item')) {
        slot.classList.remove('taken');
      } else {
        slot.classList.add('taken');
      }
    });
  }

  /* ---------- HTML5 Drag & Drop ---------- */
  function handleDragStart(e) {
    const dragEl = e.target.closest('.drag-item');
    if (!dragEl) return;

    draggedItem = dragEl;
    dragSourceSlot = dragEl.parentElement;

    e.dataTransfer.setData('text/plain', dragEl.dataset.itemId);
    e.dataTransfer.effectAllowed = 'move';

    setTimeout(() => dragEl.classList.add('dragging'), 0);
  }

  function handleDragEnd(e) {
    const dragEl = e.target.closest('.drag-item');
    if (dragEl) dragEl.classList.remove('dragging');

    if (dragEl && !dragEl.dataset.dropped) {
      const itemId = dragEl.dataset.itemId;
      const originalSlot = document.querySelector(`.item-slot[data-item-id="${itemId}"]`);
      if (originalSlot) {
        originalSlot.appendChild(dragEl);
      }
    }

    if (dragEl) delete dragEl.dataset.dropped;

    draggedItem = null;
    dragSourceSlot = null;

    document.querySelectorAll('.drop-slot.drag-over')
      .forEach(el => el.classList.remove('drag-over'));

    updateSlotsState();
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const slot = e.target.closest('.drop-slot');
    if (slot) slot.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    const slot = e.target.closest('.drop-slot');
    if (slot) slot.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    const slot = e.target.closest('.drop-slot');
    if (!slot) return;

    slot.classList.remove('drag-over');

    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;

    const dragEl = document.querySelector(`.drag-item[data-item-id="${itemId}"]`);
    if (!dragEl) return;

    placeItemInSlot(dragEl, slot);
  }

  /* ---------- Touch (للموبايل) ---------- */
  let touchDraggedItem = null;
  let touchOffsetX = 0, touchOffsetY = 0;
  let touchClone = null;

  function handleTouchStart(e) {
    const dragEl = e.target.closest('.drag-item');
    if (!dragEl) return;

    e.preventDefault();

    touchDraggedItem = dragEl;
    const rect = dragEl.getBoundingClientRect();

    touchOffsetX = e.touches[0].clientX - rect.left;
    touchOffsetY = e.touches[0].clientY - rect.top;

    touchClone = dragEl.cloneNode(true);
    Object.assign(touchClone.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      zIndex: '10000',
      pointerEvents: 'none',
      opacity: '0.8',
      transform: 'scale(1.05)'
    });
    document.body.appendChild(touchClone);

    dragEl.style.opacity = '0.3';
  }

  function handleTouchMove(e) {
    if (!touchDraggedItem || !touchClone) return;
    e.preventDefault();

    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchOffsetX) + 'px';
    touchClone.style.top  = (touch.clientY - touchOffsetY) + 'px';

    document.querySelectorAll('.drop-slot.drag-over')
      .forEach(el => el.classList.remove('drag-over'));

    const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = elUnder?.closest('.drop-slot');
    if (slot) slot.classList.add('drag-over');
  }

  function handleTouchEnd(e) {
    if (!touchDraggedItem) return;

    if (touchClone) { touchClone.remove(); touchClone = null; }
    touchDraggedItem.style.opacity = '';

    document.querySelectorAll('.drop-slot.drag-over')
      .forEach(el => el.classList.remove('drag-over'));

    const touch = e.changedTouches[0];
    const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = elUnder?.closest('.drop-slot');

    if (slot) {
      placeItemInSlot(touchDraggedItem, slot);
    } else {
      const itemId = touchDraggedItem.dataset.itemId;
      const originalSlot = document.querySelector(`.item-slot[data-item-id="${itemId}"]`);
      if (originalSlot) {
        originalSlot.appendChild(touchDraggedItem);
      }
      updateSlotsState();
    }

    touchDraggedItem = null;
  }

  /* ---------- وضع العنصر في الخانة (مع التبديل) ---------- */
  function placeItemInSlot(dragEl, slot) {
    const existing = slot.querySelector('.drag-item');
    if (existing && existing !== dragEl) {
      const currentParent = dragEl.parentElement;

      if (currentParent && currentParent.classList.contains('drop-slot')) {
        currentParent.appendChild(existing);
      } else {
        const existingId = existing.dataset.itemId;
        const originalSlot = document.querySelector(`.item-slot[data-item-id="${existingId}"]`);
        if (originalSlot) {
          originalSlot.appendChild(existing);
        }
      }
    }

    slot.appendChild(dragEl);
    dragEl.dataset.dropped = 'true';

    draggedItem = null;
    dragSourceSlot = null;

    updateSlotsState();
  }

  /* ---------- إعادة تعيين ---------- */
  function resetExercise() {
    document.querySelectorAll('.drop-slot .drag-item').forEach(dragEl => {
      const itemId = dragEl.dataset.itemId;
      const originalSlot = document.querySelector(`.item-slot[data-item-id="${itemId}"]`);
      if (originalSlot) {
        originalSlot.appendChild(dragEl);
      }
    });

    document.querySelectorAll('.drop-slot').forEach(s => s.classList.remove('drag-over'));
    updateSlotsState();

    resultMsg.textContent = '';
    resultMsg.classList.remove('error');
    winOverlay.classList.remove('show');
  }

  /* ---------- التحقق ---------- */
  function checkAnswers() {
    const slots = document.querySelectorAll('.drop-slot');
    let allFilled = true;
    let allCorrect = true;

    slots.forEach(slot => {
      const dragEl = slot.querySelector('.drag-item');
      if (!dragEl) { allFilled = false; allCorrect = false; return; }
      if (dragEl.dataset.itemId !== slot.dataset.correctId) allCorrect = false;
    });

    if (!allFilled) {
      resultMsg.textContent = CONFIG.emptyMessage;
      resultMsg.classList.add('error');
      return;
    }

    if (allCorrect) {
      resultMsg.textContent = CONFIG.successMessage;
      resultMsg.classList.remove('error');
      saveProgress();
      showWinOverlay();

      setTimeout(() => {
        if (CONFIG.successRedirectUrl) window.location.href = CONFIG.successRedirectUrl;
      }, CONFIG.successRedirectDelay);
    } else {
      resultMsg.textContent = CONFIG.retryMessage;
      resultMsg.classList.add('error');
    }
  }

  /* ---------- حفظ التقدم ---------- */
  function saveProgress() {
    try {
      let count = parseInt(localStorage.getItem(CONFIG.exercisesStagesKey) || '0');
      count += 1;
      localStorage.setItem(CONFIG.exercisesStagesKey, count);

      let solved = JSON.parse(localStorage.getItem(CONFIG.solvedListKey) || '[]');
      if (!solved.includes(CONFIG.id)) {
        solved.push(CONFIG.id);
        localStorage.setItem(CONFIG.solvedListKey, JSON.stringify(solved));
      }
    } catch (e) {
      console.warn('⚠️ لا يمكن حفظ التقدم:', e);
    }
  }

  /* ---------- تأثير الفوز ---------- */
  function showWinOverlay() {
    winOverlay.classList.add('show');
    document.querySelectorAll('.confetti').forEach(el => el.remove());

    const colors = ['#ffd54f', '#ff8a65', '#4fc3f7', '#aed581', '#f06292', '#ba68c8'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (Math.random() * 2 + 2) + 's';
      c.style.animationDelay = (Math.random() * 1.5) + 's';
      c.style.width  = (Math.random() * 8 + 6) + 'px';
      c.style.height = (Math.random() * 12 + 8) + 'px';
      winOverlay.appendChild(c);
      setTimeout(() => c.remove(), 5000);
    }
  }

  /* ---------- الأحداث ---------- */
  resetBtn.addEventListener('click', resetExercise);
  checkBtn.addEventListener('click', checkAnswers);

  exitBtn.addEventListener('click', () => {
    if (confirm(CONFIG.exitConfirmMessage)) {
      window.location.href = CONFIG.exitUrl;
    }
  });

  document.addEventListener('dragstart', (e) => {
    if (!e.target.closest('.drag-item')) e.preventDefault();
  });

  /* 🔊 صوت لكل الأزرار */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }
  }, true);

  /* ---------- تشغيل ---------- */
  render();
})();