import { useState, useEffect } from 'react';
import { offlineManager, QueuedAction } from '../utils/offline';
import { valetAPI } from '../services/api';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedActionsCount, setQueuedActionsCount] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // İlk yüklemede kuyruğu kontrol et
    updateQueueCount();
    if (isOnline) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateQueueCount = async () => {
    try {
      const actions = await offlineManager.getQueuedActions();
      setQueuedActionsCount(actions.length);
    } catch (error) {
      console.error('Kuyruk sayısı güncellenemedi:', error);
    }
  };

  const queueAction = async (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
    try {
      await offlineManager.queueAction(action);
      await updateQueueCount();
      
      // Online'sa hemen işlemeye çalış
      if (isOnline) {
        processQueue();
      }
    } catch (error) {
      console.error('Eylem kuyruğa eklenemedi:', error);
      throw error;
    }
  };

  const processQueue = async () => {
    if (isProcessingQueue || !isOnline) return;

    setIsProcessingQueue(true);

    try {
      const actions = await offlineManager.getQueuedActions();
      
      for (const action of actions) {
        try {
          let success = false;

          switch (action.type) {
            case 'status_update':
              const statusResult = await valetAPI.updateVehicleStatus(
                action.data.vehicleId,
                action.data.status,
                action.data.notes
              );
              success = statusResult.success;
              break;

            case 'add_vehicle':
              const addResult = await valetAPI.addVehicle(
                action.data.plate,
                action.data.locationNote
              );
              success = addResult.success;
              break;

            case 'deliver_vehicle':
              const deliverResult = await valetAPI.deliverVehicle(action.data.vehicleId);
              success = deliverResult.success;
              break;

            case 'upload_photo':
              const photoResult = await valetAPI.uploadVehiclePhoto(
                action.data.vehicleId,
                action.data.photo
              );
              success = photoResult.success;
              break;

            default:
              console.warn('Bilinmeyen eylem tipi:', action.type);
              success = true; // Bilinmeyen eylemi kuyruktan çıkar
              break;
          }

          if (success) {
            await offlineManager.removeAction(action.id);
          } else {
            // Başarısız olursa retry count'u artır
            if (action.retryCount < 3) {
              await offlineManager.updateRetryCount(action.id);
            } else {
              // 3 denemeden sonra kuyruğu temizle
              await offlineManager.removeAction(action.id);
              console.warn('Eylem 3 denemeden sonra kuyruktan çıkarıldı:', action);
            }
          }
        } catch (error) {
          console.error('Kuyruk işleme hatası:', error);
          if (action.retryCount < 3) {
            await offlineManager.updateRetryCount(action.id);
          } else {
            await offlineManager.removeAction(action.id);
          }
        }
      }

      await updateQueueCount();
    } catch (error) {
      console.error('Kuyruk işleme genel hatası:', error);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const clearQueue = async () => {
    try {
      await offlineManager.clearAll();
      await updateQueueCount();
    } catch (error) {
      console.error('Kuyruk temizlenemedi:', error);
    }
  };

  return {
    isOnline,
    queuedActionsCount,
    isProcessingQueue,
    queueAction,
    processQueue,
    clearQueue,
    updateQueueCount
  };
};


