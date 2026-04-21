import React, { useState, useEffect, useCallback } from 'react';
import { Vehicle } from '../types';
import { valetAPI } from '../services/api';
import StatusChip from '../components/StatusChip';
import CountdownCircle from '../components/CountdownCircle';
import LoadingSpinner from '../components/LoadingSpinner';
import { useOffline } from '../hooks/useOffline';
import { 
  formatPlateForDisplay, 
  getMacroButtonText, 
  getMacroButtonColor,
  getNextStatus,
  checkLoyalty
} from '../utils';

const ValetDashboard: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [notifications, setNotifications] = useState<boolean>(() => {
    const saved = localStorage.getItem('valet_notifications');
    return saved ? saved === 'on' : true;
  });

  // Offline modu
  const { isOnline, queuedActionsCount, queueAction } = useOffline();

  useEffect(() => {
    localStorage.setItem('valet_notifications', notifications ? 'on' : 'off');
  }, [notifications]);

  // Araç listesini getir
  const fetchVehicles = useCallback(async () => {
    const result = await valetAPI.getVehicles();
    if (result.success && result.data) {
      setVehicles(result.data);
      setError('');
    } else {
      setError(result.error || 'Araç listesi getirilemedi');
    }
    setIsLoading(false);
  }, []);

  // İlk yükleme ve periyodik güncelleme
  useEffect(() => {
    fetchVehicles();
    // Her 5 saniyede bir güncelle (realtime yerine kısa vadeli polling)
    const interval = setInterval(fetchVehicles, 5000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  // Yeni araç ekleme
  const handleAddVehicle = async () => {
    if (!newPlate.trim()) return;

    setIsAddingVehicle(true);
    
    if (isOnline) {
      const result = await valetAPI.addVehicle(newPlate, newLocation || undefined);
      
      if (result.success) {
        setNewPlate('');
        setNewLocation('');
        fetchVehicles();
      } else {
        setError(result.error || 'Araç eklenemedi');
      }
    } else {
      // Offline modda kuyruğa ekle
      try {
        await queueAction({
          type: 'add_vehicle',
          data: { plate: newPlate, locationNote: newLocation || undefined }
        });
        setNewPlate('');
        setNewLocation('');
        setError('');
      } catch (error) {
        setError('Araç offline kuyruğa eklenemedi');
      }
    }
    
    setIsAddingVehicle(false);
  };

  // Araç durumu güncelleme
  const handleStatusUpdate = async (vehicleId: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    
    if (isOnline) {
      if (nextStatus === 'delivered') {
        // Teslim et
        const result = await valetAPI.deliverVehicle(vehicleId);
        if (result.success) {
          fetchVehicles();
        } else {
          setError(result.error || 'Teslim işlemi başarısız');
        }
      } else {
        // Durum güncelle
        const result = await valetAPI.updateVehicleStatus(vehicleId, nextStatus as Vehicle['status']);
        if (result.success) {
          fetchVehicles();
        } else {
          setError(result.error || 'Durum güncellenemedi');
        }
      }
    } else {
      // Offline modda kuyruğa ekle
      try {
        if (nextStatus === 'delivered') {
          await queueAction({
            type: 'deliver_vehicle',
            data: { vehicleId }
          });
        } else {
          await queueAction({
            type: 'status_update',
            data: { vehicleId, status: nextStatus }
          });
        }
        setError('');
      } catch (error) {
        setError('İşlem offline kuyruğa eklenemedi');
      }
    }
  };

  // Arama filtresi - son 3 hane odaklı
  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toUpperCase().replace(/\s/g, '');
    const plate = vehicle.plate.toUpperCase();
    
    // Son 3 hane arama (öncelikli)
    if (query.length <= 3) {
      return plate.slice(-3).includes(query) || plate.slice(-4, -1).includes(query);
    }
    
    // Tam plaka arama
    return plate.includes(query);
  });

  // Duruma göre gruplandırma
  const groupedVehicles = {
    parked: filteredVehicles.filter(v => v.status === 'parked'),
    requested: filteredVehicles.filter(v => v.status === 'requested'),
    preparing: filteredVehicles.filter(v => v.status === 'preparing'),
    ready: filteredVehicles.filter(v => v.status === 'ready'),
  };

  useEffect(() => {
    if (!notifications) return;
    // Ding örnek: requested durumda kart oluştuğunda çalabilir (basit yaklaşım)
    const hasRequested = vehicles.some(v => v.status === 'requested');
    if (hasRequested) {
      try {
        const audio = new Audio('/ding.mp3');
        audio.play().catch(() => {});
      } catch {}
    }
  }, [vehicles, notifications]);

  if (isLoading) {
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
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
            📡 Offline — işlemler sıraya alındı ({queuedActionsCount} beklemede)
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Vale Paneli</h1>
            <div className="flex items-center space-x-4">
              {/* Bağlantı Durumu */}
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Bildirim Toggle */}
              <button
                onClick={() => setNotifications(!notifications)}
                className={`p-2 rounded-lg ${
                  notifications 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-400 bg-gray-100'
                }`}
              >
                🔔
              </button>
              
              {/* Toplam Sayı */}
              <div className="text-sm text-gray-600">
                Toplam: <span className="font-semibold">{vehicles.length}</span> araç
              </div>
            </div>
          </div>
          
          {/* Arama ve Yeni Araç */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            {/* Arama */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Son 3 hane ile ara... (örn: 123)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500 bg-white border rounded px-2 py-1">
                  {filteredVehicles.length} araç bulundu
                </div>
              )}
            </div>
            
            {/* Yeni Araç Ekleme */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Plaka"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="text"
                placeholder="Konum (A3)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleAddVehicle}
                disabled={isAddingVehicle || !newPlate.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingVehicle ? <LoadingSpinner size="sm" /> : 'Ekle'}
              </button>
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

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Parkta */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b bg-gray-50 rounded-t-lg">
              <h3 className="font-semibold text-gray-800">
                Parkta ({groupedVehicles.parked.length})
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[400px]">
              {groupedVehicles.parked.map(vehicle => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  onStatusUpdate={handleStatusUpdate}
                  onRefresh={fetchVehicles}
                />
              ))}
            </div>
          </div>

          {/* Çağrıldı */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b bg-yellow-50 rounded-t-lg">
              <h3 className="font-semibold text-yellow-800">
                Çağrıldı ({groupedVehicles.requested.length})
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[400px]">
              {groupedVehicles.requested.map(vehicle => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  onStatusUpdate={handleStatusUpdate}
                  onRefresh={fetchVehicles}
                />
              ))}
            </div>
          </div>

          {/* Hazırlanıyor */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b bg-blue-50 rounded-t-lg">
              <h3 className="font-semibold text-blue-800">
                Hazırlanıyor ({groupedVehicles.preparing.length})
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[400px]">
              {groupedVehicles.preparing.map(vehicle => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  onStatusUpdate={handleStatusUpdate}
                  onRefresh={fetchVehicles}
                />
              ))}
            </div>
          </div>

          {/* Hazır */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b bg-green-50 rounded-t-lg">
              <h3 className="font-semibold text-green-800">
                Hazır ({groupedVehicles.ready.length})
              </h3>
            </div>
            <div className="p-4 space-y-3 min-h-[400px]">
              {groupedVehicles.ready.map(vehicle => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  onStatusUpdate={handleStatusUpdate}
                  onRefresh={fetchVehicles}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Araç Kartı Component'i
interface VehicleCardProps {
  vehicle: Vehicle;
  onStatusUpdate: (vehicleId: string, currentStatus: string) => void;
  onRefresh: () => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onStatusUpdate, onRefresh }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(vehicle.valet_notes || '');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const isLoyal = vehicle.is_loyal === true;
  const macroButtonText = getMacroButtonText(vehicle.status);
  const macroButtonColor = getMacroButtonColor(vehicle.status);
  const isReady = vehicle.status === 'ready';

  // Fotoğraf yükleme
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await valetAPI.uploadVehiclePhoto(vehicle.id, file);
      if (result.success) {
        onRefresh();
      }
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
    }
    setIsUploading(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      {/* Plaka ve Loyalty */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h4 className="font-bold text-lg">
            {formatPlateForDisplay(vehicle.plate)}
          </h4>
          {isLoyal && (
            <span 
              className="text-yellow-500 cursor-help relative group" 
              title="Sadık Müşteri - Son 90 günde 3+ ziyaret"
            >
              ⭐️
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Sadık Müşteri<br/>
                Son 90 günde 3+ ziyaret
              </div>
            </span>
          )}
        </div>
        
        {/* Fotoğraf Thumbnail ve Yükleme */}
        <div className="flex items-center space-x-2">
          {vehicle.vehicle_photo_url && (
            <button
              onClick={() => setShowPhoto(true)}
              className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden"
            >
              <img 
                src={vehicle.vehicle_photo_url} 
                alt="Araç" 
                className="w-full h-full object-cover"
              />
            </button>
          )}
          
          {/* Fotoğraf Yükleme Butonu */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploading}
            />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              isUploading 
                ? 'bg-gray-200 text-gray-400' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}>
              {isUploading ? '⏳' : '📷'}
            </div>
          </label>
        </div>
      </div>

      {/* Konum */}
      {vehicle.location_note && (
        <p className="text-sm text-gray-600 mb-2">📍 {vehicle.location_note}</p>
      )}

      {/* Geri Sayım (sadece requested durumunda) */}
      {vehicle.status === 'requested' && vehicle.requested_at && vehicle.requested_in && (
        <div className="flex items-center justify-center mb-3">
          <CountdownCircle 
            requestedAt={vehicle.requested_at}
            requestedIn={vehicle.requested_in}
          />
        </div>
      )}

      {/* Durum Chip */}
      <div className="mb-3">
        <StatusChip status={vehicle.status} />
      </div>

      {/* Makro Buton */}
      {macroButtonText && (
        <button
          onClick={() => onStatusUpdate(vehicle.id, vehicle.status)}
          className={`w-full py-2 text-white rounded-lg transition-colors font-medium ${macroButtonColor}`}
        >
          {macroButtonText}
        </button>
      )}

      {/* Vale Notları */}
      <div className="mt-2">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          📝 Notlar
        </button>
        {showNotes && (
          <div className="mt-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vale notları..."
              className="w-full text-sm p-2 border border-gray-300 rounded resize-none"
              rows={2}
              maxLength={160}
            />
            <p className="text-xs text-gray-400 mt-1">
              Bu notları işletme sahibi göremez. Kişisel veri yazmayın.
            </p>
          </div>
        )}
      </div>

      {/* Fotoğraf Modal */}
      {showPhoto && vehicle.vehicle_photo_url && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowPhoto(false)}
        >
          <img 
            src={vehicle.vehicle_photo_url} 
            alt="Araç Fotoğrafı"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default ValetDashboard;
