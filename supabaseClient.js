// Konfigurasi & Inisialisasi Supabase Client untuk OASE Cerita

const SUPABASE_URL = 'https://lfsgrihhlyffxrlwjyev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2dyaWhobHlmZnhybHdqeWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMjk4NTEsImV4cCI6MjEwNTcwNTg1MX0.0rsevZLOXjV-JTP3ui6WtJUdIM-hN-fZbuGuaZ7Py14';

// Inisialisasi client dari window.supabase (library @supabase/supabase-js yang dimuat via CDN)
let supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === 'function') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('Supabase library belum dimuat. Pastikan CDN Supabase telah disertakan di HTML.');
}
// ==============================================================================
// 1. LAYANAN ENKRIPSI DATABASE (DATA PRIVACY & VAULT PROTECTION)
// ==============================================================================
const EncryptionService = {
  SECRET_SALT: 'OASE_CERITA_VAULT_ENCRYPTION_2026_KEY_PROTECTION_SECURE',

  // Enkripsi teks menjadi cipher aman (Format: ENC_v1:<hex>)
  encrypt(plainText) {
    if (!plainText || typeof plainText !== 'string') return plainText;
    if (plainText.startsWith('ENC_v1:')) return plainText; // Sudah terenkripsi
    try {
      const utf8Bytes = new TextEncoder().encode(plainText);
      const saltBytes = new TextEncoder().encode(this.SECRET_SALT);
      const cipherBytes = new Uint8Array(utf8Bytes.length);
      for (let i = 0; i < utf8Bytes.length; i++) {
        cipherBytes[i] = utf8Bytes[i] ^ saltBytes[i % saltBytes.length] ^ ((i * 17) & 0xff);
      }
      let hex = '';
      for (let i = 0; i < cipherBytes.length; i++) {
        hex += cipherBytes[i].toString(16).padStart(2, '0');
      }
      return 'ENC_v1:' + hex;
    } catch (e) {
      console.warn('Gagal mengenkripsi:', e);
      return plainText;
    }
  },

  // Dekripsi ciphertext kembali ke plaintext asli
  decrypt(cipherText) {
    if (!cipherText || typeof cipherText !== 'string') return cipherText;
    if (!cipherText.startsWith('ENC_v1:')) return cipherText; // Plaintext (data lawas / belum dienkripsi)
    try {
      const hex = cipherText.substring(7);
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      }
      const saltBytes = new TextEncoder().encode(this.SECRET_SALT);
      const plainBytes = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        plainBytes[i] = bytes[i] ^ saltBytes[i % saltBytes.length] ^ ((i * 17) & 0xff);
      }
      return new TextDecoder().decode(plainBytes);
    } catch (e) {
      console.warn('Gagal mendekripsi:', e);
      return cipherText;
    }
  }
};

// ==============================================================================
// 2. LAYANAN DETEKSI KRISIS / SELF-HARM (SAFETY & CRISIS DETECTION)
// ==============================================================================
const CrisisDetectionService = {
  KEYWORDS: [
    'bundir', 'bunuh diri', 'suicide', 'sayat', 'sayat tangan', 'lukai diri', 'melukai diri',
    'akhiri hidup', 'mengakhiri hidup', 'mau mati', 'ingin mati', 'gak mau hidup', 'tidak mau hidup',
    'gak kuat hidup', 'capek hidup', 'mau menghilang selamanya', 'cut myself', 'kill myself',
    'overdosis', 'minum racun', 'gantung diri', 'lompat dari lantai'
  ],

  checkContent(text) {
    if (!text || typeof text !== 'string') return { isCrisis: false, matchedKeyword: null };
    const lower = text.toLowerCase();
    for (const kw of this.KEYWORDS) {
      if (lower.includes(kw)) {
        return { isCrisis: true, matchedKeyword: kw };
      }
    }
    return { isCrisis: false, matchedKeyword: null };
  }
};

