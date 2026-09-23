// JavaScript Interactions for OASE Cerita

document.addEventListener('DOMContentLoaded', () => {
  // Modal Elements
  const loginModal = document.getElementById('loginModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const navLoginBtn = document.getElementById('navLoginBtn');
  const heroLoginBtn = document.getElementById('heroLoginBtn');
  const ctaLoginBtn = document.getElementById('ctaLoginBtn');
  const loginForm = document.getElementById('loginForm');

  // Mobile Menu Elements
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  // Emotion Selector Elements
  const emotionButtons = document.querySelectorAll('.emotion-btn');
  const emotionFeedback = document.getElementById('emotionFeedback');

  // Modal Control Functions
  const openModal = () => {
    loginModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  };

  const closeModal = () => {
    loginModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  };

  if (navLoginBtn) navLoginBtn.addEventListener('click', openModal);
  if (heroLoginBtn) heroLoginBtn.addEventListener('click', openModal);
  if (ctaLoginBtn) ctaLoginBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  // Close when clicking modal backdrop
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        closeModal();
      }
    });
  }

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !loginModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Mobile Menu Toggle
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Emotion Buttons Feedback Messages
  const emotionMessages = {
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
      if (emotionFeedback && emotionMessages[emotion]) {
        emotionFeedback.textContent = emotionMessages[emotion];
        emotionFeedback.classList.remove('hidden');
      }
    });
  });

  // Form Submit Handler
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      alert(`Halo! Integrasi akun (${email}) dengan database Supabase akan diaktifkan pada pengerjaan Issue #2.`);
      closeModal();
    });
  }
});
