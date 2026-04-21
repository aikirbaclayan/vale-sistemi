import React, { useState, useEffect } from 'react';
import { OwnerMetrics } from '../types';
import { ownerAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, downloadFile } from '../utils';

const OwnerDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);

  // Metrikleri getir
  const fetchMetrics = async (date?: string) => {
    setIsLoading(true);
    const result = await ownerAPI.getMetrics(date);
    
    if (result.success && result.data) {
      setMetrics(result.data);
      setError('');
    } else {
      setError(result.error || 'Metrikler getirilemedi');
    }
    setIsLoading(false);
  };

  // İlk yükleme
  useEffect(() => {
    fetchMetrics(selectedDate);
  }, [selectedDate]);

  // CSV rapor indirme
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    const blob = await ownerAPI.downloadReport(selectedDate);
    
    if (blob) {
      const filename = `rapor_${selectedDate.replace(/-/g, '_')}.csv`;
      downloadFile(blob, filename);
    } else {
      setError('Rapor indirilemedi');
    }
    setIsDownloading(false);
  };

  // WhatsApp özeti gönderme
  const handleSendSummary = async () => {
    setIsSendingSummary(true);
    const result = await ownerAPI.sendDailySummary();
    
    if (result.success) {
      alert('Günlük özet WhatsApp\'tan gönderildi!');
    } else {
      setError(result.error || 'Özet gönderilemedi');
    }
    setIsSendingSummary(false);
  };

  if (isLoading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">İşletme Paneli</h1>
              <p className="text-gray-600 mt-1">Günlük raporlar ve metrikler</p>
            </div>
            
            {/* Tarih Seçici ve Aksiyonlar */}
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              
              <div className="flex space-x-2">
                <button
                  onClick={handleDownloadReport}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isDownloading ? <LoadingSpinner size="sm" /> : <span>📊</span>}
                  <span>CSV İndir</span>
                </button>
                
                <button
                  onClick={handleSendSummary}
                  disabled={isSendingSummary}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSendingSummary ? <LoadingSpinner size="sm" /> : <span>💬</span>}
                  <span>WhatsApp Özeti</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button 
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800 text-sm underline mt-1"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Content */}
      {metrics && (
        <div className="max-w-7xl mx-auto p-4">
          {/* Topbar Özet */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {formatDate(selectedDate)} - Günlük Özet
              </h2>
              <div className="text-2xl font-bold text-primary-600">
                Bugün: {metrics.todayCount} araç
              </div>
            </div>
            
            {/* Hızlı İstatistik Çekmecesi */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm text-green-600 font-medium">Giren</div>
                  <div className="text-xl font-bold text-green-800">
                    {metrics.todayCount}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-sm text-blue-600 font-medium">Çıkan</div>
                  <div className="text-xl font-bold text-blue-800">
                    {metrics.todayCount}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="text-sm text-yellow-600 font-medium">Şu An Parkta</div>
                  <div className="text-xl font-bold text-yellow-800">
                    {metrics.parkedCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ayarlar Paneli */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sistem Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg">
                <label className="text-sm text-gray-600">Bildirim Sesi</label>
                <div className="text-lg font-semibold text-gray-800">🔔 Açık</div>
              </div>
              <div className="p-3 border rounded-lg">
                <label className="text-sm text-gray-600">Loyalty Eşiği</label>
                <div className="text-lg font-semibold text-gray-800">3 ziyaret</div>
              </div>
              <div className="p-3 border rounded-lg">
                <label className="text-sm text-gray-600">Veri Saklama</label>
                <div className="text-lg font-semibold text-gray-800">90 gün</div>
              </div>
              <div className="p-3 border rounded-lg">
                <label className="text-sm text-gray-600">Günlük Özet</label>
                <div className="text-lg font-semibold text-gray-800">22:30</div>
              </div>
            </div>
          </div>

          {/* Ana Metrikler */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performans Metrikleri</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-600">Ort. Bekleme</div>
                <div className="text-xl font-semibold text-blue-800">
                  {metrics.avgWaitTime} dk
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-600">Ort. Kalış</div>
                <div className="text-xl font-semibold text-green-800">
                  {metrics.avgStayTime} dk
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-sm text-yellow-600">Loyalty Oranı</div>
                <div className="text-xl font-semibold text-yellow-800">
                  %{metrics.loyaltyRate}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm text-purple-600">Hizmet Kalitesi</div>
                <div className="text-xl font-semibold text-purple-800">
                  {metrics.avgWaitTime < 10 ? '🟢 Mükemmel' : metrics.avgWaitTime < 15 ? '🟡 İyi' : '🔴 Geliştirilmeli'}
                </div>
              </div>
            </div>
          </div>

          {/* Pik Saat Şeridi */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Saatlik Yoğunluk
            </h3>
            
            <div className="relative">
              {/* Saat Etiketleri */}
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
              
              {/* Isı Şeridi */}
              <div className="flex h-8 bg-gray-100 rounded-lg overflow-hidden">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourData = metrics.hourlyData.find(h => h.hour === hour);
                  const count = hourData?.count || 0;
                  const maxCount = Math.max(...metrics.hourlyData.map(h => h.count));
                  const intensity = maxCount > 0 ? count / maxCount : 0;
                  
                  return (
                    <div
                      key={hour}
                      className="flex-1 group relative cursor-pointer transition-all duration-200 hover:scale-y-110"
                      style={{
                        backgroundColor: intensity > 0 
                          ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` 
                          : 'transparent'
                      }}
                      title={`${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00 • ${count} araç`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {hour.toString().padStart(2, '0')}:00-{(hour + 1).toString().padStart(2, '0')}:00<br/>
                        {count} araç
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Yoğunluk Göstergesi */}
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>Az Yoğun</span>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-200 rounded"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <div className="w-3 h-3 bg-blue-800 rounded"></div>
                </div>
                <span>Çok Yoğun</span>
              </div>
            </div>
          </div>

          {/* Hızlı İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* En Yoğun Saat */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-gray-800 mb-2">En Yoğun Saat</h4>
              {metrics.hourlyData.length > 0 && (
                <>
                  {(() => {
                    const maxHour = metrics.hourlyData.reduce((prev, current) => 
                      prev.count > current.count ? prev : current
                    );
                    return (
                      <div>
                        <div className="text-2xl font-bold text-primary-600">
                          {maxHour.hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="text-sm text-gray-600">
                          {maxHour.count} araç
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Ortalama Hizmet Süresi */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-gray-800 mb-2">Hizmet Kalitesi</h4>
              <div className="text-2xl font-bold text-green-600">
                {metrics.avgWaitTime < 10 ? '✅' : metrics.avgWaitTime < 15 ? '⚠️' : '❌'}
              </div>
              <div className="text-sm text-gray-600">
                {metrics.avgWaitTime < 10 
                  ? 'Mükemmel' 
                  : metrics.avgWaitTime < 15 
                    ? 'İyi' 
                    : 'Geliştirilmeli'
                }
              </div>
            </div>

            {/* Müşteri Memnuniyeti */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="font-semibold text-gray-800 mb-2">Müşteri Sadakati</h4>
              <div className="text-2xl font-bold text-yellow-600">
                %{metrics.loyaltyRate}
              </div>
              <div className="text-sm text-gray-600">
                Tekrar gelen müşteri oranı
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