// ==============================================================================
// 3. LAYANAN NADA ALARM AUDIO KRISIS (WEB AUDIO API CHIME & ALARM)
// ==============================================================================
const AudioAlertService = {
  audioCtx: null,

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  playCrisisAlarm() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Nada 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Nada 2: 1174Hz (D6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.35);
      gain2.gain.setValueAtTime(0.4, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 0.85);

      // Nada 3: 1046Hz (C6)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1046.50, now + 0.9);
      gain3.gain.setValueAtTime(0.45, now + 0.9);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.9);
      osc3.stop(now + 1.6);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  },

  playChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }
};

window.EncryptionService = EncryptionService;
window.CrisisDetectionService = CrisisDetectionService;
window.AudioAlertService = AudioAlertService;

// Layanan Autentikasi (Auth Service)
const AuthService = {
  // Daftar Akun Baru
  async signUp(email, password) {
    if (!supabaseClient) throw new Error('Supabase client belum siap');
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Masuk / Login
  async signIn(email, password) {
    if (!supabaseClient) throw new Error('Supabase client belum siap');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Keluar / Logout
  async signOut() {
    if (!supabaseClient) throw new Error('Supabase client belum siap');
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  // Dapatkan Sesi Pengguna Aktif
  async getSession() {
    if (!supabaseClient) return null;
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  // Listener Perubahan Status Sesi
  onAuthStateChange(callback) {
    if (!supabaseClient) return;
    return supabaseClient.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Perbarui Password Pengguna
  async updatePassword(newPassword) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return data;
    }
    localStorage.setItem('oase_local_password', newPassword);
    return { success: true };
  },

  // Dapatkan Profil & Role Pengguna (User, Moderator, Konselor)
  async getUserProfile(userId, email) {
    if (supabaseClient && userId) {
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('auth_user_id', userId)
          .single();
        if (!error && data) {
          const safeName = data.display_name || data.full_name || 'Sahabat OASE';
          return {
            ...data,
            display_name: safeName.includes('@') ? 'Sahabat OASE' : safeName,
            full_name: safeName.includes('@') ? 'Sahabat OASE' : safeName
          };
        }
      } catch(e) {}
    }
    const savedProfiles = JSON.parse(localStorage.getItem('oase_user_profiles') || '{}');
    if (email && savedProfiles[email]) {
      const profile = savedProfiles[email];
      const safeName = profile.display_name || profile.full_name || 'Sahabat OASE';
      return {
        ...profile,
        display_name: safeName.includes('@') ? 'Sahabat OASE' : safeName,
        full_name: safeName.includes('@') ? 'Sahabat OASE' : safeName
      };
    }
    return {
      email: email || 'siswa@oase.id',
      role: 'user',
      moderator_approval_status: 'none',
      display_name: 'Sahabat OASE',
      full_name: 'Sahabat OASE'
    };
  },

  // Perbarui Display Name / Nama Samaran Siswa untuk Menjaga Anonimitas
  async updateDisplayName(userId, email, newDisplayName) {
    if (!newDisplayName || !newDisplayName.trim()) throw new Error('Nama samaran tidak boleh kosong.');
    const trimmed = newDisplayName.trim();

    if (supabaseClient && userId) {
      try {
        await supabaseClient.from('profiles').upsert({
          auth_user_id: userId,
          email,
          display_name: trimmed,
          full_name: trimmed,
          updated_at: new Date().toISOString()
        });
      } catch(e) {}
    }

    const savedProfiles = JSON.parse(localStorage.getItem('oase_user_profiles') || '{}');
    savedProfiles[email] = {
      ...(savedProfiles[email] || {}),
      email,
      display_name: trimmed,
      full_name: trimmed
    };
    localStorage.setItem('oase_user_profiles', JSON.stringify(savedProfiles));
    return { success: true, displayName: trimmed };
  },

  // Pengajuan Role Moderator (Menunggu Persetujuan Moderator Utama)
  async requestModeratorRole(email, reason = '') {
    if (supabaseClient) {
      try {
        await supabaseClient.from('profiles').upsert({
          email,
          role: 'moderator',
          moderator_approval_status: 'pending',
          updated_at: new Date().toISOString()
        });
      } catch(e) {}
    }
    const savedProfiles = JSON.parse(localStorage.getItem('oase_user_profiles') || '{}');
    savedProfiles[email] = {
      ...(savedProfiles[email] || {}),
      email,
      role: 'moderator',
      moderator_approval_status: 'pending',
      moderator_reason: reason
    };
    localStorage.setItem('oase_user_profiles', JSON.stringify(savedProfiles));
    return { success: true, status: 'pending' };
  }
};

// Layanan Data Cerita (Story Service)
const StoryService = {
  // Ambil daftar cerita dari database
  async getStories(limit = 10) {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Gagal memuat cerita dari Supabase:', error.message);
      return [];
    }
    return data || [];
  },

  // Tambah cerita baru
  async createStory({ content, emotionTag, isAnonymous = true }) {
    if (!supabaseClient) throw new Error('Supabase client belum siap');

    // Dapatkan user jika ada
    const session = await AuthService.getSession();
    const userId = session?.user?.id || null;
    const authorName = isAnonymous 
      ? `Sahabat Anonim #${Math.floor(100 + Math.random() * 900)}` 
      : 'Sahabat OASE';

    const { data, error } = await supabaseClient
      .from('stories')
      .insert([
        {
          user_id: userId,
          content,
          emotion_tag: emotionTag,
          is_anonymous: isAnonymous,
          author_name: authorName,
          hug_count: 0
        }
      ])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Beri reaksi Pelukan Hangat
  async sendHug(storyId, currentHugs = 0) {
    if (!supabaseClient) return currentHugs + 1;
    const { data, error } = await supabaseClient
      .from('stories')
      .update({ hug_count: currentHugs + 1 })
      .eq('id', storyId)
      .select();

    if (error) {
      console.warn('Gagal menambah pelukan:', error.message);
      return currentHugs + 1;
    }
    return data?.[0]?.hug_count ?? (currentHugs + 1);
  }
};

// Layanan Pengiriman Cerita & Konseling (Counseling Service)
const CounselingService = {
  // Fungsi pembuat kode tiket unik format OASE-XXXX-XX (contoh: OASE-8392-AB)
  generateTicketCode() {
    const charsNum = '0123456789';
    const charsLetter = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let numPart = '';
    for (let i = 0; i < 4; i++) {
      numPart += charsNum.charAt(Math.floor(Math.random() * charsNum.length));
    }
    let letterPart = '';
    for (let i = 0; i < 2; i++) {
      letterPart += charsLetter.charAt(Math.floor(Math.random() * charsLetter.length));
    }
    return `OASE-${numPart}-${letterPart}`;
  },

  // Kirim curhatan / cerita ke konselor
  async submitCounselingStory({
    authorName,
    educationLevel,
    gradeClass = '',
    gender,
    category,
    counselorId,
    counselorName,
    storyContent
  }) {
    const ticketCode = this.generateTicketCode();
    
    // Default nama jika tidak diisi pengirim: User1 - User9999
    const finalAuthorName = (authorName && authorName.trim() !== '')
      ? authorName.trim()
      : `User${Math.floor(100 + Math.random() * 900)}`;

    const crisisCheck = window.CrisisDetectionService ? window.CrisisDetectionService.checkContent(storyContent) : { isCrisis: false };
    const encryptedContent = window.EncryptionService ? window.EncryptionService.encrypt(storyContent) : storyContent;

    const submissionData = {
      ticket_code: ticketCode,
      author_name: finalAuthorName,
      education_level: educationLevel,
      grade_class: gradeClass ? gradeClass.trim() : null,
      gender: gender,
      category: category,
      counselor_id: counselorId,
      counselor_name: counselorName,
      story_content: encryptedContent,
      status: 'menunggu_tanggapan',
      is_crisis: crisisCheck.isCrisis,
      priority: crisisCheck.isCrisis ? 'krisis' : 'normal'
    };

    if (!supabaseClient) {
      console.warn('Supabase Client tidak aktif. Menggunakan penyimpanan lokal.');
      const localStories = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
      localStories.push({ ...submissionData, created_at: new Date().toISOString() });
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(localStories));
      return { success: true, ticketCode, data: submissionData };
    }

    const { data, error } = await supabaseClient
      .from('counseling_submissions')
      .insert([submissionData])
      .select();

    if (error) {
      console.warn('Supabase insert gagal (mungkin tabel belum dibuat di SQL Editor). Menyimpan fallback lokal:', error.message);
      const localStories = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
      localStories.push({ ...submissionData, created_at: new Date().toISOString() });
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(localStories));
      return { success: true, ticketCode, data: submissionData, fallback: true };
    }

    return { success: true, ticketCode, data: data?.[0] || submissionData };
  },

  // Helper untuk membersihkan dan mendekripsi data curhatan
  _resolveSubmission(item) {
    if (!item) return item;
    const counselors = window.COUNSELORS_DATA || [];
    let name = item.counselor_name || 'Konselor OASE';
    if (item.counselor_id && item.counselor_id !== 'auto') {
      const cObj = counselors.find(c => c.id === item.counselor_id);
      if (cObj) name = cObj.name;
    } else if (name && (name.toLowerCase().includes('sarah') || name.toLowerCase().includes('rachma'))) {
      const c1 = counselors.find(c => c.id === 'counselor-1');
      if (c1) name = c1.name;
    }
    const decContent = window.EncryptionService ? window.EncryptionService.decrypt(item.story_content || '') : (item.story_content || '');
    const decReply = (item.counselor_reply && window.EncryptionService) ? window.EncryptionService.decrypt(item.counselor_reply) : item.counselor_reply;
    const isCrisis = item.is_crisis || (window.CrisisDetectionService ? window.CrisisDetectionService.checkContent(decContent).isCrisis : false);
    return {
      ...item,
      counselor_name: name,
      story_content: decContent,
      counselor_reply: decReply,
      is_crisis: isCrisis,
      priority: isCrisis ? 'krisis' : (item.priority || 'normal')
    };
  },

  // Cek cerita & balasan konselor berdasarkan kode tiket unik
  async getStoryByTicket(ticketCode) {
    return this.getSubmissionByTicket(ticketCode);
  },

  async getSubmissionByTicket(ticketCode) {
    if (!ticketCode) return null;
    const cleanCode = ticketCode.trim().toUpperCase();

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('counseling_submissions')
          .select('*')
          .eq('ticket_code', cleanCode)
          .single();

        if (!error && data) return this._resolveSubmission(data);
      } catch (e) {}
    }

    // Fallback cek di localStorage
    const localStories = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    const found = localStories.find(s => s.ticket_code === cleanCode) || null;
    return this._resolveSubmission(found);
  },

  // Dapatkan seluruh antrean cerita konseling (filter kategori & status)
  async getAllSubmissions({ category = 'all', status = 'all' } = {}) {
    if (supabaseClient) {
      try {
        let query = supabaseClient
          .from('counseling_submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(item => this._resolveSubmission(item));
        }
      } catch (err) {
        console.warn('Gagal mengambil antrean dari Supabase:', err);
      }
    }

    // Fallback penyimpanan lokal murni (tanpa dummy message otomatis)
    let localSubmissions = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    
    // Bersihkan dummy messages lama (jika sebelumnya pernah tersimpan di browser)
    const dummyTicketCodes = ['OASE-2941-KB', 'OASE-5820-MN', 'OASE-7731-XT'];
    if (localSubmissions.some(s => dummyTicketCodes.includes(s.ticket_code))) {
      localSubmissions = localSubmissions.filter(s => !dummyTicketCodes.includes(s.ticket_code));
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(localSubmissions));
    }

    let filtered = localSubmissions.map(item => this._resolveSubmission(item));
    if (category && category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(item => item.status === status);
    }
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Berikan balasan resmi konselor
  async replySubmission(ticketCode, replyContent, counselorName) {
    if (!ticketCode || !replyContent) throw new Error('Data balasan tidak lengkap');
    const encryptedReply = window.EncryptionService ? window.EncryptionService.encrypt(replyContent) : replyContent;

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('counseling_submissions')
          .update({
            counselor_reply: encryptedReply,
            counselor_name: counselorName,
            status: 'sudah_dibalas',
            replied_at: new Date().toISOString()
          })
          .eq('ticket_code', ticketCode)
          .select();

        if (!error && data && data.length > 0) return this._resolveSubmission(data[0]);
      } catch (e) {
        console.warn('Gagal update balasan ke Supabase:', e);
      }
    }

    // Update di localStorage
    const local = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    const idx = local.findIndex(s => s.ticket_code === ticketCode);
    if (idx !== -1) {
      local[idx].counselor_reply = encryptedReply;
      local[idx].counselor_name = counselorName;
      local[idx].status = 'sudah_dibalas';
      local[idx].replied_at = new Date().toISOString();
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(local));
      return this._resolveSubmission(local[idx]);
    }
    return null;
  },

  // Alihkan kasus cerita ke konselor lain (Transfer / Referral)
  async transferSubmission({ ticketCode, newCounselorId, newCounselorName, transferredFromName, transferReason }) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('counseling_submissions')
          .update({
            counselor_id: newCounselorId,
            counselor_name: newCounselorName,
            transferred_from_name: transferredFromName,
            transfer_reason: transferReason
          })
          .eq('ticket_code', ticketCode)
          .select();

        if (!error && data && data.length > 0) return this._resolveSubmission(data[0]);
      } catch (e) {
        console.warn('Gagal transfer ke Supabase:', e);
      }
    }

    // LocalStorage fallback
    const local = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    const idx = local.findIndex(s => s.ticket_code === ticketCode);
    if (idx !== -1) {
      local[idx].counselor_id = newCounselorId;
      local[idx].counselor_name = newCounselorName;
      local[idx].transferred_from_name = transferredFromName;
      local[idx].transfer_reason = transferReason;
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(local));
      return this._resolveSubmission(local[idx]);
    }
    return null;
  },

  // Hapus curhatan yang sudah dibalas oleh konselor
  async deleteSubmission(ticketCode) {
    if (!ticketCode) throw new Error('Kode tiket tidak valid.');
    if (supabaseClient) {
      try {
        await supabaseClient.from('counseling_submissions').delete().eq('ticket_code', ticketCode);
      } catch (e) {}
    }
    const local = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    const filtered = local.filter(s => s.ticket_code !== ticketCode);
    localStorage.setItem('oase_counseling_submissions', JSON.stringify(filtered));
    return { success: true };
  },

  // Autentikasi Khusus Konselor (mendukung login via email maupun nama konselor)
  loginCounselor({ email, password, rememberMe = true }) {
    const counselors = window.COUNSELORS_DATA || [];
    const query = (email || '').trim().toLowerCase();
    const inputPass = (password || '').trim();

    if (!counselors || counselors.length === 0) {
      throw new Error('Data konselor belum termuat dari file counselors.js. Pastikan file counselors.js tersimpan dengan benar.');
    }

    if (!query) {
      throw new Error('Silakan masukkan email atau nama konselor.');
    }

    // Cari konselor berdasarkan email, nama lengkap, potongan nama, atau ID
    const counselor = counselors.find(c => {
      if (!c || c.id === 'auto') return false;
      const cEmail = (c.email || '').trim().toLowerCase();
      const cName = (c.name || '').trim().toLowerCase();
      const cId = (c.id || '').trim().toLowerCase();

      const matchEmail = cEmail && cEmail === query;
      const matchName = cName && cName === query;
      const matchPartialName = query.length >= 3 && cName.includes(query);
      const matchId = cId && cId === query;
      return matchEmail || matchName || matchPartialName || matchId;
    });

    if (!counselor) {
      const availableList = counselors
        .filter(c => c.id !== 'auto' && c.email)
        .map(c => `• ${c.name} (${c.email})`)
        .join('\n');
      throw new Error(`Akun konselor "${email}" tidak ditemukan.\n\nAkun yang terdaftar di counselors.js:\n${availableList}\n\nPastikan email atau nama yang Anda masukkan sesuai.`);
    }

    const expectedPass = (counselor.password || '').trim();
    if (expectedPass && expectedPass !== inputPass) {
      throw new Error(`Password untuk konselor "${counselor.name}" tidak sesuai. Periksa password di counselors.js.`);
    }

    const sessionData = {
      id: counselor.id,
      name: counselor.name,
      email: counselor.email,
      role: 'counselor',
      avatar: counselor.avatar,
      specialties: counselor.specialties,
      loggedInAt: new Date().toISOString()
    };

    if (rememberMe) {
      localStorage.setItem('oase_counselor_session', JSON.stringify(sessionData));
    } else {
      sessionStorage.setItem('oase_counselor_session', JSON.stringify(sessionData));
    }

    return sessionData;
  },

  // Ambil sesi konselor saat ini (memeriksa localStorage & sessionStorage + auto-sync dengan counselors.js)
  getCurrentCounselorSession() {
    let session = null;
    const local = localStorage.getItem('oase_counselor_session');
    if (local) {
      try { session = JSON.parse(local); } catch(e){}
    }
    if (!session) {
      const sess = sessionStorage.getItem('oase_counselor_session');
      if (sess) {
        try { session = JSON.parse(sess); } catch(e){}
      }
    }

    // Selalu sinkronkan dengan data terbaru dari counselors.js jika user mengubah nama/email di file
    if (session && window.COUNSELORS_DATA) {
      const freshCounselor = window.COUNSELORS_DATA.find(c => c.id === session.id);
      if (freshCounselor) {
        session.name = freshCounselor.name;
        session.email = freshCounselor.email;
        session.avatar = freshCounselor.avatar || session.avatar;
        session.specialties = freshCounselor.specialties || session.specialties;
      }
    }

    return session;
  },

  // Logout konselor
  logoutCounselor() {
    localStorage.removeItem('oase_counselor_session');
    sessionStorage.removeItem('oase_counselor_session');
  }
};

