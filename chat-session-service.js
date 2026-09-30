const ChatSessionService = {
  // ============================================================
  // HELPER: Cek ketersediaan slot booking konselor
  // ============================================================
  async isSlotBooked(counselorId, bookingDate, bookingTime) {
    if (!counselorId || counselorId === 'auto' || !bookingDate || !bookingTime) return false;

    // Cek di Supabase dulu
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .select('id')
          .eq('counselor_id', counselorId)
          .eq('booking_date', bookingDate)
          .eq('booking_time', bookingTime)
          .neq('status', 'dibatalkan')
          .limit(1);
        if (!error && data) return data.length > 0;
      } catch (e) {}
    }

    // Fallback ke localStorage
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.some(s =>
      s.counselor_id === counselorId &&
      s.booking_date === bookingDate &&
      s.booking_time === bookingTime &&
      s.status !== 'dibatalkan'
    );
  },

  // Daftar slot waktu yang sudah terisi
  async getBookedSlots(counselorId, bookingDate) {
    if (!counselorId || counselorId === 'auto' || !bookingDate) return [];

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .select('booking_time')
          .eq('counselor_id', counselorId)
          .eq('booking_date', bookingDate)
          .neq('status', 'dibatalkan');
        if (!error && data) return data.map(s => s.booking_time).filter(Boolean);
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions
      .filter(s => s.counselor_id === counselorId && s.booking_date === bookingDate && s.status !== 'dibatalkan')
      .map(s => s.booking_time)
      .filter(Boolean);
  },

  // Rekomendasi konselor pengganti
  async getSubstituteCounselors(bookingDate, bookingTime, currentCounselorId) {
    const allCounselors = (window.COUNSELORS_DATA || []).filter(c => c.id !== 'auto' && c.id !== currentCounselorId);
    const available = [];
    for (const c of allCounselors) {
      const booked = await this.isSlotBooked(c.id, bookingDate, bookingTime);
      if (!booked) available.push(c);
    }
    return available;
  },

  // ============================================================
  // CEK APAKAH SESI SUDAH WAKTUNYA DIBUKA
  // ============================================================
  isSessionReady(session) {
    if (!session || !session.booking_date || !session.booking_time) return true;
    const scheduledTime = new Date(`${session.booking_date}T${session.booking_time}:00`).getTime();
    return Date.now() >= scheduledTime;
  },

  getTimeUntilReady(session) {
    if (!session || !session.booking_date || !session.booking_time) return 0;
    const scheduledTime = new Date(`${session.booking_date}T${session.booking_time}:00`).getTime();
    return Math.max(0, scheduledTime - Date.now());
  },

  // ============================================================
  // BOOKING SESI KONSELING BARU (Status: 'terjadwal')
  // ============================================================
  async bookSession({ userId, userEmail, userName, counselorId, counselorName, topic, bookingDate = null, bookingTime = null }) {
    const today = new Date().toISOString().split('T')[0];
    const finalDate = bookingDate || today;
    const finalTime = bookingTime || '13:00';

    // Validasi pencegahan tabrakan jadwal
    if (counselorId && counselorId !== 'auto') {
      const booked = await this.isSlotBooked(counselorId, finalDate, finalTime);
      if (booked) {
        const subs = await this.getSubstituteCounselors(finalDate, finalTime, counselorId);
        const subNames = subs.map(s => s.name).join(', ') || 'konselor lainnya';
        throw new Error(`Jadwal tanggal ${finalDate} pukul ${finalTime} untuk ${counselorName} sudah dipesan pengguna lain. Rekomendasi konselor pengganti yang tersedia: ${subNames}`);
      }
    }

    const sessionData = {
      id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      user_id: userId || 'user-' + Date.now(),
      user_email: userEmail,
      user_name: userName || 'Sahabat OASE',
      counselor_id: counselorId,
      counselor_name: counselorName,
      topic: topic || 'Keluhan Umum & Emosional',
      duration_minutes: 30,
      booking_date: finalDate,
      booking_time: finalTime,
      scheduled_at: `${finalDate}T${finalTime}:00`,
      status: 'terjadwal',
      started_at: null,
      created_at: new Date().toISOString()
    };

    // Simpan ke Supabase (PRIMARY)
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .insert([sessionData])
          .select();
        if (!error && data && data.length > 0) {
          this._syncSessionToLocal(data[0]);
          this.triggerNotification({
            type: 'booking',
            targetRole: 'counselor',
            counselorId: counselorId,
            title: 'Sesi Konseling Baru Dijadwalkan!',
            message: `${sessionData.user_name} menjadwalkan sesi ${finalDate} pukul ${finalTime} (${topic})`
          });
          return data[0];
        }
      } catch (e) {
        console.warn('Booking Supabase fallback to local:', e);
      }
    }

    // Fallback: simpan ke localStorage
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    sessions.unshift(sessionData);
    localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));

    this.triggerNotification({
      type: 'booking',
      targetRole: 'counselor',
      counselorId: counselorId,
      title: 'Sesi Konseling Baru Dijadwalkan!',
      message: `${sessionData.user_name} menjadwalkan sesi ${finalDate} pukul ${finalTime} (${topic})`
    });

    return sessionData;
  },

  // ============================================================
  // AKTIVASI SESI (terjadwal -> aktif) saat waktu tiba
  // ============================================================
  async activateSession(sessionId) {
    const now = new Date().toISOString();
    const updateData = { status: 'aktif', started_at: now };

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .update(updateData)
          .eq('id', sessionId)
          .select();
        if (!error && data && data.length > 0) {
          this._syncSessionToLocal(data[0]);
          this.triggerNotification({
            type: 'session_activated',
            sessionId,
            title: 'Sesi Konseling Dimulai!',
            message: 'Ruang chat konseling sekarang aktif. Timer 30 menit dimulai.'
          });
          return data[0];
        }
      } catch (e) {}
    }

    // Fallback localStorage
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].status = 'aktif';
      sessions[idx].started_at = now;
      localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
      return sessions[idx];
    }
    return null;
  },

  // ============================================================
  // AMBIL SESI (dari Supabase primary, localStorage fallback)
  // ============================================================
  async getActiveSession(userEmail, counselorId = null) {
    if (window.supabaseClient) {
      try {
        let query = window.supabaseClient.from('counseling_sessions').select('*').eq('status', 'aktif');
        if (userEmail) query = query.eq('user_email', userEmail);
        if (counselorId) query = query.eq('counselor_id', counselorId);
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
        if (!error && data && data.length > 0) {
          this._syncSessionToLocal(data[0]);
          return data[0];
        }
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.find(s => {
      const matchUser = userEmail ? s.user_email === userEmail : true;
      const matchCounselor = counselorId ? s.counselor_id === counselorId : true;
      return matchUser && matchCounselor && s.status === 'aktif';
    }) || null;
  },

  // Ambil sesi terjadwal (belum aktif)
  async getScheduledSessions(userEmail = null, counselorId = null) {
    if (window.supabaseClient) {
      try {
        let query = window.supabaseClient.from('counseling_sessions').select('*').eq('status', 'terjadwal');
        if (userEmail) query = query.eq('user_email', userEmail);
        if (counselorId) query = query.eq('counselor_id', counselorId);
        const { data, error } = await query.order('scheduled_at', { ascending: true });
        if (!error && data) {
          data.forEach(s => this._syncSessionToLocal(s));
          return data;
        }
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => {
      const matchUser = userEmail ? s.user_email === userEmail : true;
      const matchCounselor = counselorId ? s.counselor_id === counselorId : true;
      return matchUser && matchCounselor && s.status === 'terjadwal';
    });
  },

  // Ambil sesi berdasarkan ID
  async getSessionById(sessionId) {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .select('*')
          .eq('id', sessionId)
          .limit(1);
        if (!error && data && data.length > 0) {
          this._syncSessionToLocal(data[0]);
          return data[0];
        }
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.find(s => s.id === sessionId) || null;
  },

  // Seluruh sesi untuk konselor
  async getCounselorSessions(counselorId) {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .select('*')
          .eq('counselor_id', counselorId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          data.forEach(s => this._syncSessionToLocal(s));
          return data;
        }
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => s.counselor_id === counselorId);
  },

  // Semua sesi aktif (untuk konselor dashboard)
  async getAllActiveSessions() {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .select('*')
          .eq('status', 'aktif')
          .order('started_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => s.status === 'aktif');
  },

  // Semua sesi terjadwal (untuk konselor dashboard)
  async getAllScheduledSessions() {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .select('*')
          .eq('status', 'terjadwal')
          .order('scheduled_at', { ascending: true });
        if (!error && data) return data;
      } catch (e) {}
    }
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => s.status === 'terjadwal');
  },

  // ============================================================
  // SELESAIKAN SESI
  // ============================================================
  async endSession(sessionId, motivationalMessage = null) {
    const now = new Date().toISOString();
    const updateData = { status: 'selesai', ended_at: now };
    if (motivationalMessage) updateData.motivational_message = motivationalMessage;

    let targetSession = null;

    // Update Supabase dulu
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('counseling_sessions')
          .update(updateData)
          .eq('id', sessionId)
          .select();
        if (!error && data && data.length > 0) targetSession = data[0];
      } catch (e) {}
    }

    // Update localStorage
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].status = 'selesai';
      sessions[idx].ended_at = now;
      if (motivationalMessage) sessions[idx].motivational_message = motivationalMessage;
      if (!targetSession) targetSession = sessions[idx];
      localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
    }

    // Simpan pesan motivasi sebagai pesan khusus
    if (motivationalMessage && targetSession) {
      await this.submitMotivationalMessage(sessionId, motivationalMessage, targetSession.counselor_name);
    }

    this.triggerNotification({
      type: 'session_ended',
      sessionId,
      title: 'Sesi Konseling Telah Selesai',
      message: 'Sesi konseling 30 menit telah berakhir dan diarsipkan ke riwayat.'
    });

    return targetSession;
  },

  // ============================================================
  // PESAN MOTIVASI PENUTUP
  // ============================================================
  async submitMotivationalMessage(sessionId, messageText, counselorName = 'Konselor OASE') {
    const msg = {
      id: 'msg-mot-' + Date.now(),
      session_id: sessionId,
      sender_id: 'counselor',
      sender_name: counselorName,
      sender_type: 'counselor',
      message_type: 'motivation',
      message_text: messageText,
      created_at: new Date().toISOString()
    };

    // Simpan ke Supabase
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('session_messages').insert([msg]);
        await window.supabaseClient.from('counseling_sessions').update({ motivational_message: messageText }).eq('id', sessionId);
      } catch (e) {}
    }

    // Simpan ke localStorage
    const allMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]');
    allMsgs.push(msg);
    localStorage.setItem('oase_session_messages', JSON.stringify(allMsgs));

    this.triggerNotification({
      type: 'motivation',
      sessionId,
      title: `Pesan Semangat dari ${counselorName}`,
      message: `"${messageText.substring(0, 60)}${messageText.length > 60 ? '...' : ''}"`
    });

    return msg;
  },

  // ============================================================
  // RATING & ULASAN
  // ============================================================
  async rateSession(sessionId, rating, reviewText = '') {
    const starNum = Math.min(5, Math.max(1, parseInt(rating) || 5));
    const now = new Date().toISOString();

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('counseling_sessions').update({
          rating: starNum, review: reviewText.trim(), rated_at: now
        }).eq('id', sessionId);
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === sessionId);
    let counselorId = null;
    if (idx !== -1) {
      sessions[idx].rating = starNum;
      sessions[idx].review = reviewText.trim();
      sessions[idx].rated_at = now;
      counselorId = sessions[idx].counselor_id;
      localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
    }

    if (counselorId) this.recalculateCounselorRating(counselorId);
    return { success: true, rating: starNum, review: reviewText };
  },

  recalculateCounselorRating(counselorId) {
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const ratedSessions = sessions.filter(s => s.counselor_id === counselorId && s.rating);
    let totalScore = ratedSessions.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    let totalCount = ratedSessions.length;
    const baseCount = 5;
    const baseScore = 25;
    const avg = ((totalScore + baseScore) / (totalCount + baseCount)).toFixed(1);
    const ratingsMap = JSON.parse(localStorage.getItem('oase_counselor_ratings') || '{}');
    ratingsMap[counselorId] = { average: avg, totalCount: totalCount + baseCount, realReviewsCount: totalCount };
    localStorage.setItem('oase_counselor_ratings', JSON.stringify(ratingsMap));
    return ratingsMap[counselorId];
  },

  getCounselorRating(counselorId) {
    const ratingsMap = JSON.parse(localStorage.getItem('oase_counselor_ratings') || '{}');
    return ratingsMap[counselorId] || this.recalculateCounselorRating(counselorId);
  },

  // ============================================================
  // SESI SELESAI (RIWAYAT)
  // ============================================================
  async getCompletedSessions(userEmail = null, counselorId = null) {
    if (window.supabaseClient) {
      try {
        let query = window.supabaseClient.from('counseling_sessions').select('*').eq('status', 'selesai');
        if (userEmail) query = query.eq('user_email', userEmail);
        if (counselorId) query = query.eq('counselor_id', counselorId);
        const { data, error } = await query.order('ended_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => {
      return s.status === 'selesai' && (!userEmail || s.user_email === userEmail) && (!counselorId || s.counselor_id === counselorId);
    });
  },

  // ============================================================
  // KIRIM PESAN (Supabase PRIMARY, localStorage cache)
  // ============================================================
  async sendMessage({ sessionId, senderId, senderName, senderType, messageType = 'text', messageText = '', audioData = null }) {
    const crisisCheck = window.CrisisDetectionService ? window.CrisisDetectionService.checkContent(messageText) : { isCrisis: false };
    const encryptedText = window.EncryptionService ? window.EncryptionService.encrypt(messageText) : messageText;

    const msg = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      session_id: sessionId,
      sender_id: senderId,
      sender_name: senderName,
      sender_type: senderType,
      message_type: messageType,
      message_text: encryptedText,
      audio_data: audioData,
      is_crisis: crisisCheck.isCrisis,
      created_at: new Date().toISOString()
    };

    // Simpan ke Supabase (PRIMARY)
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.from('session_messages').insert([msg]).select();
        if (!error && data && data.length > 0) {
          // Cache ke localStorage juga
          this._cacheMessageToLocal(msg);
          this.triggerNotification({
            type: 'message', sessionId, senderType,
            title: `Pesan baru dari ${senderName}`,
            message: messageType === 'voice' ? '🎙️ Mengirim pesan suara' : messageText
          });
          return { ...data[0], message_text: messageText, is_crisis: crisisCheck.isCrisis };
        }
      } catch (e) {}
    }

    // Fallback: simpan ke localStorage
    this._cacheMessageToLocal(msg);
    this.triggerNotification({
      type: 'message', sessionId, senderType,
      title: `Pesan baru dari ${senderName}`,
      message: messageType === 'voice' ? '🎙️ Mengirim pesan suara' : messageText
    });
    return { ...msg, message_text: messageText };
  },

  // ============================================================
  // AMBIL PESAN (Supabase PRIMARY, gabung dengan localStorage)
  // ============================================================
  async getMessages(sessionId) {
    const decryptMsg = (m) => ({
      ...m,
      message_text: (m.message_text && window.EncryptionService) ? window.EncryptionService.decrypt(m.message_text) : (m.message_text || '')
    });

    let remoteMsgs = [];
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('session_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (!error && data) remoteMsgs = data;
      } catch (e) {}
    }

    const localMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]').filter(m => m.session_id === sessionId);

    // Gabungkan tanpa duplikasi (Supabase menang jika ada duplikat)
    const map = new Map();
    localMsgs.forEach(m => map.set(m.id, m));
    remoteMsgs.forEach(m => map.set(m.id, m));
    const combined = Array.from(map.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Update cache lokal
    const otherMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]').filter(m => m.session_id !== sessionId);
    localStorage.setItem('oase_session_messages', JSON.stringify([...otherMsgs, ...combined]));

    return combined.map(decryptMsg);
  },

  // ============================================================
  // SUPABASE REALTIME SUBSCRIPTIONS
  // ============================================================
  _realtimeChannels: {},

  subscribeToMessages(sessionId, onNewMessage) {
    if (!window.supabaseClient) return null;
    const channelName = 'messages-' + sessionId;

    // Hindari duplicate subscription
    if (this._realtimeChannels[channelName]) {
      window.supabaseClient.removeChannel(this._realtimeChannels[channelName]);
    }

    const channel = window.supabaseClient
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: 'session_id=eq.' + sessionId
      }, (payload) => {
        if (payload.new) {
          this._cacheMessageToLocal(payload.new);
          if (onNewMessage) onNewMessage(payload.new);
        }
      })
      .subscribe();

    this._realtimeChannels[channelName] = channel;
    return channel;
  },

  subscribeToSession(sessionId, onSessionChange) {
    if (!window.supabaseClient) return null;
    const channelName = 'session-' + sessionId;

    if (this._realtimeChannels[channelName]) {
      window.supabaseClient.removeChannel(this._realtimeChannels[channelName]);
    }

    const channel = window.supabaseClient
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'counseling_sessions',
        filter: 'id=eq.' + sessionId
      }, (payload) => {
        if (payload.new) {
          this._syncSessionToLocal(payload.new);
          if (onSessionChange) onSessionChange(payload.new);
        }
      })
      .subscribe();

    this._realtimeChannels[channelName] = channel;
    return channel;
  },

  // Subscribe ke semua sesi baru (untuk dashboard konselor)
  subscribeToAllSessions(onSessionChange) {
    if (!window.supabaseClient) return null;
    const channelName = 'all-sessions';

    if (this._realtimeChannels[channelName]) {
      window.supabaseClient.removeChannel(this._realtimeChannels[channelName]);
    }

    const channel = window.supabaseClient
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'counseling_sessions'
      }, (payload) => {
        if (payload.new) this._syncSessionToLocal(payload.new);
        if (onSessionChange) onSessionChange(payload);
      })
      .subscribe();

    this._realtimeChannels[channelName] = channel;
    return channel;
  },

  unsubscribeAll() {
    if (!window.supabaseClient) return;
    Object.values(this._realtimeChannels).forEach(ch => {
      try { window.supabaseClient.removeChannel(ch); } catch (e) {}
    });
    this._realtimeChannels = {};
  },

  // ============================================================
  // HELPER: Sinkronisasi ke localStorage (cache)
  // ============================================================
  _syncSessionToLocal(session) {
    if (!session || !session.id) return;
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...session };
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
  },

  _cacheMessageToLocal(msg) {
    if (!msg || !msg.id) return;
    const allMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]');
    if (!allMsgs.some(m => m.id === msg.id)) {
      allMsgs.push(msg);
      localStorage.setItem('oase_session_messages', JSON.stringify(allMsgs));
    }
  },

  // ============================================================
  // NOTIFIKASI
  // ============================================================
  triggerNotification(payload) {
    const notifs = JSON.parse(localStorage.getItem('oase_notifications') || '[]');
    notifs.unshift({ ...payload, id: 'notif-' + Date.now(), timestamp: new Date().toISOString(), read: false });
    localStorage.setItem('oase_notifications', JSON.stringify(notifs.slice(0, 40)));
    window.dispatchEvent(new CustomEvent('oase_new_notification', { detail: payload }));

    if (window.NotificationService) {
      window.NotificationService.sendNotification(payload.title || 'Notifikasi OASE Cerita', {
        body: payload.message || 'Ada pesan atau pembaruan baru untuk Anda.',
        tag: 'oase-session-' + (payload.sessionId || 'chat')
      });
    }
  },

  getNotifications() {
    return JSON.parse(localStorage.getItem('oase_notifications') || '[]');
  }
};

window.ChatSessionService = ChatSessionService;
