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
  }
};

// Ekspor ke window global agar mudah diakses di seluruh aplikasi
window.AuthService = AuthService;
window.StoryService = StoryService;
window.CounselingService = CounselingService;
