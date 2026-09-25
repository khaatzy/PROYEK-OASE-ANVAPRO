const ChatSessionService = {
  // Helper: Mengecek apakah slot tanggal & jam tertentu sudah dibooking untuk konselor tertentu
  isSlotBooked(counselorId, bookingDate, bookingTime) {
    if (!counselorId || counselorId === 'auto' || !bookingDate || !bookingTime) return false;
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.some(s => 
      s.counselor_id === counselorId &&
      s.booking_date === bookingDate &&
      s.booking_time === bookingTime &&
      s.status !== 'dibatalkan'
    );
  },

  // Dapatkan daftar slot waktu yang sudah terisi untuk konselor pada tanggal tertentu
  getBookedSlots(counselorId, bookingDate) {
    if (!counselorId || counselorId === 'auto' || !bookingDate) return [];
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions
      .filter(s => s.counselor_id === counselorId && s.booking_date === bookingDate && s.status !== 'dibatalkan')
      .map(s => s.booking_time)
      .filter(Boolean);
  },

  // Rekomendasi konselor pengganti yang masih kosong di jadwal jam yang sama
  getSubstituteCounselors(bookingDate, bookingTime, currentCounselorId) {
    const allCounselors = (window.COUNSELORS_DATA || []).filter(c => c.id !== 'auto' && c.id !== currentCounselorId);
    return allCounselors.filter(c => !this.isSlotBooked(c.id, bookingDate, bookingTime));
  },

  // Booking Sesi Konseling Baru (Durasi 30 Menit - Slot Kalender)
  async bookSession({ userId, userEmail, userName, counselorId, counselorName, topic, bookingDate = null, bookingTime = null, scheduledAt = null }) {
    const today = new Date().toISOString().split('T')[0];
    const finalDate = bookingDate || today;
    const finalTime = bookingTime || '13:00';

    // Validasi pencegahan tabrakan jadwal (Slot Locking per konselor)
    if (counselorId && counselorId !== 'auto' && this.isSlotBooked(counselorId, finalDate, finalTime)) {
      const subs = this.getSubstituteCounselors(finalDate, finalTime, counselorId);
      const subNames = subs.map(s => s.name).join(', ') || 'konselor lainnya';
      throw new Error(`Jadwal tanggal ${finalDate} pukul ${finalTime} untuk ${counselorName} sudah dipesan pengguna lain. Rekomendasi konselor pengganti yang tersedia: ${subNames}`);
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
      scheduled_at: scheduledAt || `${finalDate}T${finalTime}:00`,
      status: 'aktif',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('counseling_sessions')
          .insert([sessionData])
          .select();
        if (!error && data && data.length > 0) {
          this.triggerNotification({
            type: 'booking',
            targetRole: 'counselor',
            counselorId: counselorId,
            title: 'Sesi Dukungan & Cerita Baru Dipesan!',
            message: `${sessionData.user_name} memesan sesi ${finalDate} pukul ${finalTime} (${topic})`
          });
          return data[0];
        }
      } catch (e) {
        console.warn('Booking Supabase fallback to local:', e);
      }
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    sessions.unshift(sessionData);
    localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));

    this.triggerNotification({
      type: 'booking',
      targetRole: 'counselor',
      counselorId: counselorId,
      title: 'Sesi Dukungan & Cerita Baru Dipesan!',
      message: `${sessionData.user_name} memesan sesi ${finalDate} pukul ${finalTime} (${topic})`
    });

    return sessionData;
  },

  // Ambil Sesi Aktif
  async getActiveSession(userEmail, counselorId = null) {
    if (supabaseClient) {
      try {
        let query = supabaseClient.from('counseling_sessions').select('*').eq('status', 'aktif');
        if (userEmail) query = query.eq('user_email', userEmail);
        if (counselorId) query = query.eq('counselor_id', counselorId);
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
        if (!error && data && data.length > 0) return data[0];
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.find(s => {
      const matchUser = userEmail ? s.user_email === userEmail : true;
      const matchCounselor = counselorId ? s.counselor_id === counselorId : true;
      return matchUser && matchCounselor && s.status === 'aktif';
    }) || null;
  },

  // Dapatkan seluruh sesi untuk konselor tertentu
  async getCounselorSessions(counselorId) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('counseling_sessions')
          .select('*')
          .eq('counselor_id', counselorId)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => s.counselor_id === counselorId);
  },

  // Selesaikan Sesi dengan opsi pesan motivasi konselor
  async endSession(sessionId, motivationalMessage = null) {
    let targetSession = null;
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].status = 'selesai';
      sessions[idx].ended_at = new Date().toISOString();
      if (motivationalMessage) {
        sessions[idx].motivational_message = motivationalMessage;
      }
      targetSession = sessions[idx];
      localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
    }

    if (supabaseClient) {
      try {
        const updateData = {
          status: 'selesai',
          ended_at: new Date().toISOString()
        };
        if (motivationalMessage) {
          updateData.motivational_message = motivationalMessage;
        }
        await supabaseClient.from('counseling_sessions').update(updateData).eq('id', sessionId);
      } catch (e) {}
    }

    // Jika ada pesan motivasi saat menyelesaikan sesi, simpan juga sebagai pesan spesial
    if (motivationalMessage && targetSession) {
      await this.submitMotivationalMessage(sessionId, motivationalMessage, targetSession.counselor_name);
    }

    // Picu notifikasi bahwa sesi telah diselesaikan
    this.triggerNotification({
      type: 'session_ended',
      sessionId,
      title: 'Sesi Konseling Telah Selesai',
      message: 'Sesi konseling 30 menit telah berakhir dan diarsipkan ke riwayat.'
    });

    return targetSession;
  },

  // Kirim Pesan Motivasi & Semangat Penutup oleh Konselor
  async submitMotivationalMessage(sessionId, messageText, counselorName = 'Konselor OASE') {
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === sessionId);
    let targetSession = null;
    if (idx !== -1) {
      sessions[idx].motivational_message = messageText;
      sessions[idx].motivational_sent_at = new Date().toISOString();
      targetSession = sessions[idx];
      localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
    }

    // Masukkan ke riwayat pesan sebagai jenis 'motivation'
    const msg = {
      id: 'msg-mot-' + Date.now(),
      session_id: sessionId,
      sender_id: targetSession ? targetSession.counselor_id : 'counselor',
      sender_name: counselorName,
      sender_type: 'counselor',
      message_type: 'motivation',
      message_text: messageText,
      created_at: new Date().toISOString()
    };

    const allMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]');
    allMsgs.push(msg);
    localStorage.setItem('oase_session_messages', JSON.stringify(allMsgs));

    if (supabaseClient) {
      try {
        await supabaseClient.from('counseling_sessions').update({ motivational_message: messageText }).eq('id', sessionId);
        await supabaseClient.from('session_messages').insert([msg]);
      } catch (e) {}
    }

    this.triggerNotification({
      type: 'motivation',
      sessionId,
      title: `Pesan Semangat dari ${counselorName}`,
      message: `💌 "${messageText.substring(0, 60)}${messageText.length > 60 ? '...' : ''}"`
    });

    return msg;
  },

  // Simpan Rating & Ulasan Konselor oleh Siswa (Bintang 1-5)
  async rateSession(sessionId, rating, reviewText = '') {
    const starNum = Math.min(5, Math.max(1, parseInt(rating) || 5));
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const idx = sessions.findIndex(s => s.id === sessionId);
    let counselorId = null;

    if (idx !== -1) {
      sessions[idx].rating = starNum;
      sessions[idx].review = reviewText.trim();
      sessions[idx].rated_at = new Date().toISOString();
      counselorId = sessions[idx].counselor_id;
      localStorage.setItem('oase_counseling_sessions', JSON.stringify(sessions));
    }

    if (supabaseClient) {
      try {
        await supabaseClient.from('counseling_sessions').update({
          rating: starNum,
          review: reviewText.trim(),
          rated_at: new Date().toISOString()
        }).eq('id', sessionId);
      } catch (e) {}
    }

    // Rekalkulasi akumulasi rating konselor
    if (counselorId) {
      this.recalculateCounselorRating(counselorId);
    }

    return { success: true, rating: starNum, review: reviewText };
  },

  // Hitung ulang akumulasi rating konselor
  recalculateCounselorRating(counselorId) {
    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    const ratedSessions = sessions.filter(s => s.counselor_id === counselorId && s.rating);
    
    // Rating default awal jika belum ada
    let totalScore = ratedSessions.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    let totalCount = ratedSessions.length;

    // Tambahkan bobot default reputasi profesional awal (5 bintang x 5 review)
    const baseCount = 5;
    const baseScore = 25; // 5.0
    const finalScore = totalScore + baseScore;
    const finalCount = totalCount + baseCount;
    const avg = (finalScore / finalCount).toFixed(1);

    const ratingsMap = JSON.parse(localStorage.getItem('oase_counselor_ratings') || '{}');
    ratingsMap[counselorId] = {
      average: avg,
      totalCount: finalCount,
      realReviewsCount: totalCount
    };
    localStorage.setItem('oase_counselor_ratings', JSON.stringify(ratingsMap));
    return ratingsMap[counselorId];
  },

  // Dapatkan Rating Konselor
  getCounselorRating(counselorId) {
    const ratingsMap = JSON.parse(localStorage.getItem('oase_counselor_ratings') || '{}');
    if (ratingsMap[counselorId]) {
      return ratingsMap[counselorId];
    }
    // Jika belum ada, hitung atau berikan default 5.0
    return this.recalculateCounselorRating(counselorId);
  },

  // Dapatkan Sesi Konseling yang Telah Selesai (Riwayat)
  async getCompletedSessions(userEmail = null, counselorId = null) {
    if (supabaseClient) {
      try {
        let query = supabaseClient.from('counseling_sessions').select('*').eq('status', 'selesai');
        if (userEmail) query = query.eq('user_email', userEmail);
        if (counselorId) query = query.eq('counselor_id', counselorId);
        const { data, error } = await query.order('ended_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }

    const sessions = JSON.parse(localStorage.getItem('oase_counseling_sessions') || '[]');
    return sessions.filter(s => {
      const matchStatus = s.status === 'selesai';
      const matchUser = userEmail ? s.user_email === userEmail : true;
      const matchCounselor = counselorId ? s.counselor_id === counselorId : true;
      return matchStatus && matchUser && matchCounselor;
    });
  },

  // Kirim Pesan (Teks atau Voice Note) dengan Enkripsi & Deteksi Krisis
  async sendMessage({ sessionId, senderId, senderName, senderType, messageType = 'text', messageText = '', audioData = null }) {
    const crisisCheck = window.CrisisDetectionService ? window.CrisisDetectionService.checkContent(messageText) : { isCrisis: false };
    const encryptedText = window.EncryptionService ? window.EncryptionService.encrypt(messageText) : messageText;

    const msg = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      session_id: sessionId,
      sender_id: senderId,
      sender_name: senderName,
      sender_type: senderType, // 'user' | 'counselor'
      message_type: messageType, // 'text' | 'voice'
      message_text: encryptedText,
      audio_data: audioData,
      is_crisis: crisisCheck.isCrisis,
      created_at: new Date().toISOString()
    };

    if (crisisCheck.isCrisis && senderType === 'user') {
      if (window.AudioAlertService) {
        window.AudioAlertService.playCrisisAlarm();
      }
      this.triggerNotification({
        type: 'crisis_message',
        sessionId,
        senderType,
        title: '🚨 PERINGATAN KRISIS DALAM RUANG CHAT!',
        message: `Siswa terdeteksi menyampaikan pesan indikasi krisis: "${messageText.substring(0, 45)}...". Harap segera prioritaskan pendampingan!`
      });
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('session_messages').insert([msg]).select();
        if (!error && data && data.length > 0) {
          const decMsg = { ...data[0], message_text: messageText, is_crisis: crisisCheck.isCrisis };
          this.triggerNotification({
            type: 'message',
            sessionId,
            senderType,
            title: `Pesan baru dari ${senderName}`,
            message: messageType === 'voice' ? '🎙️ Mengirim pesan suara (Voice Note)' : messageText
          });
          return decMsg;
        }
      } catch (e) {}
    }

    const allMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]');
    allMsgs.push(msg);
    localStorage.setItem('oase_session_messages', JSON.stringify(allMsgs));

    this.triggerNotification({
      type: 'message',
      sessionId,
      senderType,
      title: `Pesan baru dari ${senderName}`,
      message: messageType === 'voice' ? '🎙️ Mengirim pesan suara (Voice Note)' : messageText
    });

    return { ...msg, message_text: messageText };
  },

  // Ambil Semua Pesan dalam Sesi (Didekripsi secara otomatis)
  async getMessages(sessionId) {
    const decryptMsg = (m) => ({
      ...m,
      message_text: (m.message_text && window.EncryptionService) ? window.EncryptionService.decrypt(m.message_text) : (m.message_text || '')
    });

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('session_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) return data.map(decryptMsg);
      } catch (e) {}
    }

    const allMsgs = JSON.parse(localStorage.getItem('oase_session_messages') || '[]');
    return allMsgs.filter(m => m.session_id === sessionId).map(decryptMsg);
  },

  // Sistem Notifikasi Dua Arah & Push Notifikasi Desktop / Handphone
  triggerNotification(payload) {
    const notifs = JSON.parse(localStorage.getItem('oase_notifications') || '[]');
    notifs.unshift({ ...payload, id: 'notif-' + Date.now(), timestamp: new Date().toISOString(), read: false });
    localStorage.setItem('oase_notifications', JSON.stringify(notifs.slice(0, 40)));
    window.dispatchEvent(new CustomEvent('oase_new_notification', { detail: payload }));

    // Kirim Push Notification ke Desktop atau Layar Notifikasi HP
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

// Layanan Interaktif Gemini AI (Sahabat OASE)

window.ChatSessionService = ChatSessionService;
