// Yardımcı fonksiyonlar

// Süreyi formatla (dakika -> mm:ss)
export const formatDuration = (minutes: number): string => {
  const totalSeconds = minutes * 60;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Zaman farkını dakika olarak hesapla
export const getTimeDifferenceInMinutes = (startTime: string, endTime?: string): number => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
};

// Plaka formatla (görsel için)
export const formatPlateForDisplay = (plate: string): string => {
  // 34ABC123 -> 34 ABC 123
  if (plate.length >= 7) {
    return `${plate.slice(0, 2)} ${plate.slice(2, 5)} ${plate.slice(5)}`;
  }
  return plate;
};

// Durum rengini getir
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'parked':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'requested':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'preparing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ready':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Durum metnini getir
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'parked':
      return 'PARKTA';
    case 'requested':
      return 'ÇAĞRILDI';
    case 'preparing':
      return 'HAZIRLANIYOR';
    case 'ready':
      return 'HAZIR';
    default:
      return 'BİLİNMEYEN';
  }
};

// Makro buton metnini getir
export const getMacroButtonText = (status: string): string => {
  switch (status) {
    case 'requested':
      return '🔧 Hazırlamaya Başla';
    case 'preparing':
      return '✅ Hazır';
    case 'ready':
      return '🚗 Teslim';
    default:
      return '';
  }
};

// Makro buton rengini getir
export const getMacroButtonColor = (status: string): string => {
  switch (status) {
    case 'requested':
      return 'bg-yellow-600 hover:bg-yellow-700';
    case 'preparing':
      return 'bg-blue-600 hover:bg-blue-700';
    case 'ready':
      return 'bg-green-600 hover:bg-green-700';
    default:
      return 'bg-gray-600 hover:bg-gray-700';
  }
};

// Sonraki durumu getir
export const getNextStatus = (currentStatus: string): string => {
  switch (currentStatus) {
    case 'requested':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'delivered'; // Bu özel durum teslim için
    default:
      return currentStatus;
  }
};

// Geri sayım yüzdesini hesapla
export const getCountdownPercentage = (requestedAt: string, requestedIn: number): number => {
  const startTime = new Date(requestedAt);
  const currentTime = new Date();
  const endTime = new Date(startTime.getTime() + requestedIn * 60 * 1000);
  
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = currentTime.getTime() - startTime.getTime();
  
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
};

// Geri sayım rengi
export const getCountdownColor = (percentage: number): string => {
  if (percentage >= 100) {
    return 'stroke-red-500'; // Süre doldu
  } else if (percentage >= 80) {
    return 'stroke-yellow-500'; // Uyarı
  }
  return 'stroke-blue-500'; // Normal
};

// Tarih formatla
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Saat formatla
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Loyalty kontrolü (son 90 günde 3+ ziyaret)
export const checkLoyalty = (plate: string, logs: any[]): boolean => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentVisits = logs.filter(log => 
    log.plate === plate && 
    new Date(log.check_in_at) >= ninetyDaysAgo
  );
  
  return recentVisits.length >= 2; // 3. ziyaret için 2 önceki kayıt olması yeterli
};

// Dosya indirme yardımcısı
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Hata mesajını kullanıcı dostu hale getir
export const getFriendlyErrorMessage = (error: string): string => {
  // API'den gelen hata mesajlarını Türkçe'ye çevir
  const errorMap: { [key: string]: string } = {
    'Network Error': 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
    'timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
    'Server Error': 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
    'Validation Error': 'Girilen bilgilerde hata var. Lütfen kontrol edin.',
  };
  
  return errorMap[error] || error;
};
