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
      : (session?.user?.email?.split('@')[0] || 'Teman OASE');

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

    const submissionData = {
      ticket_code: ticketCode,
      author_name: finalAuthorName,
      education_level: educationLevel,
      grade_class: gradeClass ? gradeClass.trim() : null,
      gender: gender,
      category: category,
      counselor_id: counselorId,
      counselor_name: counselorName,
      story_content: storyContent,
      status: 'menunggu_tanggapan'
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

  // Cek cerita & balasan konselor berdasarkan kode tiket unik
  async getStoryByTicket(ticketCode) {
    if (!ticketCode) return null;
    const cleanCode = ticketCode.trim().toUpperCase();

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('counseling_submissions')
        .select('*')
        .eq('ticket_code', cleanCode)
        .single();

      if (!error && data) return data;
    }

    // Fallback cek di localStorage
    const localStories = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    return localStories.find(s => s.ticket_code === cleanCode) || null;
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
          return data;
        }
      } catch (err) {
        console.warn('Gagal mengambil antrean dari Supabase:', err);
      }
    }

    // Fallback penyimpanan lokal
    let localSubmissions = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    if (localSubmissions.length === 0) {
      localSubmissions = [
        {
          ticket_code: 'OASE-2941-KB',
          author_name: 'User104',
          education_level: 'SMA / SMK / MA',
          grade_class: 'Kelas 12',
          gender: 'Perempuan',
          category: 'Masalah Pembelajaran & Akademik',
          counselor_id: 'counselor-1',
          counselor_name: 'Kak Sarah Maulida, S.Psi.',
          story_content: 'Halo Kak Sarah, aku merasa sangat cemas menghadapi ujian kelulusan dan seleksi masuk perguruan tinggi bulan depan. Rasanya orang tua punya ekspektasi sangat tinggi, sementara nilaiku sering pas-pasan. Aku susah tidur setiap malam...',
          status: 'menunggu_tanggapan',
          created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'OASE-5820-MN',
          author_name: 'Bunga Lavender',
          education_level: 'SMP / MTs',
          grade_class: 'Kelas 9',
          gender: 'Perempuan',
          category: 'Masalah Keluarga & Rumah Tangga',
          counselor_id: 'auto',
          counselor_name: 'Pilihkan Otomatis',
          story_content: 'Di rumah suasana sedang tidak nyaman karena orang tua sering bertengkar hebat akhir-akhir ini. Aku merasa sendirian di kamar dan tidak tahu harus bercerita ke siapa. Takut mengganggu teman...',
          status: 'menunggu_tanggapan',
          created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'OASE-7731-XT',
          author_name: 'Pejuang Senja',
          education_level: 'Perguruan Tinggi / Mahasiswa',
          grade_class: 'Semester 6',
          gender: 'Laki-laki',
          category: 'Karier & Rencana Masa Depan',
          counselor_id: 'counselor-3',
          counselor_name: 'Ibu Ningsih Rahayu, M.Pd.',
          story_content: 'Saya merasa salah mengambil jurusan kuliah. Memasuki semester akhir ini tugas magang dan skripsi terasa begitu hampa. Apakah wajar merasa seperti ini di usia 21 tahun?',
          status: 'menunggu_tanggapan',
          created_at: new Date(Date.now() - 300 * 60 * 1000).toISOString()
        }
      ];
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(localSubmissions));
    }

    let filtered = [...localSubmissions];
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

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('counseling_submissions')
          .update({
            counselor_reply: replyContent,
            counselor_name: counselorName,
            status: 'sudah_dibalas',
            replied_at: new Date().toISOString()
          })
          .eq('ticket_code', ticketCode)
          .select();

        if (!error && data && data.length > 0) return data[0];
      } catch (e) {
        console.warn('Gagal update balasan ke Supabase:', e);
      }
    }

    // Update di localStorage
    const local = JSON.parse(localStorage.getItem('oase_counseling_submissions') || '[]');
    const idx = local.findIndex(s => s.ticket_code === ticketCode);
    if (idx !== -1) {
      local[idx].counselor_reply = replyContent;
      local[idx].counselor_name = counselorName;
      local[idx].status = 'sudah_dibalas';
      local[idx].replied_at = new Date().toISOString();
      localStorage.setItem('oase_counseling_submissions', JSON.stringify(local));
      return local[idx];
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

        if (!error && data && data.length > 0) return data[0];
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
      return local[idx];
    }
    return null;
  },

  // Autentikasi Khusus Konselor (dengan fitur Tetap Login / Remember Me)
  loginCounselor({ email, password, rememberMe = true }) {
    const counselors = window.COUNSELORS_DATA || [];
    const counselor = counselors.find(c => c.email && c.email.toLowerCase() === email.trim().toLowerCase());

    if (!counselor) {
      throw new Error('Email konselor tidak terdaftar.');
    }
    if (counselor.password && counselor.password !== password) {
      throw new Error('Password yang dimasukkan salah.');
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

  // Ambil sesi konselor saat ini (memeriksa localStorage & sessionStorage)
  getCurrentCounselorSession() {
    const local = localStorage.getItem('oase_counselor_session');
    if (local) {
      try { return JSON.parse(local); } catch(e){}
    }
    const sess = sessionStorage.getItem('oase_counselor_session');
    if (sess) {
      try { return JSON.parse(sess); } catch(e){}
    }
    return null;
  },

  // Logout konselor
  logoutCounselor() {
    localStorage.removeItem('oase_counselor_session');
    sessionStorage.removeItem('oase_counselor_session');
  }
};

// Ekspor ke window global agar mudah diakses di seluruh aplikasi
window.AuthService = AuthService;
window.StoryService = StoryService;
window.CounselingService = CounselingService;
