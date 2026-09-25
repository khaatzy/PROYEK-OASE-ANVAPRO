    lucide.createIcons();

    // State Variables
    let currentSession = null;
    let allQueueStories = [];
    let activeCategory = 'all';
    let activeStatus = 'all';
    let currentSelectedTicket = null;

    // DOM Elements
    const counselorLoginModal = document.getElementById('counselorLoginModal');
    const counselorLoginForm = document.getElementById('counselorLoginForm');
    const counselorEmailInput = document.getElementById('counselorEmailInput');
    const counselorPasswordInput = document.getElementById('counselorPasswordInput');
    const rememberMeCheckbox = document.getElementById('rememberMeCheckbox');
    const logoutBtn = document.getElementById('logoutBtn');

    const greetingHeading = document.getElementById('greetingHeading');
    const navCounselorAvatar = document.getElementById('navCounselorAvatar');
    const navCounselorName = document.getElementById('navCounselorName');
    const navCounselorRole = document.getElementById('navCounselorRole');

    const statQueueCount = document.getElementById('statQueueCount');
    const statAnsweredCount = document.getElementById('statAnsweredCount');
    const statTotalCount = document.getElementById('statTotalCount');

    const queueContainer = document.getElementById('queueContainer');
    const searchKeywordInput = document.getElementById('searchKeywordInput');
    const refreshQueueBtn = document.getElementById('refreshQueueBtn');

    // Modals
    const responseModal = document.getElementById('responseModal');
    const closeResponseModalBtn = document.getElementById('closeResponseModalBtn');
    const modalTicketBadge = document.getElementById('modalTicketBadge');
    const modalCategoryBadge = document.getElementById('modalCategoryBadge');
    const modalTimeBadge = document.getElementById('modalTimeBadge');
    const modalAuthorName = document.getElementById('modalAuthorName');
    const modalAuthorMeta = document.getElementById('modalAuthorMeta');
    const modalStoryContent = document.getElementById('modalStoryContent');
    const counselorReplyTextarea = document.getElementById('counselorReplyTextarea');
    const replyWordCount = document.getElementById('replyWordCount');
    const replyStoryForm = document.getElementById('replyStoryForm');
    const submitReplyBtn = document.getElementById('submitReplyBtn');

    const triggerTransferBtn = document.getElementById('triggerTransferBtn');
    const transferModal = document.getElementById('transferModal');
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    const cancelTransferBtn = document.getElementById('cancelTransferBtn');
    const transferForm = document.getElementById('transferForm');
    const transferCounselorSelect = document.getElementById('transferCounselorSelect');
    const transferReasonTextarea = document.getElementById('transferReasonTextarea');

    // 1. CHECK COUNSELOR AUTH ON LOAD
    function checkAuth() {
      currentSession = window.CounselingService.getCurrentCounselorSession();
      if (!currentSession || currentSession.role !== 'counselor') {
        counselorLoginModal.classList.remove('hidden');
        return false;
      }

      counselorLoginModal.classList.add('hidden');
      setupGreeting();
      loadQueue();
      return true;
    }

    // Greet counselor warmly based on local time
    function setupGreeting() {
      if (!currentSession) return;

      // Sinkronkan nama dan info konselor secara otomatis dengan data terbaru di counselors.js
      if (window.COUNSELORS_DATA) {
        const fresh = window.COUNSELORS_DATA.find(c => c.id === currentSession.id);
        if (fresh) {
          currentSession.name = fresh.name;
          currentSession.avatar = fresh.avatar || currentSession.avatar;
          currentSession.email = fresh.email || currentSession.email;
        }
      }

      const hour = new Date().getHours();
      let timeGreeting = 'Selamat Pagi';
      if (hour >= 11 && hour < 15) timeGreeting = 'Selamat Siang';
      else if (hour >= 15 && hour < 18) timeGreeting = 'Selamat Sore';
      else if (hour >= 18 || hour < 4) timeGreeting = 'Selamat Malam';

      greetingHeading.innerHTML = `${timeGreeting}, <span class="text-heather-600">${currentSession.name}</span>.`;
      navCounselorAvatar.src = currentSession.avatar || 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=200&h=200&q=80';
      navCounselorName.textContent = currentSession.name;

      // Ambil dan tampilkan rating dinamis konselor
      if (window.getCounselorRatingInfo && currentSession.id) {
        const rInfo = window.getCounselorRatingInfo(currentSession.id);
        const statCounselorRating = document.getElementById('statCounselorRating');
        if (statCounselorRating) {
          statCounselorRating.textContent = `⭐ ${rInfo.average}`;
        }
        navCounselorRole.textContent = `⭐ ${rInfo.average} • ${currentSession.email}`;
      } else {
        navCounselorRole.textContent = currentSession.email;
      }
    }

    // Helper: Relative time format
    function getRelativeTime(isoDateStr) {
      if (!isoDateStr) return 'Baru saja';
      const past = new Date(isoDateStr).getTime();
      const diffMs = Date.now() - past;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    }

    // 2. LOAD QUEUE STORIES
    async function loadQueue() {
      queueContainer.innerHTML = `
        <div class="col-span-full py-16 text-center text-oase-muted">
          <div class="w-10 h-10 border-4 border-heather-200 border-t-heather-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-sm font-medium">Memuat antrean cerita masuk...</p>
        </div>
      `;

      try {
        allQueueStories = await window.CounselingService.getAllSubmissions({ category: 'all', status: 'all' });
        
        // Peringatan Bunyi Alarm Krisis jika ada kasus darurat yang belum ditangani
        const unhandledCrisis = allQueueStories.filter(s => s.is_crisis && s.status !== 'sudah_dibalas');
        if (unhandledCrisis.length > 0 && window.AudioAlertService) {
          window.AudioAlertService.playCrisisAlarm();
        }

        renderQueue();
      } catch (err) {
        console.error('Gagal mengambil antrean:', err);
        queueContainer.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 text-sm">Gagal memuat antrean cerita. Silakan coba lagi.</div>`;
      }
    }

    // Render Filtered Queue
    function renderQueue() {
      let filtered = [...allQueueStories];

      // Filter Kategori
      if (activeCategory !== 'all') {
        filtered = filtered.filter(s => s.category === activeCategory);
      }

      // Filter Status
      if (activeStatus !== 'all') {
        filtered = filtered.filter(s => s.status === activeStatus);
      }

      // Filter Keyword
      const q = searchKeywordInput.value.trim().toLowerCase();
      if (q) {
        filtered = filtered.filter(s => 
          (s.ticket_code && s.ticket_code.toLowerCase().includes(q)) ||
          (s.author_name && s.author_name.toLowerCase().includes(q)) ||
          (s.story_content && s.story_content.toLowerCase().includes(q))
        );
      }

      // Update Summary Stats
      const waitingCount = allQueueStories.filter(s => s.status !== 'sudah_dibalas').length;
      const answeredCount = allQueueStories.filter(s => s.status === 'sudah_dibalas').length;
      statQueueCount.textContent = waitingCount;
      statAnsweredCount.textContent = answeredCount;
      statTotalCount.textContent = allQueueStories.length;

      // Update Top Crisis Alert Banner
      const crisisAlertBanner = document.getElementById('crisisAlertBanner');
      const crisisAlertBannerText = document.getElementById('crisisAlertBannerText');
      const unhandledCrisisStories = allQueueStories.filter(s => s.is_crisis && s.status !== 'sudah_dibalas');
      if (crisisAlertBanner) {
        if (unhandledCrisisStories.length > 0) {
          crisisAlertBanner.classList.remove('hidden');
          if (crisisAlertBannerText) {
            crisisAlertBannerText.textContent = `Ditemukan ${unhandledCrisisStories.length} cerita berindikasi krisis/melukai diri sendiri. Mohon prioritaskan respon atau rujuk ke Hotline 119!`;
          }
        } else {
          crisisAlertBanner.classList.add('hidden');
        }
      }

      if (filtered.length === 0) {
        queueContainer.innerHTML = `
          <div class="col-span-full py-16 text-center space-y-3 bg-white rounded-3xl border border-oase-border">
            <div class="w-12 h-12 rounded-2xl bg-heather-50 text-heather-500 flex items-center justify-center mx-auto">
              <i data-lucide="inbox" class="w-6 h-6"></i>
            </div>
            <p class="text-base font-bold text-oase-plum">Tidak ada antrean cerita pada filter ini</p>
            <p class="text-xs text-oase-muted">Semua cerita telah tertangani atau belum ada yang masuk untuk kategori ini.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      // PRIORITAS UTAMA: Kasus KRISIS yang belum dijawab ditempatkan di paling atas antrean!
      filtered.sort((a, b) => {
        const aCrisisUnanswered = Boolean(a.is_crisis && a.status !== 'sudah_dibalas');
        const bCrisisUnanswered = Boolean(b.is_crisis && b.status !== 'sudah_dibalas');
        if (aCrisisUnanswered && !bCrisisUnanswered) return -1;
        if (!aCrisisUnanswered && bCrisisUnanswered) return 1;
        return 0;
      });

      queueContainer.innerHTML = '';
      filtered.forEach((story, idx) => {
        const isAnswered = story.status === 'sudah_dibalas';
        const isCrisis = Boolean(story.is_crisis);
        const card = document.createElement('div');
        
        // Desain bingkai khusus jika kasus berindikasi krisis/melukai diri sendiri
        card.className = (isCrisis && !isAnswered)
          ? "bg-rose-50/30 rounded-3xl p-5 sm:p-6 border-2 border-rose-500 shadow-lg shadow-rose-500/10 space-y-4 flex flex-col justify-between transition-all"
          : "bg-white rounded-3xl p-5 sm:p-6 border border-oase-border/90 hover:border-heather-300 hover:shadow-lg hover:shadow-heather-500/5 transition-all space-y-4 flex flex-col justify-between";

        const relativeTime = getRelativeTime(story.created_at);
        const isAnon = story.is_anonymous || story.grade_class === 'Anonim' || (story.author_name && story.author_name.startsWith('Sahabat Anonim'));

        card.innerHTML = `
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-mono text-xs font-bold text-heather-700 bg-heather-50 px-2.5 py-1 rounded-lg border border-heather-200">${story.ticket_code}</span>
                ${isCrisis ? '<span class="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs animate-pulse"><i data-lucide="alert-triangle" class="w-3 h-3"></i> 🚨 KRISIS: Respon Cepat</span>' : ''}
                ${isAnon ? '<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1"><i data-lucide="shield-check" class="w-3 h-3 text-rose-600"></i> Curhat Anonim</span>' : ''}
              </div>
              ${isAnswered 
                ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">✓ Sudah Dibalas</span>'
                : (isCrisis 
                    ? '<span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-extrabold border border-rose-300">🔥 Butuh Penanganan Segera</span>'
                    : '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">⏳ Menunggu Respons</span>'
                  )
              }
            </div>

            <div class="flex items-center justify-between text-xs text-oase-muted">
              <span class="font-semibold text-oase-plum flex items-center gap-1.5">
                <i data-lucide="user" class="w-3.5 h-3.5 text-heather-500"></i>
                <span>${story.author_name}</span>
                <span class="text-[10px] text-oase-muted font-normal">(${story.education_level}${story.grade_class ? ' • ' + story.grade_class : ''})</span>
              </span>
              <span class="flex items-center gap-1 text-[11px]">
                <i data-lucide="clock" class="w-3 h-3"></i>
                <span>${relativeTime}</span>
              </span>
            </div>

            <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-heather-50/70 border border-heather-200 text-heather-800 text-[11px] font-semibold">
              <i data-lucide="tag" class="w-3 h-3 text-heather-500"></i>
              <span>${story.category}</span>
            </div>

            <p class="text-xs ${isCrisis ? 'text-rose-950 font-medium bg-rose-50/60 border border-rose-200' : 'text-oase-muted bg-oase-surface/50 border border-oase-border/50'} leading-relaxed line-clamp-3 p-3 rounded-xl italic">
              "${story.story_content}"
            </p>

            ${story.transferred_from_name ? `
              <div class="p-2 rounded-lg bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-1.5">
                <i data-lucide="arrow-right-left" class="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5"></i>
                <span>Dialihkan dari <strong>${story.transferred_from_name}</strong>: "${story.transfer_reason || ''}"</span>
              </div>
            ` : ''}
          </div>

          <div class="pt-3 border-t border-oase-border flex items-center justify-between gap-2 flex-wrap">
            <span class="text-[11px] text-oase-muted">Ditugaskan ke: <strong>${story.counselor_name}</strong></span>
            <div class="flex items-center gap-1.5">
              ${isAnswered ? `
                <button type="button" class="delete-story-btn px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1" data-code="${story.ticket_code}" title="Hapus curhat yang sudah selesai dijawab">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  <span class="hidden sm:inline">Hapus</span>
                </button>
              ` : ''}
              <button class="open-respond-btn px-4 py-2 rounded-xl ${isAnswered ? 'bg-heather-50 text-heather-700 hover:bg-heather-100' : (isCrisis ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/30' : 'bg-heather-500 text-white hover:bg-heather-600')} text-xs font-bold transition-all shadow-xs flex items-center gap-1.5" data-code="${story.ticket_code}">
                <i data-lucide="${isAnswered ? 'eye' : (isCrisis ? 'alert-triangle' : 'message-circle')}" class="w-3.5 h-3.5"></i>
                <span>${isAnswered ? 'Lihat Tanggapan' : (isCrisis ? 'Tanggapi Krisis Sekarang' : 'Tanggapi Cerita')}</span>
              </button>
            </div>
          </div>
        `;

        // Event: Tanggapi / Lihat Tanggapan
        card.querySelector('.open-respond-btn').addEventListener('click', () => {
          openResponseModal(story);
        });

        // Event: Hapus Curhatan yang Sudah Dijawab (sesuai permintaan user)
        const deleteBtn = card.querySelector('.delete-story-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Apakah Anda yakin ingin menghapus curhat dengan tiket ${story.ticket_code}? Riwayat ini akan dihapus secara permanen.`)) {
              try {
                await window.CounselingService.deleteSubmission(story.ticket_code);
                alert(`Curhat ${story.ticket_code} berhasil dihapus.`);
                await loadQueue();
              } catch (err) {
                alert('Gagal menghapus: ' + err.message);
              }
            }
          });
        }

        queueContainer.appendChild(card);
      });

      lucide.createIcons();
    }

    // 3. OPEN RESPONSE INTERFACE MODAL
    function openResponseModal(story) {
      currentSelectedTicket = story;
      modalTicketBadge.textContent = story.ticket_code;
      modalCategoryBadge.textContent = story.category;
      modalTimeBadge.textContent = getRelativeTime(story.created_at);
      modalAuthorName.textContent = story.author_name;
      modalAuthorMeta.textContent = `${story.education_level} ${story.grade_class ? ' • ' + story.grade_class : ''} • Jenis Kelamin: ${story.gender}`;
      modalStoryContent.textContent = story.story_content;

      // Pre-fill existing reply if any
      counselorReplyTextarea.value = story.counselor_reply || '';
      updateReplyWordCount();

      responseModal.classList.remove('hidden');
    }

    closeResponseModalBtn.addEventListener('click', () => {
      responseModal.classList.add('hidden');
    });

    // Word count in response textarea
    function updateReplyWordCount() {
      const words = counselorReplyTextarea.value.trim() ? counselorReplyTextarea.value.trim().split(/\s+/).length : 0;
      replyWordCount.textContent = `${words} kata`;
    }
    counselorReplyTextarea.addEventListener('input', updateReplyWordCount);

    // Submit Reply
    replyStoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentSelectedTicket) return;

      const replyContent = counselorReplyTextarea.value.trim();
      if (!replyContent) return;

      submitReplyBtn.disabled = true;
      submitReplyBtn.innerHTML = `Mengirim Balasan...`;

      try {
        await window.CounselingService.replySubmission(
          currentSelectedTicket.ticket_code,
          replyContent,
          currentSession ? currentSession.name : 'Konselor OASE'
        );

        alert(`Tanggapan berhasil dikirim! Pengirim dengan kode tiket ${currentSelectedTicket.ticket_code} dapat melihat balasan ini.`);
        responseModal.classList.add('hidden');
        await loadQueue();
      } catch (err) {
        console.error('Gagal membalas:', err);
        alert('Gagal mengirim balasan. Silakan coba lagi.');
      } finally {
        submitReplyBtn.disabled = false;
        submitReplyBtn.innerHTML = `
          <i data-lucide="send" class="w-4 h-4"></i>
          <span>Kirim Balasan Resmi</span>
        `;
        lucide.createIcons();
      }
    });

    // 4. TRANSFER / REFERRAL MODAL
    triggerTransferBtn.addEventListener('click', () => {
      if (!currentSelectedTicket) return;
      populateCounselorOptions();
      transferModal.classList.remove('hidden');
    });

    closeTransferModalBtn.addEventListener('click', () => transferModal.classList.add('hidden'));
    cancelTransferBtn.addEventListener('click', () => transferModal.classList.add('hidden'));

    function populateCounselorOptions() {
      const counselors = window.COUNSELORS_DATA || [];
      transferCounselorSelect.innerHTML = '';

      counselors.forEach(c => {
        if (c.id === 'auto') return;
        // Don't show current counselor if matches
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.name} (${c.role})`;
        transferCounselorSelect.appendChild(option);
      });
    }

    transferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentSelectedTicket) return;

      const newId = transferCounselorSelect.value;
      const selectedCounselorObj = (window.COUNSELORS_DATA || []).find(c => c.id === newId);
      const newName = selectedCounselorObj ? selectedCounselorObj.name : 'Konselor Lain';
      const reason = transferReasonTextarea.value.trim();

      const confirmBtn = document.getElementById('confirmTransferBtn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Mengalihkan...';

      try {
        await window.CounselingService.transferSubmission({
          ticketCode: currentSelectedTicket.ticket_code,
          newCounselorId: newId,
          newCounselorName: newName,
          transferredFromName: currentSession ? currentSession.name : 'Konselor',
          transferReason: reason
        });

        alert(`Kasus ${currentSelectedTicket.ticket_code} berhasil dialihkan ke ${newName}!`);
        transferModal.classList.add('hidden');
        responseModal.classList.add('hidden');
        transferReasonTextarea.value = '';
        await loadQueue();
      } catch (err) {
        console.error('Gagal transfer:', err);
        alert('Gagal mengalihkan kasus. Coba lagi nanti.');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `
          <i data-lucide="check" class="w-4 h-4"></i>
          <span>Konfirmasi Alihkan Kasus</span>
        `;
        lucide.createIcons();
      }
    });

    // 5. CATEGORY & STATUS FILTER HANDLERS
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category');
        renderQueue();
      });
    });

    document.querySelectorAll('.status-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.status-tab').forEach(t => {
          t.classList.remove('font-bold', 'text-heather-700', 'underline', 'decoration-2', 'underline-offset-4');
          t.classList.add('text-oase-muted');
        });
        tab.classList.add('font-bold', 'text-heather-700', 'underline', 'decoration-2', 'underline-offset-4');
        tab.classList.remove('text-oase-muted');
        activeStatus = tab.getAttribute('data-status');
        renderQueue();
      });
    });

    searchKeywordInput.addEventListener('input', renderQueue);
    refreshQueueBtn.addEventListener('click', loadQueue);

    // 6. LOGIN HANDLER
    counselorLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = counselorEmailInput.value.trim();
      const password = counselorPasswordInput.value;
      const rememberMe = rememberMeCheckbox.checked;

      try {
        currentSession = window.CounselingService.loginCounselor({ email, password, rememberMe });
        checkAuth();
      } catch (err) {
        alert(err.message || 'Login gagal. Periksa email dan password.');
      }
    });

    // 7. LOGOUT HANDLER
    logoutBtn.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin keluar dari Portal Konselor?')) {
        window.CounselingService.logoutCounselor();
        location.reload();
      }
    });

    // 8. NOTIFIKASI & MODE TAB LIVE CHAT & RIWAYAT SELESAI
    const tabModeQueue = document.getElementById('tabModeQueue');
    const tabModeLiveChat = document.getElementById('tabModeLiveChat');
    const tabModeHistory = document.getElementById('tabModeHistory');
    const queueSection = document.getElementById('queueSection');
    const liveChatSection = document.getElementById('liveChatSection');
    const historySection = document.getElementById('historySection');
    const liveChatCountBadge = document.getElementById('liveChatCountBadge');
    const historyCountBadge = document.getElementById('historyCountBadge');
    const liveSessionsListContainer = document.getElementById('liveSessionsListContainer');
    const historySessionsListContainer = document.getElementById('historySessionsListContainer');
    const refreshLiveSessionsBtn = document.getElementById('refreshLiveSessionsBtn');
    const refreshHistorySessionsBtn = document.getElementById('refreshHistorySessionsBtn');

    const counselorNotifBellBtn = document.getElementById('counselorNotifBellBtn');
    const counselorNotifDropdown = document.getElementById('counselorNotifDropdown');
    const counselorNotifBadge = document.getElementById('counselorNotifBadge');
    const counselorNotifList = document.getElementById('counselorNotifList');
    const clearCounselorNotifBtn = document.getElementById('clearCounselorNotifBtn');

    // 3-Way Tab Switching
    function switchCounselorTab(target) {
      const activeClass = 'px-5 py-2.5 rounded-2xl bg-heather-500 text-white font-bold text-xs shadow-sm flex items-center justify-center sm:justify-start gap-2 transition-all relative';
      const inactiveClass = 'px-5 py-2.5 rounded-2xl bg-white border border-oase-border hover:bg-heather-50 text-oase-muted font-bold text-xs flex items-center justify-center sm:justify-start gap-2 transition-all relative';

      if (tabModeQueue) tabModeQueue.className = target === 'queue' ? activeClass : inactiveClass;
      if (tabModeLiveChat) tabModeLiveChat.className = target === 'live' ? activeClass : inactiveClass;
      if (tabModeHistory) tabModeHistory.className = target === 'history' ? activeClass : inactiveClass;

      if (queueSection) queueSection.classList.toggle('hidden', target !== 'queue');
      if (liveChatSection) liveChatSection.classList.toggle('hidden', target !== 'live');
      if (historySection) historySection.classList.toggle('hidden', target !== 'history');

      if (target === 'live') loadLiveSessions();
      if (target === 'history') loadHistorySessions();
    }

    if (tabModeQueue) tabModeQueue.addEventListener('click', () => switchCounselorTab('queue'));
    if (tabModeLiveChat) tabModeLiveChat.addEventListener('click', () => switchCounselorTab('live'));
    if (tabModeHistory) tabModeHistory.addEventListener('click', () => switchCounselorTab('history'));

    if (refreshLiveSessionsBtn) refreshLiveSessionsBtn.addEventListener('click', loadLiveSessions);
    if (refreshHistorySessionsBtn) refreshHistorySessionsBtn.addEventListener('click', loadHistorySessions);

    // Notifications
    if (counselorNotifBellBtn) {
      counselorNotifBellBtn.addEventListener('click', () => {
        counselorNotifDropdown.classList.toggle('hidden');
      });
    }

    function loadCounselorNotifs() {
      if (!window.ChatSessionService) return;
      const notifs = window.ChatSessionService.getNotifications();
      if (!counselorNotifList) return;

      if (!notifs || notifs.length === 0) {
        counselorNotifList.innerHTML = `<p class="text-xs text-center text-oase-muted py-4">Belum ada pemberitahuan baru.</p>`;
        if (counselorNotifBadge) counselorNotifBadge.classList.add('hidden');
        return;
      }
      if (counselorNotifBadge) counselorNotifBadge.classList.remove('hidden');
      counselorNotifList.innerHTML = '';
      notifs.forEach(n => {
        const item = document.createElement('div');
        item.className = "p-2.5 rounded-xl bg-heather-50/60 hover:bg-heather-100/60 border border-heather-100 text-xs space-y-1 transition-all cursor-pointer";
        item.innerHTML = `
          <div class="font-bold text-oase-plum flex items-center justify-between">
            <span>${n.title || 'Pemberitahuan'}</span>
            <span class="text-[10px] text-oase-muted">${new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <p class="text-oase-muted leading-relaxed">${n.message}</p>
          ${n.sessionId ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-heather-600 mt-0.5"><i data-lucide="arrow-right" class="w-3 h-3"></i> Buka Obrolan</span>` : ''}
        `;
        if (n.sessionId) {
          item.addEventListener('click', () => {
            sessionStorage.setItem('oase_active_chat_role', 'counselor');
            window.location.href = 'ruang-chat.html?sessionId=' + n.sessionId + '&role=counselor';
          });
        }
        counselorNotifList.appendChild(item);
      });
      lucide.createIcons();
    }

    if (clearCounselorNotifBtn) {
      clearCounselorNotifBtn.addEventListener('click', () => {
        localStorage.setItem('oase_notifications', '[]');
        loadCounselorNotifs();
      });
    }

    window.addEventListener('oase_new_notification', () => {
      loadCounselorNotifs();
      loadLiveSessions();
      loadHistorySessions();
    });

    // Load Live Sessions for this counselor & all active students
    async function loadLiveSessions() {
      if (!currentSession || !liveSessionsListContainer) return;
      const allSessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
      
      const mySessions = allSessions.filter(s => s.counselor_id === currentSession.id && s.status === 'aktif');
      const otherSessions = allSessions.filter(s => s.counselor_id !== currentSession.id && s.status === 'aktif');
      const totalActive = mySessions.length + otherSessions.length;

      if (liveChatCountBadge) {
        if (totalActive > 0) {
          liveChatCountBadge.textContent = totalActive;
          liveChatCountBadge.classList.remove('hidden');
        } else {
          liveChatCountBadge.classList.add('hidden');
        }
      }

      if (totalActive === 0) {
        liveSessionsListContainer.innerHTML = `
          <div class="col-span-full py-12 text-center space-y-2 bg-oase-surface/50 rounded-2xl border border-dashed border-oase-border">
            <div class="w-10 h-10 rounded-xl bg-heather-100 text-heather-600 flex items-center justify-center mx-auto">
              <i data-lucide="coffee" class="w-5 h-5"></i>
            </div>
            <p class="text-sm font-bold text-oase-plum">Belum Ada Sesi Konseling yang Sedang Berjalan</p>
            <p class="text-xs text-oase-muted">Siswa yang melakukan booking sesi chat 30 menit akan otomatis muncul di sini dan memberikan notifikasi.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      liveSessionsListContainer.innerHTML = '';
      mySessions.forEach(s => {
        liveSessionsListContainer.appendChild(createCounselorSessionCard(s, true));
      });
      otherSessions.forEach(s => {
        liveSessionsListContainer.appendChild(createCounselorSessionCard(s, false));
      });
      lucide.createIcons();
    }

    function createCounselorSessionCard(s, isDirectlyAssigned) {
      const card = document.createElement('div');
      card.className = "bg-white p-5 rounded-2xl border border-heather-200 hover:shadow-md transition-all space-y-3 flex flex-col justify-between";
      card.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full ${isDirectlyAssigned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold">
              ${isDirectlyAssigned ? '🔴 Sesi Aktif untuk Anda' : `⚡ Sesi Terbuka (${s.counselor_name})`}
            </span>
            <span class="text-[11px] text-oase-muted font-medium">${getRelativeTime(s.started_at)}</span>
          </div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-extrabold text-oase-plum">${s.user_name || 'Siswa Anonim'}</h3>
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">🔒 Anonim</span>
          </div>
          <p class="text-xs text-heather-700 font-semibold bg-heather-50 p-2 rounded-xl border border-heather-100">Topik: ${s.topic}</p>
        </div>
        <div class="pt-2 border-t border-oase-border flex items-center justify-between">
          <span class="text-xs text-oase-muted">Durasi: 30 Menit</span>
          <button class="open-counselor-chat-btn px-4 py-2 rounded-xl bg-heather-500 hover:bg-heather-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all" data-session-id="${s.id}">
            <i data-lucide="messages-square" class="w-3.5 h-3.5"></i>
            <span>Buka Ruang Chat</span>
          </button>
        </div>
      `;
      card.querySelector('.open-counselor-chat-btn').addEventListener('click', () => {
        sessionStorage.setItem('oase_active_chat_role', 'counselor');
        window.location.href = 'ruang-chat.html?sessionId=' + s.id + '&role=counselor';
      });
      return card;
    }

    // 9. RIWAYAT SESI KONSELING SELESAI
    async function loadHistorySessions() {
      if (!currentSession || !historySessionsListContainer) return;
      let completed = [];
      if (window.ChatSessionService) {
        completed = await window.ChatSessionService.getCompletedSessions(null, currentSession.id);
        if (!completed || completed.length === 0) {
          completed = await window.ChatSessionService.getCompletedSessions(null, null);
        }
      }

      if (historyCountBadge) {
        if (completed.length > 0) {
          historyCountBadge.textContent = completed.length;
          historyCountBadge.classList.remove('hidden');
        } else {
          historyCountBadge.classList.add('hidden');
        }
      }

      if (!completed || completed.length === 0) {
        historySessionsListContainer.innerHTML = `
          <div class="col-span-full py-12 text-center space-y-2 bg-oase-surface/50 rounded-2xl border border-dashed border-oase-border">
            <div class="w-10 h-10 rounded-xl bg-heather-100 text-heather-600 flex items-center justify-center mx-auto">
              <i data-lucide="archive" class="w-5 h-5"></i>
            </div>
            <p class="text-sm font-bold text-oase-plum">Belum Ada Sesi Konseling yang Selesai</p>
            <p class="text-xs text-oase-muted">Sesi konseling 30 menit yang telah diselesaikan akan tercatat rapi di sini bersama penilaian rating siswa.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      historySessionsListContainer.innerHTML = '';
      completed.forEach(s => {
        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-2xl border border-heather-200 hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between";
        const dateStr = s.ended_at ? new Date(s.ended_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Selesai';

        let ratingHtml = '';
        if (s.rating) {
          ratingHtml = `
            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-amber-500 font-bold">${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}</span>
              <span class="text-oase-muted text-[11px]">(${s.rating}/5)</span>
            </div>
          `;
        } else {
          ratingHtml = `<span class="text-[11px] text-oase-muted italic">Belum dinilai siswa</span>`;
        }

        let motivationHtml = '';
        if (s.motivational_message) {
          motivationHtml = `
            <div class="p-2.5 rounded-xl bg-heather-50/70 border border-heather-100 text-xs text-oase-plum space-y-1">
              <span class="text-[10px] font-bold text-heather-700 uppercase tracking-wider flex items-center gap-1">
                <i data-lucide="sparkles" class="w-3 h-3 text-amber-500"></i> Motivasi Penutup:
              </span>
              <p class="italic text-[11px] leading-relaxed">"${s.motivational_message}"</p>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                ✓ Selesai
              </span>
              <span class="text-[11px] text-oase-muted font-medium">${dateStr}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-extrabold text-oase-plum">${s.user_name || 'Siswa Anonim'}</h3>
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">🔒 Anonim</span>
              </div>
              <p class="text-xs text-heather-700 font-semibold mt-0.5">Topik: ${s.topic}</p>
            </div>
            ${motivationHtml}
            <div class="flex items-center justify-between text-xs pt-1">
              <span class="text-oase-muted font-medium text-[11px]">Rating Siswa:</span>
              ${ratingHtml}
            </div>
            ${s.review ? `<p class="text-[11px] text-oase-muted italic bg-oase-surface p-2 rounded-lg border border-oase-border">"${s.review}"</p>` : ''}
          </div>
          <div class="pt-2 border-t border-oase-border flex items-center justify-between">
            <span class="text-xs text-oase-muted">Durasi: 30 Menit</span>
            <a href="ruang-chat.html?sessionId=${s.id}&role=counselor&readonly=true" onclick="sessionStorage.setItem('oase_active_chat_role', 'counselor')" class="px-3.5 py-1.5 rounded-xl border border-heather-200 bg-heather-50 hover:bg-heather-100 text-heather-800 text-xs font-bold transition-all flex items-center gap-1">
              <i data-lucide="messages-square" class="w-3.5 h-3.5"></i>
              <span>Lihat Riwayat Chat</span>
            </a>
          </div>
        `;
        historySessionsListContainer.appendChild(card);
      });
      lucide.createIcons();
    }

    // 10. KONTAK DARURAT & LAPORAN BUG HANDLERS
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
    const triggerAudioAlarmBtn = document.getElementById('triggerAudioAlarmBtn');

    if (triggerAudioAlarmBtn) {
      triggerAudioAlarmBtn.addEventListener('click', () => {
        if (window.AudioAlertService) {
          window.AudioAlertService.playCrisisAlarm();
        }
      });
    }

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

    if (sendBugWhatsAppBtn) {
      sendBugWhatsAppBtn.addEventListener('click', () => {
        const category = bugCategorySelect.value;
        const desc = bugDescriptionInput.value.trim();
        if (!desc) {
          alert('Mohon isi deskripsi bug atau kendala yang Anda alami.');
          return;
        }
        const text = encodeURIComponent(`Halo Tim IT OASE Cerita, saya ingin melaporkan bug:\n\n*Kategori:* ${category}\n*Halaman:* Laman Konselor\n*Deskripsi:* ${desc}`);
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
        const subject = encodeURIComponent(`[Laporan Bug OASE] - ${category}`);
        const body = encodeURIComponent(`Halo Tim IT OASE Cerita,\n\nSaya ingin melaporkan kendala pada platform OASE Cerita:\n\nKategori: ${category}\nHalaman: Laman Konselor\nDeskripsi: ${desc}\n\nTerima kasih.`);
        window.location.href = `mailto:support@oase.id?subject=${subject}&body=${body}`;
      });
    }

    // Run on start
    checkAuth();
    loadCounselorNotifs();
    loadLiveSessions();
    loadHistorySessions();
  </script>