// Layanan Sesi Chat Konseling Real-Time & Voice Note (Sistem Dukungan Langsung)
const GeminiService = {
  getApiKey() {
    return localStorage.getItem('oase_gemini_api_key') || '';
  },

  setApiKey(key) {
    localStorage.setItem('oase_gemini_api_key', key.trim());
    localStorage.removeItem('oase_gemini_active_model');
  },

  async discoverWorkingModel(apiKey) {
    const key = apiKey || this.getApiKey();
    if (!key) throw new Error('API Key belum diisi.');

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        if (available.length > 0) {
          // Prioritas model Google Gemini termurah, paling hemat token, dan anti-antrean (Flash-Lite)
          const preferredOrder = [
            'gemini-2.5-flash-lite',
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-2.5-flash',
            'gemini-3.8-flash',
            'gemini-flash-latest',
            'gemini-2.0-flash',
            'gemini-1.5-flash'
          ];

          for (const pref of preferredOrder) {
            if (available.includes(pref)) {
              localStorage.setItem('oase_gemini_active_model', pref);
              return pref;
            }
          }

          // Jika tidak ada di daftar prioritas, gunakan model flash-lite/flash apa saja yang ada
          const anyModel = available.find(m => m.includes('lite')) || available.find(m => m.includes('flash')) || available[0];
          localStorage.setItem('oase_gemini_active_model', anyModel);
          return anyModel;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.error?.message) {
          throw new Error(errJson.error.message);
        }
      }
    } catch (e) {
      console.warn('Auto-discovery model info:', e.message);
      if (e.message && (e.message.includes('API key') || e.message.includes('API_KEY'))) {
        throw e;
      }
    }

    return 'gemini-2.5-flash-lite';
  },

  async chatWithGemini(userMessage, chatHistory = []) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di formulir Chat AI.');
    }

    const systemPrompt = `Kamu adalah 'Sahabat OASE', konselor sebaya AI yang berhati hangat, empatik, bijaksana, dan menenangkan untuk para siswa/remaja Indonesia.
Tujuan utamamu adalah mendengarkan dengan penuh penerimaan tanpa menghakimi, memvalidasi perasaan mereka, dan memberi penguatan yang lembut serta solusi reflektif yang aman.
Gunakan bahasa Indonesia yang akrab, sopan, santun, dan menyentuh hati. Jangan memberikan diagnosis medis berat; jika ada indikasi krisis darurat, selalu sarankan dengan hangat untuk berbicara dengan konselor resmi OASE atau layanan darurat Sejiwa (119 ext 8).`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser menyapa/bercerita:\n${userMessage}` }]
      }
    ];

    if (chatHistory && chatHistory.length > 0) {
      contents.length = 0;
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Halo! Aku Sahabat OASE. Aku selalu di sini untuk mendengar ceritamu dengan penuh rasa aman dan kehangatan. Ceritakan apa saja yang ada di hatimu.' }]
      });
      chatHistory.slice(-6).forEach(h => {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });
    }

    // Dapatkan model aktif dari discovery atau cache
    let primaryModel = localStorage.getItem('oase_gemini_active_model');
    if (!primaryModel) {
      primaryModel = await this.discoverWorkingModel(apiKey);
    }

    // Urutan prioritas model Gemini: Model termurah, paling hemat token, dan anti high-demand (Flash-Lite)
    const candidateModels = [
      primaryModel,
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ].filter(Boolean);
    const modelsToTry = [...new Set(candidateModels)];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            localStorage.setItem('oase_gemini_active_model', model);
            return replyText;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Status ${response.status}`;
          lastError = new Error(errMsg);

          // Jika model tidak ditemukan / tidak didukung di tier API key, lanjut coba model berikutnya
          if (response.status === 404 || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('not supported')) {
            console.warn(`Model ${model} tidak aktif pada kunci ini, mencoba model alternatif...`);
            continue;
          }
          // Jika masalah autentikasi atau kuota, lempar error langsung
          throw new Error(errMsg);
        }
      } catch (err) {
        if (err.message && (err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('not supported'))) {
          continue;
        }
        throw err;
      }
    }

    // Jika model di atas belum ada yang cocok, lakukan discovery ulang secara eksplisit
    try {
      localStorage.removeItem('oase_gemini_active_model');
      const fallbackDiscovered = await this.discoverWorkingModel(apiKey);
      if (fallbackDiscovered && !modelsToTry.includes(fallbackDiscovered)) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackDiscovered}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });
        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            localStorage.setItem('oase_gemini_active_model', fallbackDiscovered);
            return replyText;
          }
        }
      }
    } catch (e) {}

    throw lastError || new Error('Tidak ada model Gemini yang didukung oleh API Key ini. Pastikan API Key valid dan aktif di Google AI Studio.');
  }
};

// Layanan Push Notifikasi Desktop & HP (Web Notification API + Service Worker)

// Ekspor ke window global agar mudah diakses di seluruh aplikasi
window.AuthService = AuthService;
window.StoryService = StoryService;
window.CounselingService = CounselingService;
window.GeminiService = GeminiService;
