const NotificationService = {
  swRegistration: null,

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('./sw.js');
      } catch (err) {
        console.log('Service worker not registered:', err);
      }
    }
  },

  isSupported() {
    return ('Notification' in window);
  },

  getPermissionStatus() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission; // 'default', 'granted', 'denied'
  },

  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Browser atau perangkat ini belum mendukung fitur Web Notifikasi.');
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.init();
    }
    return permission;
  },

  async sendNotification(title, options = {}) {
    const bodyText = options.message || options.body || 'Pemberitahuan baru dari OASE Cerita';
    const defaultOptions = {
      body: bodyText,
      icon: options.icon || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=192&h=192&q=80',
      badge: options.badge || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=96&h=96&q=80',
      vibrate: [200, 100, 200],
      tag: options.tag || 'oase-notif-' + Date.now(),
      data: {
        url: options.url || window.location.href,
        ...options.data
      }
    };

    // 1. Mainkan suara lonceng halus
    this.playChime();

    // 2. Munculkan toast banner interaktif di UI
    this.showInAppToast(title, bodyText);

    // 3. Tampilkan di Notification Tray Desktop / Layar HP
    if (this.getPermissionStatus() === 'granted') {
      try {
        if (this.swRegistration && 'showNotification' in this.swRegistration) {
          await this.swRegistration.showNotification(title, defaultOptions);
          return;
        }
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, defaultOptions);
          return;
        }
      } catch (e) {}

      try {
        new Notification(title, defaultOptions);
      } catch (e) {}
    }
  },

  playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  },

  showInAppToast(title, body) {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('oase-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'oase-toast-container';
      container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-white border-2 border-heather-500 rounded-2xl p-4 shadow-xl shadow-heather-500/20 flex items-start gap-3 transform translate-y-[-10px] opacity-0 transition-all duration-300';
    toast.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-heather-100 text-heather-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">
        🔔
      </div>
      <div class="flex-1 min-w-0">
        <h5 class="text-xs font-extrabold text-oase-plum leading-tight">${title}</h5>
        <p class="text-[11px] text-oase-muted mt-0.5 line-clamp-2 leading-relaxed font-medium">${body}</p>
      </div>
      <button class="text-gray-400 hover:text-gray-700 text-xs font-bold p-1 transition-colors" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-10px]', 'opacity-0');
    });
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 350);
    }, 5000);
  }
};

// Inisialisasi otomatis jika didukung
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    NotificationService.init();
  });
}


window.NotificationService = NotificationService;
