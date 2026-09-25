    lucide.createIcons();

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const targetSessionId = urlParams.get('sessionId');

    // DOM Elements
    const backDashboardBtn = document.getElementById('backDashboardBtn');
    const opponentAvatar = document.getElementById('opponentAvatar');
    const opponentName = document.getElementById('opponentName');
    const sessionTopicMeta = document.getElementById('sessionTopicMeta');
    const sessionTimerLabel = document.getElementById('sessionTimerLabel');
    const resetSessionChatBtn = document.getElementById('resetSessionChatBtn');
    const endSessionBtn = document.getElementById('endSessionBtn');
    const sessionStatusPill = document.getElementById('sessionStatusPill');

    const chatMessagesContainer = document.getElementById('chatMessagesContainer');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');

    const micBtn = document.getElementById('micBtn');
    const voiceRecordBar = document.getElementById('voiceRecordBar');
    const recordTimerLabel = document.getElementById('recordTimerLabel');
    const cancelRecordBtn = document.getElementById('cancelRecordBtn');
    const sendRecordBtn = document.getElementById('sendRecordBtn');

    // Locked Chat Elements
    const lockedChatNotice = document.getElementById('lockedChatNotice');
    const lockedBackBtn = document.getElementById('lockedBackBtn');
    const lockedRatingActionBtn = document.getElementById('lockedRatingActionBtn');
    const lockedRatingActionLabel = document.getElementById('lockedRatingActionLabel');
    const lockedMotivationActionBtn = document.getElementById('lockedMotivationActionBtn');

    // Motivation Modal Elements
    const counselorMotivationModal = document.getElementById('counselorMotivationModal');
    const counselorMotivationInput = document.getElementById('counselorMotivationInput');
    const sendMotivationEndBtn = document.getElementById('sendMotivationEndBtn');
    const skipMotivationEndBtn = document.getElementById('skipMotivationEndBtn');

    // Rating Modal Elements
    const userRatingModal = document.getElementById('userRatingModal');
    const starContainer = document.getElementById('starContainer');
    const starLabel = document.getElementById('starLabel');
    const ratingReviewInput = document.getElementById('ratingReviewInput');
    const closeRatingModalBtn = document.getElementById('closeRatingModalBtn');
    const submitRatingBtn = document.getElementById('submitRatingBtn');

    // State Variables
    let currentRole = 'user'; // 'user' (siswa) or 'counselor' (konselor)
    let currentUserSession = null;
    let currentCounselorSession = null;
    let activeSession = null;
    let timerInterval = null;
    let lastRenderedMessageIds = new Set();
    let isSessionLocked = false;
    let selectedRating = 5;
    let hasPromptedRating = false;

    // Voice Note variables
    let mediaRecorder = null;
    let audioChunks = [];
    let recordStart = null;
    let recordInterval = null;

    // 1. INITIALIZE IDENTITY & DETECT ROLE (TAB ISOLATION)
    async function initChat() {
      // Prioritas 1: Parameter URL (?role=user atau ?role=counselor)
      const explicitRole = urlParams.get('role');
      if (explicitRole === 'user' || explicitRole === 'counselor') {
        currentRole = explicitRole;
        sessionStorage.setItem('oase_active_chat_role', explicitRole);
      } else if (sessionStorage.getItem('oase_active_chat_role')) {
        currentRole = sessionStorage.getItem('oase_active_chat_role');
      } else if (document.referrer && document.referrer.includes('laman-konselor')) {
        currentRole = 'counselor';
        sessionStorage.setItem('oase_active_chat_role', 'counselor');
      } else if (document.referrer && document.referrer.includes('dashboard-user')) {
        currentRole = 'user';
        sessionStorage.setItem('oase_active_chat_role', 'user');
      } else {
        currentRole = 'user';
        sessionStorage.setItem('oase_active_chat_role', 'user');
      }

      // Sesi konselor & user
      currentCounselorSession = window.CounselingService.getCurrentCounselorSession();
      const session = await window.AuthService.getSession();
      if (session && session.user) {
        currentUserSession = session.user;
      } else {
        const localEmail = localStorage.getItem('oase_active_user_email') || 'siswa@oase.id';
        currentUserSession = { email: localEmail, id: 'user-' + localEmail.replace(/[^a-zA-Z0-9]/g, '') };
      }

      updateRoleUI();

      // Navigasi Kembali ke Dashboard
      const goBack = () => {
        if (currentRole === 'counselor') {
          window.location.href = 'laman-konselor.html';
        } else {
          window.location.href = 'dashboard-user.html';
        }
      };
      backDashboardBtn.addEventListener('click', goBack);
      if (lockedBackBtn) lockedBackBtn.addEventListener('click', goBack);

      // Tombol Refresh Sesi Chat
      resetSessionChatBtn.title = "Muat ulang riwayat pesan";
      resetSessionChatBtn.addEventListener('click', async () => {
        const icon = resetSessionChatBtn.querySelector('i');
        if(icon) icon.classList.add('animate-spin');
        await syncMessages(true);
        setTimeout(() => { if(icon) icon.classList.remove('animate-spin') }, 500);
      });

      // Cari sesi konseling
      const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
      if (targetSessionId) {
        activeSession = sessions.find(s => s.id === targetSessionId);
      }
      if (!activeSession) {
        activeSession = sessions.find(s => s.status === 'aktif');
      }

      if (!activeSession) {
        alert('Sesi konseling tidak ditemukan atau telah berakhir.');
        goBack();
        return;
      }

      setupOpponentProfile();
      setupRatingModal();
      setupMotivationModal();

      // Cek apakah sesi sudah selesai sejak awal atau parameter readonly
      if (activeSession.status === 'selesai' || urlParams.get('readonly') === 'true') {
        lockChatUI(activeSession);
      } else {
        startSessionTimer();
      }

      await syncMessages(true);

      // Mulai sinkronisasi berkala setiap 1000ms (1 detik)
      setInterval(() => syncMessages(false), 1000);

      // Listener storage event antar-tab browser (seketika saat ada pesan baru atau sesi diakhiri di tab lawan)
      window.addEventListener('storage', (e) => {
        if (e.key === 'oase_session_messages' || e.key === 'oase_counseling_sessions') {
          syncMessages(false);
        }
      });
      window.addEventListener('oase_new_notification', () => {
        syncMessages(false);
      });

      setupChatPushNotification();
    }

    function setupChatPushNotification() {
      const btn = document.getElementById('chatPushNotifBtn');
      const label = document.getElementById('chatPushNotifLabel');
      if (!btn) return;

      const updateBtn = () => {
        if (!window.NotificationService || !window.NotificationService.isSupported()) {
          btn.classList.add('hidden');
          return;
        }
        const perm = window.NotificationService.getPermissionStatus();
        const muted = localStorage.getItem('oase_notif_muted') === 'true';
        if (perm === 'granted' && !muted) {
          btn.className = "px-2.5 py-1.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs";
          if (label) label.textContent = 'Notif Aktif';
        } else {
          btn.className = "px-2.5 py-1.5 rounded-xl border-2 border-heather-300 bg-white hover:bg-heather-50 text-heather-900 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs";
          if (label) label.textContent = (perm === 'granted' && muted) ? 'Notif Nonaktif' : 'Push Notif';
        }
      };

      updateBtn();

      btn.addEventListener('click', async () => {
        if (!window.NotificationService || !window.NotificationService.isSupported()) return;
        try {
          const perm = await window.NotificationService.requestPermission();
          updateBtn();
          if (perm === 'granted') {
            await window.NotificationService.sendNotification('Push Notifikasi Aktif 🔔', {
              body: 'Anda akan menerima pemberitahuan setiap ada pesan konseling baru di layar.',
              tag: 'oase-chat-activated'
            });
          }
        } catch (e) {}
      });
    }

    function updateRoleUI() {
      if (currentRole === 'counselor') {
        messageInput.placeholder = 'Tulis tanggapan empati untuk siswa...';
      } else {
        messageInput.placeholder = 'Ketik ceritamu untuk konselor...';
      }
      lucide.createIcons();
    }

    // 2. SETUP OPPONENT PROFILE IN HEADER
    function setupOpponentProfile() {
      if (!activeSession) return;

      if (currentRole === 'counselor') {
        opponentName.textContent = activeSession.user_name || 'Siswa OASE (Anonim)';
        sessionTopicMeta.textContent = `Topik: ${activeSession.topic} • 🔒 Identitas Siswa Anonim`;
        opponentAvatar.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80';
      } else {
        const counselorObj = (window.COUNSELORS_DATA || []).find(c => c.id === activeSession.counselor_id) || {
          name: activeSession.counselor_name || 'Konselor OASE',
          role: 'Konselor Terverifikasi OASE',
          avatar: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=200&h=200&q=80'
        };
        opponentName.textContent = counselorObj.name;
        sessionTopicMeta.textContent = `${counselorObj.role} • Topik: ${activeSession.topic}`;
        opponentAvatar.src = counselorObj.avatar;
      }
    }

    // 3. PENGUNCIAN OBROLAN DUA ARAH (LOCK CHAT SYNCHRONOUSLY)
    function lockChatUI(sessionData) {
      isSessionLocked = true;
      if (timerInterval) clearInterval(timerInterval);

      // Ubah status dan timer di header
      sessionTimerLabel.textContent = '00:00 (Selesai)';
      if (sessionStatusPill) {
        sessionStatusPill.textContent = '● Selesai';
        sessionStatusPill.className = 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] sm:text-[10px] font-bold flex-shrink-0';
      }

      // Ubah tombol Selesaikan jadi tombol Kembali
      endSessionBtn.innerHTML = `
        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
        <span class="hidden sm:inline">Kembali</span>
      `;
      endSessionBtn.className = "px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-oase-border bg-white hover:bg-heather-50 text-oase-muted hover:text-heather-700 text-xs font-bold transition-all flex items-center gap-1";
      endSessionBtn.onclick = () => {
        if (currentRole === 'counselor') {
          window.location.href = 'laman-konselor.html';
        } else {
          window.location.href = 'dashboard-user.html';
        }
      };

      // Sembunyikan form chat & rekam suara, tampilkan panel terkunci
      chatForm.classList.add('hidden');
      voiceRecordBar.classList.add('hidden');
      lockedChatNotice.classList.remove('hidden');

      // Tampilkan tombol aksi rating atau motivasi sesuai peran
      if (currentRole === 'user') {
        lockedRatingActionBtn.classList.remove('hidden');
        if (sessionData && sessionData.rating) {
          lockedRatingActionLabel.textContent = `Rating: ${'★'.repeat(sessionData.rating)} (${sessionData.rating}/5)`;
          lockedRatingActionBtn.onclick = () => userRatingModal.classList.remove('hidden');
        } else {
          lockedRatingActionLabel.textContent = 'Beri Rating Konselor';
          lockedRatingActionBtn.onclick = () => userRatingModal.classList.remove('hidden');
          // Munculkan otomatis modal rating sekali jika belum pernah dinilai
          if (!hasPromptedRating) {
            hasPromptedRating = true;
            setTimeout(() => {
              userRatingModal.classList.remove('hidden');
            }, 600);
          }
        }
      } else if (currentRole === 'counselor') {
        if (!sessionData || !sessionData.motivational_message) {
          lockedMotivationActionBtn.classList.remove('hidden');
          lockedMotivationActionBtn.onclick = () => counselorMotivationModal.classList.remove('hidden');
        } else {
          lockedMotivationActionBtn.classList.add('hidden');
        }
      }

      lucide.createIcons();
    }

    // 4. COUNTDOWN TIMER 30 MENIT & AKSI AKHIRI SESI
    function startSessionTimer() {
      if (timerInterval) clearInterval(timerInterval);
      const startTime = new Date(activeSession.started_at || activeSession.created_at).getTime();
      const durationMs = (activeSession.duration_minutes || 30) * 60 * 1000;
      const endTime = startTime + durationMs;

      const update = () => {
        const diff = endTime - Date.now();
        if (diff <= 0) {
          clearInterval(timerInterval);
          window.ChatSessionService.endSession(activeSession.id);
          activeSession.status = 'selesai';
          lockChatUI(activeSession);
          return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        sessionTimerLabel.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      };

      update();
      timerInterval = setInterval(update, 1000);

      endSessionBtn.addEventListener('click', async () => {
        if (isSessionLocked) return;

        if (currentRole === 'counselor') {
          // Konselor membuka formulir pesan semangat penutup terlebih dahulu
          counselorMotivationModal.classList.remove('hidden');
        } else {
          // Siswa mengonfirmasi penyelesaian sesi
          if (confirm('Apakah Anda yakin ingin menyelesaikan sesi konseling 30 menit ini?')) {
            await window.ChatSessionService.endSession(activeSession.id);
            activeSession.status = 'selesai';
            lockChatUI(activeSession);
          }
        }
      });
    }

    // 5. MODAL PESAN SEMANGAT DARI KONSELOR
    function setupMotivationModal() {
      // Quick chips template
      document.querySelectorAll('.quick-motivation-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          counselorMotivationInput.value = chip.textContent.trim().replace(/^🌟\s*|^💪\s*|^🌱\s*/, '');
        });
      });

      sendMotivationEndBtn.addEventListener('click', async () => {
        const msg = counselorMotivationInput.value.trim();
        sendMotivationEndBtn.disabled = true;
        sendMotivationEndBtn.textContent = 'Menyimpan...';

        await window.ChatSessionService.endSession(activeSession.id, msg);
        activeSession.status = 'selesai';
        activeSession.motivational_message = msg;
        counselorMotivationModal.classList.add('hidden');
        lockChatUI(activeSession);
        await syncMessages(true);
        sendMotivationEndBtn.disabled = false;
        sendMotivationEndBtn.innerHTML = `<i data-lucide="send" class="w-3.5 h-3.5"></i><span>Kirim & Selesaikan</span>`;
        lucide.createIcons();
      });

      skipMotivationEndBtn.addEventListener('click', async () => {
        skipMotivationEndBtn.disabled = true;
        await window.ChatSessionService.endSession(activeSession.id, null);
        activeSession.status = 'selesai';
        counselorMotivationModal.classList.add('hidden');
        lockChatUI(activeSession);
        skipMotivationEndBtn.disabled = false;
      });
    }

    // 6. MODAL RATING KONSELOR OLEH SISWA
    function setupRatingModal() {
      const starBtns = document.querySelectorAll('.star-btn');
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
            btn.className = 'star-btn text-amber-400 transition-transform hover:scale-125';
          } else {
            btn.className = 'star-btn text-gray-300 transition-transform hover:scale-125';
          }
        });
        starLabel.textContent = starTexts[val] || `${val} Bintang`;
      };

      starBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          selectedRating = parseInt(btn.getAttribute('data-val'));
          updateStarDisplay(selectedRating);
        });
      });

      closeRatingModalBtn.addEventListener('click', () => {
        userRatingModal.classList.add('hidden');
      });

      submitRatingBtn.addEventListener('click', async () => {
        submitRatingBtn.disabled = true;
        submitRatingBtn.textContent = 'Menyimpan...';

        const review = ratingReviewInput.value.trim();
        await window.ChatSessionService.rateSession(activeSession.id, selectedRating, review);
        
        activeSession.rating = selectedRating;
        activeSession.review = review;
        userRatingModal.classList.add('hidden');
        
        alert(`Terima kasih banyak! Penilaian ${selectedRating} bintang telah berhasil dikirimkan.`);
        lockedRatingActionLabel.textContent = `Rating: ${'★'.repeat(selectedRating)} (${selectedRating}/5)`;
        submitRatingBtn.disabled = false;
        submitRatingBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Kirim Penilaian</span>`;
        lucide.createIcons();
      });
    }

    // 7. REAL-TIME MESSAGE SYNC & RENDER (ALIRAN ALAMI: SAYA DI KANAN, LAWAN DI KIRI)
    async function syncMessages(forceScroll = false) {
      if (!activeSession) return;

      // Cek status sesi terkini dari penyimpanan lokal (apakah sesi diakhiri oleh lawan bicara)
      const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
      const fresh = sessions.find(s => s.id === activeSession.id);
      if (fresh) {
        activeSession = fresh;
        if (activeSession.status === 'selesai' && !isSessionLocked) {
          lockChatUI(activeSession);
        }
      }

      const messages = await window.ChatSessionService.getMessages(activeSession.id);

      // Cek apakah ada pesan berindikasi krisis
      const hasCrisis = messages.some(m => m.is_crisis);
      const chatCrisisBanner = document.getElementById('chatCrisisBanner');
      if (chatCrisisBanner) {
        if (hasCrisis && currentRole === 'counselor') {
          chatCrisisBanner.classList.remove('hidden');
        } else {
          chatCrisisBanner.classList.add('hidden');
        }
      }

      // Cek apakah ada pesan baru
      let hasNewMessage = false;
      messages.forEach(m => {
        if (!lastRenderedMessageIds.has(m.id)) {
          hasNewMessage = true;
          lastRenderedMessageIds.add(m.id);

          // Jika pesan berindikasi krisis dan berasal dari siswa, bunyikan alarm untuk konselor
          if (m.is_crisis && m.sender_type !== currentRole && currentRole === 'counselor' && window.AudioAlertService) {
            window.AudioAlertService.playCrisisAlarm();
          }

          // Jika pesan baru berasal dari lawan bicara dan bukan saat pertama kali membuka halaman
          if (!forceScroll && m.sender_type !== currentRole && window.NotificationService && localStorage.getItem('oase_notif_muted') !== 'true') {
            window.NotificationService.sendNotification(`Pesan baru dari ${m.sender_name}`, {
              body: m.message_type === 'voice' ? '🎙️ Mengirim pesan suara (Voice Note)' : (m.message_text || 'Pesan baru diterima'),
              tag: 'oase-msg-' + m.id
            });
          }
        }
      });

      if (!hasNewMessage && !forceScroll) return;

      renderAllMessages(messages);
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function renderAllMessages(messages) {
      chatMessagesContainer.innerHTML = `
        <div class="text-center py-2">
          <span class="px-3.5 py-1 rounded-full bg-white border border-heather-200 text-heather-800 text-[10px] sm:text-[11px] font-semibold shadow-2xs inline-block">
            🔒 Sesi konseling 30 menit terenkripsi secara aman dan rahasia (OASE Vault). Sampaikan cerita dengan tenang.
          </span>
        </div>
      `;

      // Setup foto profil
      const cObj = (window.COUNSELORS_DATA || []).find(c => c.id === activeSession.counselor_id) || {
        name: activeSession.counselor_name || 'Konselor OASE',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80'
      };
      const userPhoto = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80';

      let myPhoto = currentRole === 'counselor' ? cObj.avatar : userPhoto;
      let opponentPhoto = currentRole === 'counselor' ? userPhoto : cObj.avatar;

      messages.forEach(m => {
        // Jika pesan motivasi khusus dari konselor
        if (m.message_type === 'motivation') {
          const card = document.createElement('div');
          card.className = "w-full my-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50/60 to-heather-50 border border-heather-200 shadow-xs text-center space-y-2 animate-fadeIn";
          card.innerHTML = `
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-heather-200 text-heather-800 text-xs font-bold shadow-2xs">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i>
              <span>Pesan Semangat Penutup dari Konselor</span>
            </div>
            <p class="text-xs sm:text-sm text-oase-plum font-semibold italic whitespace-pre-line leading-relaxed max-w-md mx-auto">
              "${m.message_text}"
            </p>
            <span class="text-[10px] text-oase-muted block font-medium">— ${m.sender_name}</span>
          `;
          chatMessagesContainer.appendChild(card);
          return;
        }

        // isMe bernilai true jika sender_type persis sama dengan peran tab saat ini
        const isMe = m.sender_type === currentRole;
        const isCrisis = Boolean(m.is_crisis);
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`;

        // Konten teks atau audio Voice Note
        let bubbleContent = '';
        if (m.message_type === 'voice' && m.audio_data) {
          bubbleContent = `
            <div class="flex items-center gap-2 py-1">
              <audio src="${m.audio_data}" controls class="h-9 w-48 sm:w-60 max-w-full">
                Browser Anda tidak mendukung pemutar audio.
              </audio>
            </div>
          `;
        } else {
          bubbleContent = `<p class="whitespace-pre-line leading-relaxed text-xs sm:text-sm">${m.message_text}</p>`;
        }

        const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isMe) {
          // PESAN SAYA SENDIRI: Rapi di KANAN dengan foto profil rapi di samping balon
          msgDiv.innerHTML = `
            <img src="${myPhoto}" alt="Avatar Saya" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-heather-200 shadow-2xs flex-shrink-0 mb-1">
            <div class="p-3 sm:p-3.5 rounded-2xl rounded-br-xs ${isCrisis ? 'bg-rose-700 text-white border-2 border-rose-300' : 'bg-heather-500 text-white'} shadow-xs">
              <span class="block text-[9px] sm:text-[10px] font-bold text-heather-100 mb-1 text-right flex items-center justify-end gap-1">
                ${isCrisis ? '<span class="px-1.5 py-0.5 rounded bg-white text-rose-800 text-[9px] font-extrabold">🚨 Krisis</span>' : ''}
                <span>${currentRole === 'counselor' ? 'Anda (Konselor)' : 'Anda (Siswa)'}</span>
              </span>
              ${bubbleContent}
              <span class="block text-[9px] sm:text-[10px] mt-1 text-right text-heather-200 font-medium">
                ${timeStr}
              </span>
            </div>
          `;
        } else {
          // PESAN LAWAN BICARA: Rapi di KIRI dengan foto profil asli lawan bicara
          const senderRoleLabel = m.sender_type === 'counselor' ? 'Konselor' : 'Siswa';
          msgDiv.innerHTML = `
            <img src="${opponentPhoto}" alt="Avatar Lawan Bicara" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-heather-200 flex-shrink-0 shadow-2xs mb-1">
            <div class="p-3 sm:p-3.5 rounded-2xl rounded-bl-xs ${isCrisis ? 'bg-rose-50 border-2 border-rose-400 text-rose-950 ring-2 ring-rose-200' : 'bg-white border border-heather-200 text-oase-plum'} shadow-xs">
              <span class="block text-[10px] font-bold ${isCrisis ? 'text-rose-700' : 'text-heather-600'} mb-1 flex items-center justify-between gap-1">
                <span>${m.sender_name} (${senderRoleLabel})</span>
                ${isCrisis ? '<span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold animate-pulse">🚨 Perhatian: Krisis</span>' : ''}
              </span>
              ${bubbleContent}
              <span class="block text-[9px] sm:text-[10px] mt-1 text-right text-oase-muted font-medium">
                ${timeStr}
              </span>
            </div>
          `;
        }

        chatMessagesContainer.appendChild(msgDiv);
      });
      lucide.createIcons();
    }

    // 5. SEND TEXT MESSAGE (OTOMATIS SESUAI PERAN TAB INI)
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text || !activeSession) return;
      messageInput.value = '';

      let senderId, senderName;
      if (currentRole === 'counselor') {
        senderId = (currentCounselorSession && currentCounselorSession.id) || activeSession.counselor_id || 'counselor-1';
        senderName = (currentCounselorSession && currentCounselorSession.name) || activeSession.counselor_name || 'Konselor OASE';
      } else {
        senderId = (currentUserSession && currentUserSession.id) || activeSession.user_id || 'user-1';
        senderName = (currentUserSession && currentUserSession.display_name) || activeSession.user_name || 'Sahabat OASE';
      }

      await window.ChatSessionService.sendMessage({
        sessionId: activeSession.id,
        senderId,
        senderName,
        senderType: currentRole,
        messageType: 'text',
        messageText: text
      });

      await syncMessages(true);
    });

    // 6. VOICE NOTE RECORDER (OTOMATIS SESUAI PERAN TAB INI)
    let isRecordingVoice = false;
    micBtn.addEventListener('click', async () => {
      if(isRecordingVoice) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Peramban Anda tidak mendukung perekaman mikrofon.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isRecordingVoice = true;
        messageInput.disabled = true;
        messageInput.placeholder = 'Sedang merekam suara...';
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunks.push(ev.data);
        };

        mediaRecorder.start();
        recordStart = Date.now();
        voiceRecordBar.classList.remove('hidden');

        if (recordInterval) clearInterval(recordInterval);
        recordInterval = setInterval(() => {
          const diff = Math.floor((Date.now() - recordStart) / 1000);
          const m = String(Math.floor(diff / 60)).padStart(2, '0');
          const s = String(diff % 60).padStart(2, '0');
          recordTimerLabel.textContent = `${m}:${s}`;
        }, 1000);

      } catch (err) {
        alert('Gagal mengakses mikrofon: ' + err.message);
      }
    });

    function resetRecordingUI() {
      isRecordingVoice = false;
      messageInput.disabled = false;
      updateRoleUI();
      voiceRecordBar.classList.add('hidden');
    }
    cancelRecordBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
      clearInterval(recordInterval);
      resetRecordingUI();
    });

    sendRecordBtn.addEventListener('click', () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

      mediaRecorder.onstop = async () => {
        clearInterval(recordInterval);
        resetRecordingUI();
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          let senderId, senderName;
          if (currentRole === 'counselor') {
            senderId = (currentCounselorSession && currentCounselorSession.id) || activeSession.counselor_id || 'counselor-1';
            senderName = (currentCounselorSession && currentCounselorSession.name) || activeSession.counselor_name || 'Konselor OASE';
          } else {
            senderId = (currentUserSession && currentUserSession.id) || activeSession.user_id || 'user-1';
            senderName = (currentUserSession && currentUserSession.display_name) || activeSession.user_name || 'Sahabat OASE';
          }

          await window.ChatSessionService.sendMessage({
            sessionId: activeSession.id,
            senderId,
            senderName,
            senderType: currentRole,
            messageType: 'voice',
            audioData: reader.result
          });

          await syncMessages(true);
        };
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.stop();
    });

    // 7. BANTUAN DARURAT & LAPORAN BUG HANDLERS
    const chatEmergencyHelpBtn = document.getElementById('chatEmergencyHelpBtn');
    const emergencyHelpModal = document.getElementById('emergencyHelpModal');
    const closeEmergencyModalBtn = document.getElementById('closeEmergencyModalBtn');
    const tabEmergencyBtn = document.getElementById('tabEmergencyBtn');
    const tabBugReportBtn = document.getElementById('tabBugReportBtn');
    const emergencyTabContent = document.getElementById('emergencyTabContent');
    const bugReportTabContent = document.getElementById('bugReportTabContent');
    const sendBugWhatsAppBtn = document.getElementById('sendBugWhatsAppBtn');
    const sendBugEmailBtn = document.getElementById('sendBugEmailBtn');
    const bugCategorySelect = document.getElementById('bugCategorySelect');
    const bugDescriptionInput = document.getElementById('bugDescriptionInput');
    const chatPlayCrisisAlarmBtn = document.getElementById('chatPlayCrisisAlarmBtn');

    if (chatPlayCrisisAlarmBtn) {
      chatPlayCrisisAlarmBtn.addEventListener('click', () => {
        if (window.AudioAlertService) {
          window.AudioAlertService.playCrisisAlarm();
        }
      });
    }

    if (chatEmergencyHelpBtn && emergencyHelpModal) {
      chatEmergencyHelpBtn.addEventListener('click', () => {
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

    if (sendBugWhatsAppBtn) {
      sendBugWhatsAppBtn.addEventListener('click', () => {
        const category = bugCategorySelect.value;
        const desc = bugDescriptionInput.value.trim();
        if (!desc) {
          alert('Mohon isi deskripsi bug atau kendala yang Anda alami.');
          return;
        }
        const text = encodeURIComponent(`Halo Tim IT OASE Cerita, saya ingin melaporkan bug pada Ruang Chat:\n\n*Kategori:* ${category}\n*Deskripsi:* ${desc}`);
        window.open(`https://wa.me/6281234567890?text=${text}`, '_blank');
      });
    }

    if (sendBugEmailBtn) {
      sendBugEmailBtn.addEventListener('click', () => {
        const category = bugCategorySelect.value;
        const desc = bugDescriptionInput.value.trim();
        if (!desc) {
          alert('Mohon isi deskripsi bug atau kendala yang Anda alami.');
          return;
        }
        const subject = encodeURIComponent(`[Laporan Bug Chat OASE] - ${category}`);
        const body = encodeURIComponent(`Halo Tim IT OASE Cerita,\n\nSaya ingin melaporkan kendala pada Ruang Chat OASE Cerita:\n\nKategori: ${category}\nDeskripsi: ${desc}\n\nTerima kasih.`);
        window.location.href = `mailto:support@oase.id?subject=${subject}&body=${body}`;
      });
    }

    // Run on startup
    initChat();







