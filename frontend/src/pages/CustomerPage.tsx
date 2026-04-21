import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PlateInput from '../components/PlateInput';
import LoadingSpinner from '../components/LoadingSpinner';
import { customerAPI } from '../services/api';
import { CustomerRequest, CustomerFeedback } from '../types';

const CustomerPage: React.FC = () => {
  const { qrCode } = useParams();
  const [plate, setPlate] = useState('');
  const [isValidPlate, setIsValidPlate] = useState(false);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [feedback, setFeedback] = useState<CustomerFeedback | null>(null);
  const [error, setError] = useState<string>('');
  const [validationAttempts, setValidationAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [lastValidateTs, setLastValidateTs] = useState<number>(0);
  const [throttleLeft, setThrottleLeft] = useState<number>(0);

  // QR kodu varsa otomatik doldur (gelecekte kullanılabilir)
  useEffect(() => {
    if (qrCode) {
      // QR kodundan plaka bilgisi çıkarılabilir
      console.log('QR Code:', qrCode);
    }
  }, [qrCode]);

  // Plaka doğrulama (manuel tetikleme)
  const validatePlate = async (plateValue: string) => {
    // 5 sn throttle
    const now = Date.now();
    const elapsed = (now - lastValidateTs) / 1000;
    if (elapsed < 5) {
      setThrottleLeft(Math.ceil(5 - elapsed));
      return;
    }
    setLastValidateTs(now);
    setThrottleLeft(5);
    // geri sayımı görünür tutmak için
    const intId = window.setInterval(() => {
      setThrottleLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    if (plateValue.length < 6) {
      setIsValidPlate(false);
      setError('');
      return;
    }

    if (isBlocked) {
      return;
    }

    setIsLoading(true);
    const result = await customerAPI.validatePlate(plateValue);
    setIsLoading(false);

    if (result.success && result.data) {
      setIsValidPlate(true);
      setError('');
      setValidationAttempts(0);
    } else {
      setIsValidPlate(false);
      setError('Bu plaka bugün sistemde yok. Lütfen valeyle teyit edin.');
      
      const newAttempts = validationAttempts + 1;
      setValidationAttempts(newAttempts);
      
      // 3 başarısız denemeden sonra 2 dakika engelle
      if (newAttempts >= 3) {
        setIsBlocked(true);
        setError('Çok fazla hatalı deneme. 2 dakika sonra tekrar deneyin.');
        setTimeout(() => {
          setIsBlocked(false);
          setValidationAttempts(0);
          setError('');
        }, 2 * 60 * 1000); // 2 dakika
      }
    }
  };

  // Plaka değişikliği (otomatik istek atmaz)
  const handlePlateChange = (value: string) => {
    setPlate(value);
    setFeedback(null);
    setIsValidPlate(false);
    setError('');
    setThrottleLeft(0);
  };

  // Süre seçimi
  const handleTimeSelect = async (minutes: number) => {
    if (!isValidPlate || isLoading) return;

    setSelectedTime(minutes);
    setIsLoading(true);
    setError('');

    const request: CustomerRequest = {
      plate,
      requested_in: minutes,
      customer_phone: customerPhone || undefined,
    };

    const result = await customerAPI.requestVehicle(request);
    setIsLoading(false);

    if (result.success && result.data) {
      setFeedback(result.data);
    } else {
      setError(result.error || 'Araç çağrı talebi gönderilemedi');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Arabanızı Masadan Çağırın
          </h1>
          <p className="text-sm text-gray-600">
            Numaranız valeye gösterilmez.
          </p>
        </div>

        {/* Ana Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {/* Plaka Girişi */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Plaka Numaranız
            </label>
            <PlateInput
              value={plate}
              onChange={handlePlateChange}
              disabled={isBlocked}
              className={`
                ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                ${isValidPlate ? 'border-green-300 bg-green-50' : ''}
              `}
            />

            {/* Opsiyonel WhatsApp numarası */}
            <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">
              WhatsApp Numaranız (opsiyonel)
            </label>
            <input
              type="tel"
              placeholder="05xx xxx xx xx"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />

            {/* Doğrulama butonu (manuel tetikleme) */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => validatePlate(plate)}
                disabled={isBlocked || plate.length < 6 || isLoading || throttleLeft > 0}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                {throttleLeft > 0 ? `Bekleyin (${throttleLeft}s)` : 'Doğrula'}
              </button>
            </div>
            
            {/* Doğrulama Durumu */}
            <div className="mt-2 min-h-[20px]">
              {isLoading && (
                <div className="flex items-center text-blue-600">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm">Kontrol ediliyor...</span>
                </div>
              )}
              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}
              {isValidPlate && !error && (
                <p className="text-sm text-green-600 font-medium">
                  ✓ Plaka doğrulandı
                </p>
              )}
            </div>
          </div>

          {/* Süre Butonları */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Kaç dakika içinde?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => handleTimeSelect(minutes)}
                  disabled={!isValidPlate || isLoading || isBlocked}
                  className={`
                    py-3 px-4 rounded-lg font-semibold text-lg
                    transition-all duration-200 transform
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${selectedTime === minutes
                      ? 'bg-primary-600 text-white scale-105 shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }
                    ${!isValidPlate ? 'opacity-50' : 'hover:shadow-md active:scale-95'}
                  `}
                >
                  {isLoading && selectedTime === minutes ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    `${minutes} dk`
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Geri Bildirim */}
          {feedback && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-green-800">
                    ✅ Talebiniz alındı!
                  </h3>
                  
                  {/* Onay Bandı */}
                  <div className="mt-2 bg-green-100 border border-green-300 rounded-lg p-3">
                    <div className="text-center">
                      {feedback.queuePosition && (
                        <div className="text-lg font-bold text-green-800">
                          Sıranız: #{feedback.queuePosition}
                        </div>
                      )}
                      {feedback.estimatedTime && (
                        <div className="text-sm text-green-700 mt-1">
                          Tahmini bekleme: {feedback.estimatedTime} dakika
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-green-600 mt-2">
                    WhatsApp numaranızı girdiyseniz durumla ilgili bilgilendirmeler alacaksınız.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alt Bilgi */}
        <div className="text-center text-xs text-gray-500">
          <p>Bu sistem sadece kayıtlı plakaları kabul eder.</p>
          <p className="mt-1">Sorun yaşıyorsanız lütfen valeyle görüşün.</p>
          
          {/* WhatsApp Fallback */}
          {!feedback && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">
                📱 WhatsApp bildirimleri için numaranızı girmeyi unutmayın!
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Araç hazır olduğunda size haber verebiliriz.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPage;
