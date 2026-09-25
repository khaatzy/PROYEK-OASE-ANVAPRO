// JavaScript & Supabase Integration for OASE Cerita

document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1. ELEMEN DOM & STATE
  // ==========================================
  // Auth Elements
  const loginModal = document.getElementById('loginModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const navLoginBtn = document.getElementById('navLoginBtn');
  const heroLoginBtn = document.getElementById('heroLoginBtn');
  const ctaLoginBtn = document.getElementById('ctaLoginBtn');
  const authForm = document.getElementById('authForm');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authFeedback = document.getElementById('authFeedback');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authModalTitle = document.getElementById('authModalTitle');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  let authMode = 'login'; // 'login' or 'register'

  // Navbar Session State Elements
  const guestControls = document.getElementById('guestControls');
  const userControls = document.getElementById('userControls');
  const userEmailLabel = document.getElementById('userEmailLabel');
  const navLogoutBtn = document.getElementById('navLogoutBtn');
  const navWriteStoryBtn = document.getElementById('navWriteStoryBtn');

  // Story Elements
  const writeStoryModal = document.getElementById('writeStoryModal');
  const closeStoryModalBtn = document.getElementById('closeStoryModalBtn');
  const openWriteStoryBtn = document.getElementById('openWriteStoryBtn');
  const writeStoryForm = document.getElementById('writeStoryForm');
  const storyContent = document.getElementById('storyContent');
  const isAnonymous = document.getElementById('isAnonymous');
  const submitStoryBtn = document.getElementById('submitStoryBtn');
  const storiesContainer = document.getElementById('storiesContainer');
  const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
  const modalEmotionButtons = document.querySelectorAll('.story-tag-btn');
  let selectedStoryEmotion = 'Lelah';

  // Mobile Menu Elements
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  // Hero Emotion Selector Elements
  const emotionButtons = document.querySelectorAll('.emotion-btn');
  const emotionFeedback = document.getElementById('emotionFeedback');

  // Current session cache
  let currentUserSession = null;

  // ==========================================
  // 2. MODAL CONTROLS
  // ==========================================
  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    clearAuthFeedback();
    loginModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    authEmail.focus();
  };

  const closeAuthModal = () => {
    loginModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };

  const openStoryModal = () => {
    writeStoryModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    storyContent.focus();
  };

  const closeStoryModal = () => {
    writeStoryModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };

  // Close modals on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!loginModal.classList.contains('hidden')) closeAuthModal();
      if (!writeStoryModal.classList.contains('hidden')) closeStoryModal();
    }
  });

  // Close on backdrop click
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeAuthModal();
    });
  }
  if (writeStoryModal) {
    writeStoryModal.addEventListener('click', (e) => {
      if (e.target === writeStoryModal) closeStoryModal();
    });
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeAuthModal);
  if (closeStoryModalBtn) closeStoryModalBtn.addEventListener('click', closeStoryModal);

  // Trigger Auth Modal Buttons
  if (navLoginBtn) navLoginBtn.addEventListener('click', () => openAuthModal('login'));

  // Hero & CTA buttons: jika sudah login langsung buka modal tulis cerita, jika belum buka auth modal
  const handleStartStoryClick = () => {
    if (currentUserSession) {
      openStoryModal();
    } else {
      openAuthModal('login');
      showAuthFeedback('Silakan masuk atau daftar terlebih dahulu untuk mulai bercerita.', 'info');
    }
  };

  if (heroLoginBtn) heroLoginBtn.addEventListener('click', handleStartStoryClick);
  if (ctaLoginBtn) ctaLoginBtn.addEventListener('click', handleStartStoryClick);
  if (openWriteStoryBtn) openWriteStoryBtn.addEventListener('click', handleStartStoryClick);
  if (navWriteStoryBtn) navWriteStoryBtn.addEventListener('click', openStoryModal);

  // Intercept 'Chat dengan Konselor' links
  document.querySelectorAll('.chat-counselor-btn, a[href*="action=chat-counselor"], a[href="kirim-cerita.html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (!currentUserSession) {
        e.preventDefault();
        sessionStorage.setItem('oase_auth_redirect', 'dashboard-user.html?action=chat-counselor');
        openAuthModal('login');
        showAuthFeedback('Silakan masuk atau daftar akun terlebih dahulu untuk chat langsung dengan konselor.', 'info');
      }
    });
  });

  // ==========================================
  // 3. AUTH LOGIC & TABS
  // ==========================================
  const setAuthMode = (mode) => {
    authMode = mode;
    clearAuthFeedback();
    if (mode === 'login') {
      tabLogin.classList.add('bg-white', 'text-heather-700', 'shadow-sm');
      tabLogin.classList.remove('text-oase-muted');
      tabRegister.classList.remove('bg-white', 'text-heather-700', 'shadow-sm');
      tabRegister.classList.add('text-oase-muted');
      authModalTitle.textContent = 'Selamat Datang';
      authSubmitBtn.querySelector('span').textContent = 'Masuk & Mulai Bercerita';
    } else {
      tabRegister.classList.add('bg-white', 'text-heather-700', 'shadow-sm');
      tabRegister.classList.remove('text-oase-muted');
      tabLogin.classList.remove('bg-white', 'text-heather-700', 'shadow-sm');
      tabLogin.classList.add('text-oase-muted');
      authModalTitle.textContent = 'Daftar Akun Baru';
      authSubmitBtn.querySelector('span').textContent = 'Daftarkan Akun OASE';
    }
  };

  if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode('register'));

  const showAuthFeedback = (msg, type = 'error') => {
    authFeedback.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border-red-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-heather-50', 'text-heather-700', 'border-heather-200');
    authFeedback.classList.add('border');

    if (type === 'error') {
      authFeedback.classList.add('bg-red-50', 'text-red-700', 'border-red-200');
    } else if (type === 'success') {
      authFeedback.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
    } else {
      authFeedback.classList.add('bg-heather-50', 'text-heather-700', 'border-heather-200');
    }
    authFeedback.textContent = msg;
  };

  const clearAuthFeedback = () => {
    authFeedback.classList.add('hidden');
    authFeedback.textContent = '';
  };

  const updateNavbarSessionUI = (session) => {
    currentUserSession = session;
    const mobileUserCard = document.getElementById('mobileUserCard');
    const userMobileEmailLabel = document.getElementById('userMobileEmailLabel');

    if (session && session.user) {
      if (guestControls) guestControls.classList.add('hidden');
      if (userControls) userControls.classList.remove('hidden');
      if (userEmailLabel) userEmailLabel.textContent = session.user.email;
      if (mobileUserCard) mobileUserCard.classList.remove('hidden');
      if (userMobileEmailLabel) userMobileEmailLabel.textContent = session.user.email;
    } else {
      if (guestControls) guestControls.classList.remove('hidden');
      if (userControls) userControls.classList.add('hidden');
      if (mobileUserCard) mobileUserCard.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  };

  // Auth Form Submit (Login / Register via Supabase)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = authEmail.value.trim();
      const password = authPassword.value;
      const submitTextSpan = authSubmitBtn.querySelector('span');
      const originalText = submitTextSpan.textContent;

      submitTextSpan.textContent = 'Memproses...';
      authSubmitBtn.disabled = true;

      try {
        if (authMode === 'login') {
          await window.AuthService.signIn(email, password);
          localStorage.setItem('oase_active_user_email', email);
          showAuthFeedback('Berhasil masuk! Membuka dashboard siswa...', 'success');
          setTimeout(() => {
            closeAuthModal();
            authForm.reset();
            const targetUrl = sessionStorage.getItem('oase_auth_redirect') || 'dashboard-user.html';
            sessionStorage.removeItem('oase_auth_redirect');
            window.location.href = targetUrl;
          }, 800);
        } else {
          await window.AuthService.signUp(email, password);
          showAuthFeedback('Pendaftaran berhasil! Akun Anda telah aktif di database Supabase.', 'success');
          setTimeout(() => {
            setAuthMode('login');
          }, 1500);
        }
      } catch (err) {
        showAuthFeedback(err.message || 'Terjadi kesalahan saat memproses akun Anda.', 'error');
      } finally {
        submitTextSpan.textContent = originalText;
        authSubmitBtn.disabled = false;
      }
    });
  }

  // Logout Handlers (Desktop & Mobile)
  const handleLogout = async () => {
    try {
      await window.AuthService.signOut();
      localStorage.removeItem('oase_active_user_email');
      updateNavbarSessionUI(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (navLogoutBtn) navLogoutBtn.addEventListener('click', handleLogout);
  const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

  const mobileWriteStoryBtn = document.getElementById('mobileWriteStoryBtn');
  if (mobileWriteStoryBtn) {
    mobileWriteStoryBtn.addEventListener('click', () => {
      if (mobileMenu) mobileMenu.classList.add('hidden');
      openStoryModal();
    });
  }

  // Initial Session Check & Listener
  if (window.AuthService) {
    try {
      const initialSession = await window.AuthService.getSession();
      updateNavbarSessionUI(initialSession);
      window.AuthService.onAuthStateChange((_event, session) => {
        updateNavbarSessionUI(session);
      });
    } catch (e) {
      console.warn('Session init:', e);
    }
  }

  // ==========================================
  // 4. WRITE STORY MODAL LOGIC
  // ==========================================
  modalEmotionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modalEmotionButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStoryEmotion = btn.getAttribute('data-tag');
    });
  });

  if (writeStoryForm) {
    writeStoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = storyContent.value.trim();
      if (!content) return;

      const submitSpan = submitStoryBtn.querySelector('span');
      const originalText = submitSpan.textContent;
      submitSpan.textContent = 'Mengirimkan Cerita...';
      submitStoryBtn.disabled = true;

      try {
        const newStory = await window.StoryService.createStory({
          content,
          emotionTag: selectedStoryEmotion,
          isAnonymous: isAnonymous.checked
        });

        closeStoryModal();
        writeStoryForm.reset();
        selectedStoryEmotion = 'Lelah';
        modalEmotionButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tag') === 'Lelah'));

        // Muat ulang daftar cerita agar langsung muncul
        await loadStories();

        // Scroll halus ke Ruang Cerita
        const ruangCeritaElem = document.getElementById('ruang-cerita');
        if (ruangCeritaElem) ruangCeritaElem.scrollIntoView({ behavior: 'smooth' });

      } catch (err) {
        alert('Gagal mengirim cerita: ' + (err.message || 'Pastikan tabel stories sudah dibuat di Supabase.'));
      } finally {
        submitSpan.textContent = originalText;
        submitStoryBtn.disabled = false;
      }
    });
  }

  // ==========================================
  // 5. FETCH & RENDER STORIES (COMMUNITY FEED)
  // ==========================================
  const emotionColorMap = {
    'Tenang': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🌿' },
    'Cemas':  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '🌧️' },
    'Lelah':  { bg: 'bg-heather-100', text: 'text-heather-800', border: 'border-heather-200', icon: '🔋' },
    'Sedih':  { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '🥀' },
    'Bingung':{ bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: '🌀' },
    'Syukur': { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: '✨' }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Baru saja';
    const date = new Date(timestamp);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const renderStories = (stories) => {
    if (!storiesContainer) return;

    if (!stories || stories.length === 0) {
      storiesContainer.innerHTML = `
        <div class="col-span-full py-12 text-center bg-heather-50/50 rounded-3xl border border-dashed border-heather-200">
          <div class="w-12 h-12 rounded-2xl bg-heather-100 text-heather-600 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="feather" class="w-6 h-6"></i>
          </div>
          <h4 class="font-bold text-oase-plum text-base">Belum Ada Cerita yang Diposting</h4>
          <p class="text-xs text-oase-muted mt-1 max-w-sm mx-auto">Jadilah sahabat pertama yang membagikan isi hati di ruang aman OASE Cerita.</p>
          <button onclick="document.getElementById('openWriteStoryBtn').click()" class="mt-4 px-5 py-2.5 rounded-full bg-heather-500 hover:bg-heather-600 text-white font-bold text-xs shadow-md transition-all">
            Mulai Bercerita
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    storiesContainer.innerHTML = stories.map(story => {
      const emotionMeta = emotionColorMap[story.emotion_tag] || emotionColorMap['Lelah'];
      const timeStr = formatRelativeTime(story.created_at);
      const hugs = story.hug_count || 0;

      return `
        <div class="bg-white rounded-3xl p-6 sm:p-7 border border-heather-100 hover:border-heather-300 shadow-sm hover:shadow-lg hover:shadow-heather-500/5 transition-all duration-300 flex flex-col justify-between" id="story-card-${story.id}">
          <div>
            <div class="flex items-center justify-between border-b border-oase-border pb-3 mb-4">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-full bg-heather-100 text-heather-700 flex items-center justify-center text-xs font-bold">
                  OC
                </div>
                <div>
                  <h5 class="font-bold text-xs sm:text-sm text-oase-plum">${escapeHtml(story.author_name || 'Sahabat Anonim')}</h5>
                  <span class="text-[11px] text-oase-muted">${timeStr}</span>
                </div>
              </div>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${emotionMeta.bg} ${emotionMeta.text} ${emotionMeta.border} border">
                <span>${emotionMeta.icon}</span>
                <span>${escapeHtml(story.emotion_tag || 'Rasa')}</span>
              </span>
            </div>

            <p class="text-sm text-oase-plum/90 leading-relaxed italic whitespace-pre-line">
              "${escapeHtml(story.content)}"
            </p>
          </div>

          <div class="mt-5 pt-4 border-t border-oase-border flex items-center justify-between">
            <button class="hug-btn flex items-center gap-1.5 text-xs font-bold text-heather-600 hover:text-heather-800 bg-heather-50 hover:bg-heather-100 px-3.5 py-1.5 rounded-full transition-all duration-200 group" data-id="${story.id}" data-hugs="${hugs}">
              <i data-lucide="heart" class="w-4 h-4 fill-heather-500 text-heather-500 group-hover:scale-110 transition-transform"></i>
              <span class="hug-counter">${hugs} Pelukan Hangat</span>
            </button>
            <span class="text-[11px] text-heather-700 font-medium bg-heather-50 px-2 py-0.5 rounded-md">Terjaga Aman</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach Hug Button Listeners
    document.querySelectorAll('.hug-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const currentHugs = parseInt(btn.getAttribute('data-hugs') || '0', 10);
        const counterSpan = btn.querySelector('.hug-counter');

        // Optimistic UI update
        const newHugs = currentHugs + 1;
        btn.setAttribute('data-hugs', newHugs);
        counterSpan.textContent = `${newHugs} Pelukan Hangat`;
        btn.classList.add('bg-heather-200');

        try {
          await window.StoryService.sendHug(id, currentHugs);
        } catch (err) {
          console.warn('Hug send err:', err);
        }
      });
    });

    if (window.lucide) lucide.createIcons();
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const loadStories = async () => {
    try {
      const stories = await window.StoryService.getStories(12);
      renderStories(stories);
    } catch (err) {
      console.warn('Error loading stories:', err);
    }
  };

  if (refreshStoriesBtn) {
    refreshStoriesBtn.addEventListener('click', async () => {
      refreshStoriesBtn.classList.add('animate-spin');
      await loadStories();
      setTimeout(() => refreshStoriesBtn.classList.remove('animate-spin'), 600);
    });
  }

  // Load initial stories
  await loadStories();

  // ==========================================
  // 6. HERO EMOTION QUICK SELECTOR
  // ==========================================
  const heroEmotionMessages = {
    'Tenang': 'Ketenangan adalah anugerah yang indah. Rawat dan bagikan kedamaianmu di sini.',
    'Cemas': 'Tarik napas perlahan... Kamu aman di sini. Kecemasanmu nyata, dan kita bisa melewatinya pelan-pelan.',
    'Lelah': 'Kamu sudah berjuang keras hari ini. Beristirahatlah sejenak, tubuh dan pikiranmu berhak dipulihkan.',
    'Sedih': 'Tak apa untuk tidak baik-baik saja. Air mata dan kesedihanmu berhak diberi ruang tanpa dihakimi.',
    'Bingung': 'Pikiran yang berkabut adalah hal manusiawi. Luapkan isi kepalamu di sini agar terasa lebih lapang.',
    'Syukur': 'Rasa syukur melipatgandakan kehangatan jiwa. Senang mendengarmu merasa bersyukur hari ini!'
  };

  emotionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      emotionButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const emotion = btn.getAttribute('data-emotion');
      if (emotionFeedback && heroEmotionMessages[emotion]) {
        emotionFeedback.textContent = heroEmotionMessages[emotion];
        emotionFeedback.classList.remove('hidden');
      }
    });
  });

  // Mobile Menu Toggle
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});
