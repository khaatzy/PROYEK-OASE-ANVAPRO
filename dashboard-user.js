    lucide.createIcons();

    // State Variables
    let currentUser = null;
    let userProfile = null;
    let activeSession = null;
    let sessionTimerInterval = null;
    let aiChatHistory = [];

    // Voice Note Recorder Variables
    let mediaRecorder = null;
    let audioChunks = [];
    let recordStartTime = null;
    let recordTimerInterval = null;

    // DOM Elements
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const hamburgerDrawer = document.getElementById('hamburgerDrawer');
    const hamburgerDrawerOverlay = document.getElementById('hamburgerDrawerOverlay');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    const userInitialLabel = document.getElementById('userInitialLabel');
    const userNameLabel = document.getElementById('userNameLabel');
    const userEmailLabel = document.getElementById('userEmailLabel');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const modNotice = document.getElementById('modNotice');

    const notifBellBtn = document.getElementById('notifBellBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    const clearNotifBtn = document.getElementById('clearNotifBtn');

    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const saveApiKeyForm = document.getElementById('saveApiKeyForm');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const requestModBtn = document.getElementById('requestModBtn');
    const logoutDrawerBtn = document.getElementById('logoutDrawerBtn');

    const curhatKonselorBtn = document.getElementById('curhatKonselorBtn');
    const openAIChatBtn = document.getElementById('openAIChatBtn');
    const aiChatModal = document.getElementById('aiChatModal');
    const closeAIChatBtn = document.getElementById('closeAIChatBtn');
    const openApiKeyConfigBtn = document.getElementById('openApiKeyConfigBtn');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiChatForm = document.getElementById('aiChatForm');
    const aiChatInput = document.getElementById('aiChatInput');

    const lanjutkanChatBtn = document.getElementById('lanjutkanChatBtn');
    const counselingSessionArea = document.getElementById('counselingSessionArea');
    const bookNewSessionBtn = document.getElementById('bookNewSessionBtn');
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
    const bookingForm = document.getElementById('bookingForm');
    const bookingCounselorSelect = document.getElementById('bookingCounselorSelect');
    const bookingTopicSelect = document.getElementById('bookingTopicSelect');

    // DOM Elements Fitur Baru (Curhat Anonim, Riwayat & Rating)
    const openAnonCurhatBtn = document.getElementById('openAnonCurhatBtn');
    const anonymousCurhatModal = document.getElementById('anonymousCurhatModal');
    const closeAnonModalBtn = document.getElementById('closeAnonModalBtn');
    const anonCurhatForm = document.getElementById('anonCurhatForm');
    const anonPseudonymLabel = document.getElementById('anonPseudonymLabel');
    const regenerateAnonNameBtn = document.getElementById('regenerateAnonNameBtn');
    const anonCounselorSelect = document.getElementById('anonCounselorSelect');
    const anonCategorySelect = document.getElementById('anonCategorySelect');
    const anonStoryInput = document.getElementById('anonStoryInput');
    const submitAnonStoryBtn = document.getElementById('submitAnonStoryBtn');

    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    const sessionHistoryList = document.getElementById('sessionHistoryList');

    const dashRatingModal = document.getElementById('dashRatingModal');
    const dashRatingTitle = document.getElementById('dashRatingTitle');
    const dashStarLabel = document.getElementById('dashStarLabel');
    const dashRatingReviewInput = document.getElementById('dashRatingReviewInput');
    const closeDashRatingModalBtn = document.getElementById('closeDashRatingModalBtn');
    const submitDashRatingBtn = document.getElementById('submitDashRatingBtn');

    // State Tambahan
    let currentAnonPseudonym = 'Sahabat Anonim #' + Math.floor(100 + Math.random() * 900);
    let activeRatingSessionId = null;
    let dashSelectedRating = 5;

    // 1. AUTH & SESSION CHECK
    async function initUser() {
      const session = await window.AuthService.getSession();
      if (session && session.user) {
        currentUser = session.user;
      } else {
        // Fallback local session
        const localEmail = localStorage.getItem('oase_active_user_email') || 'siswa@oase.id';
        currentUser = { email: localEmail, id: 'user-' + localEmail.replace(/[^a-zA-Z0-9]/g, '') };
      }

      userProfile = await window.AuthService.getUserProfile(currentUser.id, currentUser.email);
      updateUserUI();
      loadNotifications();
      checkActiveCounselingSession();
      loadCompletedSessions();
      setupAnonCurhat();
      setupDashRating();
      setupChangeDisplayName();
      setupPushNotificationUI();
    }

    function updateUserUI() {
      if (!currentUser) return;
      const displayName = userProfile.display_name || userProfile.full_name || 'Sahabat OASE';
      userInitialLabel.textContent = displayName.charAt(0).toUpperCase();
      userNameLabel.textContent = displayName;
      userEmailLabel.textContent = '🔒 Mode Anonim Aktif';

      // Role badge
      if (userProfile.role === 'moderator') {
        userRoleBadge.textContent = 'Moderator';
        userRoleBadge.className = 'px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold';
        if (userProfile.moderator_approval_status === 'pending') {
          modNotice.classList.remove('hidden');
        }
      } else if (userProfile.role === 'counselor') {
        userRoleBadge.textContent = 'Konselor';
        userRoleBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold';
      } else {
        userRoleBadge.textContent = 'User (Siswa)';
        userRoleBadge.className = 'px-2.5 py-0.5 rounded-full bg-heather-100 text-heather-900 border border-heather-300 text-xs font-bold';
      }

      geminiApiKeyInput.value = window.GeminiService.getApiKey();
    }

    // SETUP FITUR GANTI DISPLAY NAME (ANONIMITAS SISWA)
    function setupChangeDisplayName() {
      const modal = document.getElementById('changeDisplayNameModal');
      const form = document.getElementById('changeDisplayNameForm');
      const input = document.getElementById('newDisplayNameInput');
      const closeBtn = document.getElementById('closeDisplayNameModalBtn');
      const cancelBtn = document.getElementById('cancelDisplayNameBtn');
      const openDrawerBtn = document.getElementById('openChangeDisplayNameDrawerBtn');
      const quickBtn = document.getElementById('quickChangeDisplayNameBtn');
      const quickPseudonymBtns = document.querySelectorAll('.quick-pseudonym-btn');

      const openModal = () => {
        if (input) input.value = userProfile.display_name || userProfile.full_name || '';
        if (modal) modal.classList.remove('hidden');
        if (input) input.focus();
      };

      const closeModal = () => {
        if (modal) modal.classList.add('hidden');
      };

      if (openDrawerBtn) openDrawerBtn.addEventListener('click', openModal);
      if (quickBtn) quickBtn.addEventListener('click', openModal);
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      quickPseudonymBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (input) input.value = btn.textContent.trim();
        });
      });

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const newName = input.value.trim();
          if (!newName) return;

          const saveBtn = document.getElementById('saveDisplayNameBtn');
          saveBtn.disabled = true;
          saveBtn.textContent = 'Menyimpan...';

          try {
            await window.AuthService.updateDisplayName(currentUser.id, currentUser.email, newName);
            userProfile.display_name = newName;
            userProfile.full_name = newName;
            updateUserUI();
            closeModal();
            if (window.NotificationService) {
              window.NotificationService.showInAppToast('Display Name Diperbarui', `Identitas Anda sekarang tampil sebagai "${newName}".`);
            } else {
              alert(`Display Name berhasil diganti menjadi "${newName}". Anonimitas Anda terjaga.`);
            }
          } catch (err) {
            alert('Gagal mengganti display name: ' + err.message);
          } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Simpan Display Name</span>`;
            lucide.createIcons();
          }
        });
      }
    }

    // SETUP FITUR PUSH NOTIFIKASI DESKTOP & HANDPHONE
    function setupPushNotificationUI() {
      const toggleBtn = document.getElementById('togglePushNotifBtn');
      const statusBadge = document.getElementById('pushNotifStatusBadge');
      const btnLabel = document.getElementById('pushNotifBtnLabel');
      if (!toggleBtn) return;

      const updateBtnStatus = () => {
        if (!window.NotificationService || !window.NotificationService.isSupported()) {
          if (btnLabel) btnLabel.textContent = 'Notifikasi T/A';
          if (statusBadge) statusBadge.className = 'w-2 h-2 rounded-full bg-gray-400';
          return;
        }
        const perm = window.NotificationService.getPermissionStatus();
        if (perm === 'granted') {
          if (btnLabel) btnLabel.textContent = 'Notifikasi Aktif';
          if (statusBadge) statusBadge.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-xs';
        } else if (perm === 'denied') {
          if (btnLabel) btnLabel.textContent = 'Notifikasi Diblokir';
          if (statusBadge) statusBadge.className = 'w-2 h-2 rounded-full bg-rose-500';
        } else {
          if (btnLabel) btnLabel.textContent = 'Push Notifikasi';
          if (statusBadge) statusBadge.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
        }
      };

      updateBtnStatus();

      toggleBtn.addEventListener('click', async () => {
        if (!window.NotificationService || !window.NotificationService.isSupported()) {
          alert('Browser atau perangkat ini belum mendukung fitur Push Notifikasi.');
          return;
        }
        try {
          const perm = await window.NotificationService.requestPermission();
          updateBtnStatus();
          if (perm === 'granted') {
            await window.NotificationService.sendNotification('Notifikasi OASE Aktif 🎉', {
              body: 'Anda akan menerima pemberitahuan langsung di layar desktop atau handphone saat ada balasan konselor atau pesan baru.',
              tag: 'oase-welcome-notif'
            });
          } else if (perm === 'denied') {
            alert('Izin notifikasi belum diizinkan di browser. Silakan izinkan notifikasi pada ikon gembok di bilah alamat browser.');
          }
        } catch (e) {
          alert('Gagal mengaktifkan notifikasi: ' + e.message);
        }
      });
    }

    // 2. HAMBURGER DRAWER HANDLERS
    hamburgerBtn.addEventListener('click', () => {
      hamburgerDrawerOverlay.classList.remove('hidden');
      hamburgerDrawer.classList.remove('translate-x-full');
    });

    function closeDrawer() {
      hamburgerDrawer.classList.add('translate-x-full');
      hamburgerDrawerOverlay.classList.add('hidden');
    }
    closeDrawerBtn.addEventListener('click', closeDrawer);
    hamburgerDrawerOverlay.addEventListener('click', closeDrawer);

    // 3. SETTINGS & PASSWORD HANDLERS
    openSettingsBtn.addEventListener('click', () => {
      closeDrawer();
      settingsModal.classList.remove('hidden');
    });
    closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = newPasswordInput.value;
      try {
        await window.AuthService.updatePassword(newPass);
        alert('Kata sandi berhasil diperbarui!');
        newPasswordInput.value = '';
        settingsModal.classList.add('hidden');
      } catch (err) {
        alert('Gagal memperbarui kata sandi: ' + err.message);
      }
    });

    saveApiKeyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = geminiApiKeyInput.value.trim();
      const saveBtn = document.getElementById('saveApiKeyBtn');
      const statusP = document.getElementById('geminiModelStatus');

      if (!key) {
        window.GeminiService.setApiKey('');
        if (statusP) statusP.textContent = 'API Key Gemini telah dikosongkan.';
        alert('Gemini API Key telah dikosongkan.');
        settingsModal.classList.add('hidden');
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>Menghubungi Google AI...</span>`;
      }

      window.GeminiService.setApiKey(key);

      try {
        const workingModel = await window.GeminiService.discoverWorkingModel(key);
        if (statusP) {
          statusP.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-500"></i> <span class="text-emerald-700 font-bold">Terhubung! Model aktif: ${workingModel}</span>`;
          lucide.createIcons();
        }
        alert(`API Key valid & terhubung!\nModel aktif: ${workingModel}\nSahabat OASE siap digunakan.`);
        settingsModal.classList.add('hidden');
      } catch (err) {
        if (statusP) {
          statusP.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-rose-500"></i> <span class="text-rose-600 font-semibold">${err.message}</span>`;
          lucide.createIcons();
        }
        alert('Peringatan: ' + err.message);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<i data-lucide="key" class="w-3.5 h-3.5"></i><span>Simpan & Tes Koneksi API</span>`;
          lucide.createIcons();
        }
      }
    });

    requestModBtn.addEventListener('click', async () => {
      if (confirm('Ajukan akun ini sebagai Moderator ke Moderator Utama?')) {
        await window.AuthService.requestModeratorRole(currentUser.email);
        alert('Pengajuan peran moderator berhasil dikirim! Menunggu persetujuan.');
        initUser();
      }
    });

    logoutDrawerBtn.addEventListener('click', async () => {
      if (confirm('Apakah Anda yakin ingin keluar?')) {
        try { await window.AuthService.signOut(); } catch(e){}
        localStorage.removeItem('oase_active_user_email');
        window.location.href = 'index.html';
      }
    });

    // 4. NOTIFICATIONS
    notifBellBtn.addEventListener('click', () => {
      notifDropdown.classList.toggle('hidden');
    });

    function loadNotifications() {
      const notifs = window.ChatSessionService.getNotifications();
      if (!notifs || notifs.length === 0) {
        notifList.innerHTML = `<p class="text-xs text-center text-oase-muted py-4">Belum ada pemberitahuan baru.</p>`;
        notifBadge.classList.add('hidden');
        return;
      }

      notifBadge.classList.remove('hidden');
      notifList.innerHTML = '';
      notifs.forEach(n => {
        const item = document.createElement('div');
        item.className = "p-2.5 rounded-xl bg-heather-50/60 hover:bg-heather-100/60 border border-heather-100 text-xs space-y-1 transition-all cursor-pointer";
        item.innerHTML = `
          <div class="font-bold text-oase-plum flex items-center justify-between">
            <span>${n.title || 'Notifikasi Konseling'}</span>
            <span class="text-[10px] text-oase-muted">${new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <p class="text-oase-muted leading-relaxed">${n.message}</p>
          ${n.sessionId ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-heather-600 mt-0.5"><i data-lucide="arrow-right" class="w-3 h-3"></i> Buka Obrolan</span>` : ''}
        `;
        if (n.sessionId) {
          item.addEventListener('click', () => {
            sessionStorage.setItem('oase_active_chat_role', 'user');
            window.location.href = 'ruang-chat.html?sessionId=' + n.sessionId + '&role=user';
          });
        }
        notifList.appendChild(item);
      });
      lucide.createIcons();
    }

    clearNotifBtn.addEventListener('click', () => {
      localStorage.setItem('oase_notifications', '[]');
      loadNotifications();
    });

    window.addEventListener('oase_new_notification', () => {
      loadNotifications();
    });

    // 5. GEMINI AI CHAT MODAL
    openAIChatBtn.addEventListener('click', () => {
      const key = window.GeminiService.getApiKey();
      if (!key) {
        if (confirm('Gemini API Key belum dimasukkan. Ingin memasukkannya sekarang di Pengaturan?')) {
          settingsModal.classList.remove('hidden');
          return;
        }
      }
      aiChatModal.classList.remove('hidden');
    });

    closeAIChatBtn.addEventListener('click', () => aiChatModal.classList.add('hidden'));
    openApiKeyConfigBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });

    aiChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = aiChatInput.value.trim();
      if (!text) return;

      appendAIMessage('user', text);
      aiChatInput.value = '';

      const typingId = 'typing-' + Date.now();
      appendAITyping(typingId);

      try {
        const reply = await window.GeminiService.chatWithGemini(text, aiChatHistory);
        removeAITyping(typingId);
        appendAIMessage('model', reply);
        aiChatHistory.push({ sender: 'user', text });
        aiChatHistory.push({ sender: 'model', text: reply });
      } catch (err) {
        removeAITyping(typingId);
        appendAIMessage('model', `Maaf, aku sedang kesulitan merespons: ${err.message}. Pastikan API Key Gemini Anda valid.`);
      }
    });

    function appendAIMessage(sender, text) {
      const isUser = sender === 'user';
      const msg = document.createElement('div');
      msg.className = `flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`;
      msg.innerHTML = `
        <div class="w-8 h-8 rounded-xl ${isUser ? 'bg-heather-500 text-white' : 'bg-indigo-100 text-indigo-700'} flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5 shadow-2xs">
          ${isUser ? '<i data-lucide="user" class="w-4 h-4"></i>' : '<i data-lucide="bot" class="w-4 h-4 text-indigo-600"></i>'}
        </div>
        <div class="p-3.5 rounded-2xl ${isUser ? 'bg-heather-500 text-white rounded-tr-none' : 'bg-white border border-indigo-100 text-oase-plum rounded-tl-none'} shadow-xs text-xs sm:text-sm leading-relaxed whitespace-pre-line">
          ${text}
        </div>
      `;
      aiChatMessages.appendChild(msg);
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
      lucide.createIcons();
    }

    function appendAITyping(id) {
      const div = document.createElement('div');
      div.id = id;
      div.className = "flex items-start gap-2.5 max-w-[85%]";
      div.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5 shadow-2xs">
          <i data-lucide="bot" class="w-4 h-4 text-indigo-600"></i>
        </div>
        <div class="p-3.5 rounded-2xl bg-white border border-indigo-100 text-oase-muted shadow-xs flex items-center gap-1.5 rounded-tl-none">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150"></span>
          <span class="text-[11px] ml-1">Sahabat OASE sedang mendengarkan dan merangkai kata...</span>
        </div>
      `;
      aiChatMessages.appendChild(div);
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
      lucide.createIcons();
    }

    function removeAITyping(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    // 6. BOOKING SESI KONSELING 30 MENIT (SISTEM JADWAL KALENDER)
    curhatKonselorBtn.addEventListener('click', openBookingModal);
    if (bookNewSessionBtn) bookNewSessionBtn.addEventListener('click', openBookingModal);
    lanjutkanChatBtn.addEventListener('click', () => {
      if (activeSession) {
        sessionStorage.setItem('oase_active_chat_role', 'user');
        window.location.href = 'ruang-chat.html?sessionId=' + activeSession.id + '&role=user';
      } else {
        openBookingModal();
      }
    });

    let selectedBookingDateStr = '';
    let selectedBookingTimeSlot = '13:00';

    function openBookingModal() {
      populateBookingCounselors();
      initBookingCalendar();
      bookingModal.classList.remove('hidden');
      lucide.createIcons();
    }
    closeBookingModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));

    function populateBookingCounselors() {
      const counselors = window.COUNSELORS_DATA || [];
      bookingCounselorSelect.innerHTML = '';
      counselors.forEach(c => {
        if (c.id === 'auto') return;
        const ratingInfo = window.getCounselorRatingInfo ? window.getCounselorRatingInfo(c.id) : { average: 5.0, totalReviews: 10 };
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} • ${c.role} (⭐ ${ratingInfo.average} • ${ratingInfo.totalReviews} ulasan)`;
        bookingCounselorSelect.appendChild(opt);
      });

      updateSelectedCounselorInfo();
    }

    bookingCounselorSelect.addEventListener('change', () => {
      updateSelectedCounselorInfo();
      renderTimeSlots();
      updateBookingSummary();
    });

    function updateSelectedCounselorInfo() {
      const cId = bookingCounselorSelect.value;
      const c = (window.COUNSELORS_DATA || []).find(x => x.id === cId);
      const ratingBadge = document.getElementById('selectedCounselorRatingBadge');
      if (c && ratingBadge) {
        const ratingInfo = window.getCounselorRatingInfo ? window.getCounselorRatingInfo(c.id) : { average: 5.0 };
        ratingBadge.textContent = `⭐ ${ratingInfo.average} • ${c.role}`;
      }
    }

    // Inisialisasi Kalender Pemilihan Hari / Tanggal (Next 14 Days)
    function initBookingCalendar() {
      const calendarStrip = document.getElementById('bookingCalendarStrip');
      const dateDisplay = document.getElementById('selectedDateDisplay');
      const dateInput = document.getElementById('selectedBookingDateInput');
      if (!calendarStrip) return;

      calendarStrip.innerHTML = '';
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

      const today = new Date();
      if (!selectedBookingDateStr) {
        selectedBookingDateStr = today.toISOString().split('T')[0];
      }

      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);

        const dStr = d.toISOString().split('T')[0];
        const dayName = i === 0 ? 'Hari Ini' : (i === 1 ? 'Besok' : dayNames[d.getDay()]);
        const dateNum = d.getDate();
        const monthName = monthNames[d.getMonth()];
        const isSelected = (dStr === selectedBookingDateStr);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `flex-shrink-0 flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-xs select-none min-w-[70px] ${
          isSelected
            ? 'bg-heather-600 text-white border-heather-700 shadow-md scale-105 font-bold'
            : 'bg-white hover:bg-heather-50 text-oase-plum border-oase-border hover:border-heather-300 font-medium'
        }`;
        btn.innerHTML = `
          <span class="text-[10px] ${isSelected ? 'text-heather-100 font-semibold' : 'text-oase-muted'}">${dayName}</span>
          <span class="text-base font-extrabold my-0.5 leading-none">${dateNum}</span>
          <span class="text-[10px] ${isSelected ? 'text-heather-200' : 'text-oase-muted'}">${monthName}</span>
        `;

        btn.addEventListener('click', () => {
          selectedBookingDateStr = dStr;
          dateInput.value = dStr;
          initBookingCalendar();
          renderTimeSlots();
          updateBookingSummary();
        });

        calendarStrip.appendChild(btn);
      }

      dateInput.value = selectedBookingDateStr;
      const curDateObj = new Date(selectedBookingDateStr);
      const isToday = (selectedBookingDateStr === today.toISOString().split('T')[0]);
      dateDisplay.textContent = (isToday ? 'Hari Ini, ' : '') + curDateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

      renderTimeSlots();
      updateBookingSummary();
    }

    // Render Time Slots & Cek Tabrakan Jadwal (Conflict Detection)
    function renderTimeSlots() {
      const container = document.getElementById('bookingTimeSlotsContainer');
      const timeInput = document.getElementById('selectedBookingTimeInput');
      const substituteBox = document.getElementById('substituteCounselorBox');
      const substituteListContainer = document.getElementById('substituteListContainer');
      const slotConflictMessage = document.getElementById('slotConflictMessage');
      if (!container) return;

      container.innerHTML = '';
      const slots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '19:00', '20:00'];
      const counselorId = bookingCounselorSelect.value;
      const counselorObj = (window.COUNSELORS_DATA || []).find(x => x.id === counselorId);
      const counselorName = counselorObj ? counselorObj.name : 'Konselor Terpilih';

      let isSelectedSlotConflict = false;

      slots.forEach(slot => {
        const isBooked = window.ChatSessionService.isSlotBooked(counselorId, selectedBookingDateStr, slot);
        const isSelected = (slot === selectedBookingTimeSlot);

        if (isSelected && isBooked) {
          isSelectedSlotConflict = true;
        }

        const slotBtn = document.createElement('button');
        slotBtn.type = 'button';
        slotBtn.className = `p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 relative ${
          isBooked
            ? 'bg-rose-50 border-rose-300 text-rose-700 opacity-80 cursor-pointer hover:bg-rose-100'
            : (isSelected
                ? 'bg-heather-600 text-white border-heather-700 shadow-sm ring-2 ring-heather-300'
                : 'bg-white hover:bg-heather-50 text-oase-plum border-oase-border hover:border-heather-400')
        }`;

        slotBtn.innerHTML = `
          <span>${slot} WIB</span>
          <span class="text-[9px] font-semibold ${isBooked ? 'text-rose-600 font-extrabold' : (isSelected ? 'text-heather-100' : 'text-emerald-700')}">
            ${isBooked ? '✕ Terisi' : '✓ Tersedia'}
          </span>
        `;

        slotBtn.addEventListener('click', () => {
          selectedBookingTimeSlot = slot;
          timeInput.value = slot;
          renderTimeSlots();
          updateBookingSummary();
        });

        container.appendChild(slotBtn);
      });

      timeInput.value = selectedBookingTimeSlot;

      // Jika slot yang dipilih saat ini ternyata penuh, tampilkan rekomendasi konselor pengganti
      if (isSelectedSlotConflict && substituteBox && substituteListContainer) {
        substituteBox.classList.remove('hidden');
        slotConflictMessage.textContent = `Slot pukul ${selectedBookingTimeSlot} WIB pada tanggal ini sudah dipesan untuk ${counselorName}.`;
        
        const substitutes = window.ChatSessionService.getSubstituteCounselors(selectedBookingDateStr, selectedBookingTimeSlot, counselorId);
        substituteListContainer.innerHTML = '';

        if (substitutes.length > 0) {
          substitutes.forEach(sub => {
            const rInfo = window.getCounselorRatingInfo ? window.getCounselorRatingInfo(sub.id) : { average: 5.0 };
            const subBtn = document.createElement('button');
            subBtn.type = 'button';
            subBtn.className = "px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs";
            subBtn.innerHTML = `
              <i data-lucide="user-check" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Pilih ${sub.name.split(',')[0]} (⭐ ${rInfo.average})</span>
            `;
            subBtn.addEventListener('click', () => {
              bookingCounselorSelect.value = sub.id;
              updateSelectedCounselorInfo();
              renderTimeSlots();
              updateBookingSummary();
            });
            substituteListContainer.appendChild(subBtn);
          });
        } else {
          substituteListContainer.innerHTML = `<span class="text-xs text-amber-800 italic">Semua konselor sedang penuh di jam ${selectedBookingTimeSlot}. Silakan pilih jam lain di atas.</span>`;
        }
        lucide.createIcons();
      } else if (substituteBox) {
        substituteBox.classList.add('hidden');
      }
    }

    function updateBookingSummary() {
      const summaryCounselor = document.getElementById('summaryCounselorName');
      const summaryDateTime = document.getElementById('summaryDateTime');
      const counselorId = bookingCounselorSelect.value;
      const counselorObj = (window.COUNSELORS_DATA || []).find(x => x.id === counselorId);

      if (summaryCounselor) summaryCounselor.textContent = counselorObj ? counselorObj.name : 'Konselor OASE';
      if (summaryDateTime && selectedBookingDateStr) {
        const dObj = new Date(selectedBookingDateStr);
        const dStr = dObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        summaryDateTime.textContent = `${dStr} pukul ${selectedBookingTimeSlot} WIB`;
      }
    }

    // 8. FITUR CURHAT ANONIM KE KONSELOR
    function setupAnonCurhat() {
      if (!openAnonCurhatBtn) return;
      openAnonCurhatBtn.addEventListener('click', () => {
        generateAnonPseudonym();
        populateAnonCounselors();
        anonymousCurhatModal.classList.remove('hidden');
      });

      if (closeAnonModalBtn) {
        closeAnonModalBtn.addEventListener('click', () => anonymousCurhatModal.classList.add('hidden'));
      }

      if (regenerateAnonNameBtn) {
        regenerateAnonNameBtn.addEventListener('click', generateAnonPseudonym);
      }

      // Handle Tombol Pilihan Jenjang Pendidikan di Modal Curhat Anonim
      const eduChips = document.querySelectorAll('.anon-edu-chip');
      const anonSelectedEducationInput = document.getElementById('anonSelectedEducationInput');
      eduChips.forEach(chip => {
        chip.addEventListener('click', () => {
          eduChips.forEach(c => {
            c.classList.remove('border-rose-500', 'bg-rose-50', 'text-rose-700', 'font-bold', 'shadow-xs');
            c.classList.add('border-oase-border', 'bg-white', 'text-oase-plum', 'font-semibold');
          });
          chip.classList.remove('border-oase-border', 'bg-white', 'text-oase-plum', 'font-semibold');
          chip.classList.add('border-rose-500', 'bg-rose-50', 'text-rose-700', 'font-bold', 'shadow-xs');
          if (anonSelectedEducationInput) {
            anonSelectedEducationInput.value = chip.getAttribute('data-education');
          }
        });
      });

      if (anonCurhatForm) {
        anonCurhatForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const counselorId = anonCounselorSelect.value;
          const counselorObj = (window.COUNSELORS_DATA || []).find(c => c.id === counselorId);
          const counselorName = counselorObj ? counselorObj.name : 'Konselor OASE';
          const category = anonCategorySelect.value;
          const storyContent = anonStoryInput.value.trim();
          const selectedEducation = (anonSelectedEducationInput && anonSelectedEducationInput.value) ? anonSelectedEducationInput.value : 'SMA / SMK / MA';

          if (!storyContent) return;

          submitAnonStoryBtn.disabled = true;
          submitAnonStoryBtn.textContent = 'Mengirim Curhat Anonim...';

          try {
            const res = await window.CounselingService.submitCounselingStory({
              authorName: currentAnonPseudonym,
              educationLevel: selectedEducation,
              gradeClass: 'Siswa Anonim',
              gender: 'Rahasia',
              category: category,
              counselorId: counselorId === 'auto' ? null : counselorId,
              counselorName: counselorName,
              storyContent: storyContent
            });

            alert(`Curhat anonim Anda berhasil dikirim dengan Kode Tiket: ${res.ticketCode || 'OASE-CERITA'}.\nKonselor akan membaca ceritamu secara rahasia di portal konseling.`);
            anonStoryInput.value = '';
            anonymousCurhatModal.classList.add('hidden');
          } catch (err) {
            alert('Gagal mengirim curhat: ' + err.message);
          } finally {
            submitAnonStoryBtn.disabled = false;
            submitAnonStoryBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i><span>Kirimkan Curhat Anonim</span>`;
            lucide.createIcons();
          }
        });
      }
    }

    function generateAnonPseudonym() {
      currentAnonPseudonym = 'Sahabat Anonim #' + Math.floor(100 + Math.random() * 900);
      if (anonPseudonymLabel) anonPseudonymLabel.textContent = currentAnonPseudonym;
    }

    function populateAnonCounselors() {
      if (!anonCounselorSelect) return;
      const counselors = window.COUNSELORS_DATA || [];
      anonCounselorSelect.innerHTML = '';
      counselors.forEach(c => {
        const ratingInfo = window.getCounselorRatingInfo ? window.getCounselorRatingInfo(c.id) : { average: 5.0, totalReviews: 10 };
        const opt = document.createElement('option');
        opt.value = c.id;
        if (c.id === 'auto') {
          opt.textContent = '🌟 Pilihkan Otomatis (Konselor Pertama yang Siap)';
        } else {
          opt.textContent = `${c.name} • ${c.role} (⭐ ${ratingInfo.average})`;
        }
        anonCounselorSelect.appendChild(opt);
      });
    }

    // 9. RIWAYAT SESI KONSELING SELESAI & RATING
    async function loadCompletedSessions() {
      if (!sessionHistoryList || !currentUser) return;
      const completedSessions = await window.ChatSessionService.getCompletedSessions(currentUser.email);

      if (!completedSessions || completedSessions.length === 0) {
        sessionHistoryList.innerHTML = `
          <div class="py-8 text-center bg-oase-surface/50 rounded-2xl border border-dashed border-oase-border space-y-1">
            <p class="text-xs font-bold text-oase-plum">Belum Ada Riwayat Konseling yang Diselesaikan</p>
            <p class="text-[11px] text-oase-muted">Sesi konseling yang telah Anda selesaikan bersama konselor akan tercatat rapi di sini.</p>
          </div>
        `;
        return;
      }

      sessionHistoryList.innerHTML = '';
      completedSessions.forEach(s => {
        const counselorObj = (window.COUNSELORS_DATA || []).find(c => c.id === s.counselor_id) || {
          name: s.counselor_name || 'Konselor OASE',
          role: 'Konselor Terverifikasi',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80'
        };

        const item = document.createElement('div');
        item.className = "p-4 sm:p-5 rounded-2xl border border-heather-200/80 bg-white hover:border-heather-300 transition-all shadow-2xs space-y-3.5";

        const dateStr = s.ended_at ? new Date(s.ended_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sesi Lampau';

        let ratingHtml = '';
        if (s.rating) {
          ratingHtml = `
            <div class="flex items-center gap-2 text-xs">
              <span class="text-amber-500 font-bold tracking-wider">${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}</span>
              <span class="text-oase-muted text-[11px]">Penilaian Anda (${s.rating}/5)</span>
            </div>
          `;
        } else {
          ratingHtml = `
            <button class="rate-session-btn px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-all flex items-center gap-1" data-id="${s.id}" data-counselor="${counselorObj.name}">
              <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-500"></i>
              <span>Beri Rating Konselor</span>
            </button>
          `;
        }

        let motivationHtml = '';
        if (s.motivational_message) {
          motivationHtml = `
            <div class="p-3 rounded-xl bg-gradient-to-r from-amber-50/70 via-rose-50/50 to-heather-50/70 border border-heather-100 text-xs text-oase-plum space-y-1">
              <span class="text-[10px] font-bold text-heather-700 flex items-center gap-1 uppercase tracking-wider">
                <i data-lucide="sparkles" class="w-3 h-3 text-amber-500"></i> Pesan Semangat dari ${counselorObj.name}:
              </span>
              <p class="italic leading-relaxed">"${s.motivational_message}"</p>
            </div>
          `;
        }

        item.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-oase-border">
            <div class="flex items-center gap-3">
              <img src="${counselorObj.avatar}" alt="${counselorObj.name}" class="w-11 h-11 rounded-xl object-cover border border-heather-200 shadow-2xs flex-shrink-0">
              <div>
                <h4 class="text-xs sm:text-sm font-bold text-oase-plum">${counselorObj.name}</h4>
                <p class="text-[11px] text-heather-700 font-medium">Topik: ${s.topic}</p>
                <span class="text-[10px] text-oase-muted">${dateStr} • Durasi: 30 Menit</span>
              </div>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                ✓ Selesai
              </span>
              <a href="ruang-chat.html?sessionId=${s.id}&role=user&readonly=true" onclick="sessionStorage.setItem('oase_active_chat_role', 'user')" class="px-3.5 py-1.5 rounded-xl border border-heather-200 bg-heather-50 hover:bg-heather-100 text-heather-800 text-xs font-bold transition-all flex items-center gap-1">
                <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                <span>Buka Riwayat Obrolan</span>
              </a>
            </div>
          </div>
          ${motivationHtml}
          <div class="flex items-center justify-between pt-1">
            ${ratingHtml}
            ${s.review ? `<p class="text-[11px] text-oase-muted italic truncate max-w-xs">"${s.review}"</p>` : ''}
          </div>
        `;

        sessionHistoryList.appendChild(item);
      });

      // Event listener tombol beri rating
      document.querySelectorAll('.rate-session-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sId = btn.getAttribute('data-id');
          const cName = btn.getAttribute('data-counselor');
          openDashRating(sId, cName);
        });
      });

      lucide.createIcons();
    }

    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', loadCompletedSessions);
    }

    // 10. MODAL RATING DARI DASHBOARD
    function setupDashRating() {
      const starBtns = document.querySelectorAll('.dash-star-btn');
      const starTexts = {
        1: 'Kurang Puas (1 Bintang)',
        2: 'Cukup Membantu (2 Bintang)',
        3: 'Baik (3 Bintang)',
        4: 'Sangat Baik (4 Bintang)',
        5: 'Sangat Puas & Membantu (5 Bintang)'
      };

      const updateStarDisplay = (val) => {
        starBtns.forEach(btn => {
          const btnVal = parseInt(btn.getAttribute('data-val'));
          if (btnVal <= val) {
            btn.className = 'dash-star-btn text-amber-400 transition-transform hover:scale-125';
          } else {
            btn.className = 'dash-star-btn text-gray-300 transition-transform hover:scale-125';
          }
        });
        if (dashStarLabel) dashStarLabel.textContent = starTexts[val] || `${val} Bintang`;
      };

      starBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          dashSelectedRating = parseInt(btn.getAttribute('data-val'));
          updateStarDisplay(dashSelectedRating);
        });
      });

      if (closeDashRatingModalBtn) {
        closeDashRatingModalBtn.addEventListener('click', () => dashRatingModal.classList.add('hidden'));
      }

      if (submitDashRatingBtn) {
        submitDashRatingBtn.addEventListener('click', async () => {
          if (!activeRatingSessionId) return;
          submitDashRatingBtn.disabled = true;
          submitDashRatingBtn.textContent = 'Menyimpan...';

          const review = dashRatingReviewInput ? dashRatingReviewInput.value.trim() : '';
          await window.ChatSessionService.rateSession(activeRatingSessionId, dashSelectedRating, review);

          alert(`Terima kasih! Penilaian ${dashSelectedRating} bintang berhasil disimpan.`);
          dashRatingModal.classList.add('hidden');
          submitDashRatingBtn.disabled = false;
          submitDashRatingBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Simpan Rating</span>`;
          lucide.createIcons();
          await loadCompletedSessions();
        });
      }
    }

    function openDashRating(sessionId, counselorName) {
      activeRatingSessionId = sessionId;
      if (dashRatingTitle) dashRatingTitle.textContent = `Beri Penilaian untuk ${counselorName}`;
      if (dashRatingReviewInput) dashRatingReviewInput.value = '';
      dashSelectedRating = 5;
      dashRatingModal.classList.remove('hidden');
    }

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const counselorId = bookingCounselorSelect.value;
      const counselorObj = (window.COUNSELORS_DATA || []).find(c => c.id === counselorId);
      const counselorName = counselorObj ? counselorObj.name : 'Konselor OASE';
      const topic = bookingTopicSelect.value;
      const bookingDate = selectedBookingDateStr;
      const bookingTime = selectedBookingTimeSlot;

      // Cek apakah slot sudah terisi untuk konselor ini
      if (window.ChatSessionService.isSlotBooked(counselorId, bookingDate, bookingTime)) {
        renderTimeSlots();
        alert(`Maaf, jadwal tanggal ${bookingDate} jam ${bookingTime} WIB untuk ${counselorName} sudah terisi. Silakan pilih konselor pengganti rekomendasi di bawah atau pilih jam lainnya.`);
        return;
      }

      const submitBtn = document.getElementById('confirmBookingSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses Booking...';

      try {
        const session = await window.ChatSessionService.bookSession({
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: userProfile.display_name || userProfile.full_name || 'Sahabat Anonim',
          counselorId,
          counselorName,
          topic,
          bookingDate,
          bookingTime,
          duration: 30
        });

        alert(`Jadwal konseling bersama ${counselorName} berhasil dibooking!\nTanggal: ${bookingDate}\nJam: ${bookingTime} WIB\n\nMengalihkan ke Ruang Chat Konseling...`);
        bookingModal.classList.add('hidden');
        sessionStorage.setItem('oase_active_chat_role', 'user');
        window.location.href = 'ruang-chat.html?sessionId=' + session.id + '&role=user';
      } catch (err) {
        alert('Gagal melakukan booking: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <i data-lucide="calendar-check" class="w-4 h-4"></i>
          <span>Konfirmasi Booking Jadwal</span>
        `;
        lucide.createIcons();
      }
    });

    // ========================================================
    // LOGIKA MODAL: KONTAK DARURAT & LAPORAN BUG
    // ========================================================
    const emergencyHelpModal = document.getElementById('emergencyHelpModal');
    const floatingEmergencyBtn = document.getElementById('floatingEmergencyBtn');
    const closeEmergencyModalBtn = document.getElementById('closeEmergencyModalBtn');
    const tabEmergencyBtn = document.getElementById('tabEmergencyBtn');
    const tabBugReportBtn = document.getElementById('tabBugReportBtn');
    const emergencyTabContent = document.getElementById('emergencyTabContent');
    const bugReportTabContent = document.getElementById('bugReportTabContent');

    const sendBugWhatsAppBtn = document.getElementById('sendBugWhatsAppBtn');
    const sendBugEmailBtn = document.getElementById('sendBugEmailBtn');
    const bugCategorySelect = document.getElementById('bugCategorySelect');
    const bugDescriptionInput = document.getElementById('bugDescriptionInput');

    if (floatingEmergencyBtn && emergencyHelpModal) {
      floatingEmergencyBtn.addEventListener('click', () => {
        emergencyHelpModal.classList.remove('hidden');
        lucide.createIcons();
      });
    }

    if (closeEmergencyModalBtn && emergencyHelpModal) {
      closeEmergencyModalBtn.addEventListener('click', () => emergencyHelpModal.classList.add('hidden'));
    }

    if (tabEmergencyBtn && tabBugReportBtn) {
      tabEmergencyBtn.addEventListener('click', () => {
        tabEmergencyBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-rose-500 text-white shadow-xs flex items-center justify-center gap-1.5";
        tabBugReportBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition-all text-oase-muted hover:text-oase-plum flex items-center justify-center gap-1.5";
        emergencyTabContent.classList.remove('hidden');
        bugReportTabContent.classList.add('hidden');
      });

      tabBugReportBtn.addEventListener('click', () => {
        tabBugReportBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 text-white shadow-xs flex items-center justify-center gap-1.5";
        tabEmergencyBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition-all text-oase-muted hover:text-oase-plum flex items-center justify-center gap-1.5";
        emergencyTabContent.classList.add('hidden');
        bugReportTabContent.classList.remove('hidden');
      });
    }

    if (sendBugWhatsAppBtn && bugDescriptionInput) {
      sendBugWhatsAppBtn.addEventListener('click', () => {
        const desc = bugDescriptionInput.value.trim();
        if (!desc) {
          alert('Mohon tuliskan deskripsi kendala yang Anda temukan terlebih dahulu.');
          bugDescriptionInput.focus();
          return;
        }
        const cat = bugCategorySelect ? bugCategorySelect.value : 'Kendala Sistem';
        const msg = encodeURIComponent(`*LAPORAN KENDALA OASE CERITA*\n\n*Kategori:* ${cat}\n*Halaman:* ${window.location.pathname}\n*User:* ${userProfile.display_name || userProfile.full_name || 'Pengguna'}\n*Deskripsi Kendala:*\n${desc}\n\n_Mohon bantuannya untuk diperbaiki tim IT. Terima kasih._`);
        window.open(`https://wa.me/6281234567890?text=${msg}`, '_blank');
      });
    }

    if (sendBugEmailBtn && bugDescriptionInput) {
      sendBugEmailBtn.addEventListener('click', () => {
        const desc = bugDescriptionInput.value.trim();
        if (!desc) {
          alert('Mohon tuliskan deskripsi kendala yang Anda temukan terlebih dahulu.');
          bugDescriptionInput.focus();
          return;
        }
        const cat = bugCategorySelect ? bugCategorySelect.value : 'Kendala Sistem';
        const subject = encodeURIComponent(`[Laporan Bug OASE] ${cat}`);
        const body = encodeURIComponent(`Halo Tim Pengembang OASE Cerita,\n\nSaya menemukan kendala teknis berikut:\n\nKategori: ${cat}\nHalaman: ${window.location.pathname}\nUser: ${userProfile.display_name || userProfile.full_name || 'Pengguna'}\n\nDeskripsi Masalah:\n${desc}\n\nTerima kasih.`);
        window.location.href = `mailto:support@oase.id?subject=${subject}&body=${body}`;
      });
    }

    // 7. AKTIFKAN RUANG CHAT KONSELING & TIMER 30 MENIT
    async function checkActiveCounselingSession() {
      if (!currentUser) return;
      activeSession = await window.ChatSessionService.getActiveSession(currentUser.email);
      if (!activeSession) {
        renderEmptySessionUI();
        return;
      }
      renderActiveSessionRoom(activeSession);
    }

    function renderEmptySessionUI() {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      counselingSessionArea.innerHTML = `
        <div class="py-12 text-center space-y-3 bg-oase-surface/50 rounded-2xl border border-dashed border-oase-border">
          <div class="w-12 h-12 rounded-2xl bg-heather-100 text-heather-600 flex items-center justify-center mx-auto">
            <i data-lucide="calendar-heart" class="w-6 h-6"></i>
          </div>
          <h3 class="text-sm font-bold text-oase-plum">Belum Ada Sesi Konseling yang Sedang Berjalan</h3>
          <p class="text-xs text-oase-muted max-w-md mx-auto">
            Klik tombol <strong>"Booking Sesi Konseling Baru"</strong> di bawah untuk memilih konselor dan memulai obrolan langsung.
          </p>
          <button id="bookNewSessionBtnDynamic" class="mt-2 px-6 py-2.5 rounded-xl bg-heather-500 hover:bg-heather-600 text-white text-xs font-bold transition-all inline-flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Booking Sesi Konseling Baru</span>
          </button>
        </div>
      `;
      document.getElementById('bookNewSessionBtnDynamic').addEventListener('click', openBookingModal);
      lucide.createIcons();
    }

    function renderActiveSessionRoom(session) {
      const counselorObj = (window.COUNSELORS_DATA || []).find(c => c.id === session.counselor_id) || {
        name: session.counselor_name,
        role: 'Konselor Terverifikasi OASE',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80'
      };

      counselingSessionArea.innerHTML = `
        <div class="rounded-3xl border border-heather-200 bg-gradient-to-br from-white via-heather-50/40 to-white p-6 sm:p-8 overflow-hidden shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <img src="${counselorObj.avatar}" alt="${counselorObj.name}" class="w-14 h-14 rounded-2xl object-cover border border-heather-200 shadow-sm flex-shrink-0">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-oase-plum">${counselorObj.name}</h3>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">🔴 Sesi Aktif</span>
                </div>
                <p class="text-xs text-heather-700 font-semibold">${counselorObj.role}</p>
                <p class="text-xs text-oase-muted mt-0.5">Topik: ${session.topic}</p>
              </div>
            </div>

            <!-- Countdown Timer & Actions -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-heather-200 shadow-xs text-xs font-bold text-heather-800">
                <i data-lucide="timer" class="w-4 h-4 text-heather-500"></i>
                <span id="sessionTimerLabel">30:00</span>
                <span class="text-[10px] text-oase-muted font-normal">tersisa</span>
              </div>
              <button id="endSessionBtn" class="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all">
                Selesaikan
              </button>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-heather-50/70 border border-heather-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-0.5 text-center sm:text-left">
              <h4 class="text-xs font-bold text-heather-900">Halaman Khusus Obrolan & Voice Note Siap Digunakan</h4>
              <p class="text-[11px] text-oase-muted">Sesi end-to-end berdurasi 30 menit. Klik tombol di sebelah untuk masuk ke ruang obrolan penuh.</p>
            </div>
            <a href="ruang-chat.html?sessionId=${session.id}&role=user" onclick="sessionStorage.setItem('oase_active_chat_role', 'user')" class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-heather-500 hover:bg-heather-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-heather-500/25 transition-all flex items-center justify-center gap-2 flex-shrink-0">
              <i data-lucide="messages-square" class="w-4 h-4"></i>
              <span>Buka Ruang Chat Konseling</span>
            </a>
          </div>
        </div>
      `;
      lucide.createIcons();
      startSessionTimer(session);
    }

    // Timer 30 Menit Countdown
    function startSessionTimer(session) {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      const startTime = new Date(session.started_at || session.created_at).getTime();
      const durationMs = (session.duration_minutes || 30) * 60 * 1000;
      const endTime = startTime + durationMs;

      const updateTimer = () => {
        const now = Date.now();
        const diff = endTime - now;
        const timerLabel = document.getElementById('sessionTimerLabel');

        if (diff <= 0) {
          clearInterval(sessionTimerInterval);
          if (timerLabel) timerLabel.textContent = '00:00 (Selesai)';
          alert('Sesi konseling 30 menit telah berakhir. Terima kasih sudah bercerita.');
          window.ChatSessionService.endSession(session.id);
          renderEmptySessionUI();
          return;
        }

        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        if (timerLabel) {
          timerLabel.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      };

      updateTimer();
      sessionTimerInterval = setInterval(updateTimer, 1000);

      const endBtn = document.getElementById('endSessionBtn');
      if (endBtn) {
        endBtn.addEventListener('click', async () => {
          if (confirm('Apakah Anda ingin mengakhiri sesi konseling ini sekarang?')) {
            await window.ChatSessionService.endSession(session.id);
            renderEmptySessionUI();
          }
        });
      }
    }

    // Run on startup
    initUser();
  </script>
