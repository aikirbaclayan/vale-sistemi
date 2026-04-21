import axios from 'axios';
import { Vehicle, VehicleLog, CustomerRequest, CustomerFeedback, OwnerMetrics, ApiResponse } from '../types';

// API base URL'i daima /api/v1 ile bitirecek şekilde normalize et
const RAW_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';
const API_BASE_URL = RAW_API_URL.endsWith('/api/v1')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/$/, '')}/api/v1`;

// Tanı amaçlı log
// eslint-disable-next-line no-console
console.log('API_BASE_URL =>', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Plaka normalizasyon fonksiyonu
export const normalizePlate = (plate: string): string => {
  return plate.replace(/[\s-]/g, '').toUpperCase();
};

// Müşteri API'leri
export const customerAPI = {
  // Plaka doğrulama
  validatePlate: async (plate: string): Promise<ApiResponse<boolean>> => {
    try {
      const normalizedPlate = normalizePlate(plate);
      const response = await api.get(`/customer/validate-plate/${normalizedPlate}`);
      return response.data;
    } catch (error) {
      // 404 ise data:false döndür (gürültüyü azalt)
      if ((error as any)?.response?.status === 404) {
        return { success: true, data: false } as unknown as ApiResponse<boolean>;
      }
      console.error('Plaka doğrulama hatası:', error);
      return { success: false, error: 'Plaka doğrulanamadı' };
    }
  },

  // Araç çağrı talebi
  requestVehicle: async (request: CustomerRequest): Promise<ApiResponse<CustomerFeedback>> => {
    try {
      const normalizedRequest = {
        ...request,
        plate: normalizePlate(request.plate),
      };
      const response = await api.post('/customer/request-vehicle', normalizedRequest);
      return response.data;
    } catch (error) {
      console.error('Araç çağrı hatası:', error);
      return { success: false, error: 'Araç çağrı talebi gönderilemedi' };
    }
  },

  // Araç durumu sorgulama
  getVehicleStatus: async (plate: string): Promise<ApiResponse<Vehicle>> => {
    try {
      const normalizedPlate = normalizePlate(plate);
      const response = await api.get(`/customer/vehicle-status/${normalizedPlate}`);
      return response.data;
    } catch (error) {
      console.error('Durum sorgulama hatası:', error);
      return { success: false, error: 'Araç durumu sorgulanamadı' };
    }
  },
};

// Vale API'leri
export const valetAPI = {
  // Tüm aktif araçları getir
  getVehicles: async (): Promise<ApiResponse<Vehicle[]>> => {
    try {
      const response = await api.get('/valet/vehicles');
      return response.data;
    } catch (error) {
      console.error('Araç listesi getirme hatası:', error);
      return { success: false, error: 'Araç listesi getirilemedi' };
    }
  },

  // Yeni araç kaydı
  addVehicle: async (plate: string, locationNote?: string): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await api.post('/valet/vehicles', {
        plate: normalizePlate(plate),
        location_note: locationNote,
      });
      return response.data;
    } catch (error) {
      console.error('Araç kayıt hatası:', error);
      return { success: false, error: 'Araç kaydedilemedi' };
    }
  },

  // Araç durumu güncelleme
  updateVehicleStatus: async (
    vehicleId: string,
    status: Vehicle['status'],
    notes?: string
  ): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await api.put(`/valet/vehicles/${vehicleId}/status`, {
        status,
        valet_notes: notes,
      });
      return response.data;
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      return { success: false, error: 'Durum güncellenemedi' };
    }
  },

  // Araç teslim et (vehicles tablosundan sil, logs'a ekle)
  deliverVehicle: async (vehicleId: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post(`/valet/vehicles/${vehicleId}/deliver`);
      return response.data;
    } catch (error) {
      console.error('Teslim hatası:', error);
      return { success: false, error: 'Araç teslim edilemedi' };
    }
  },

  // Araç fotoğrafı yükleme
  uploadVehiclePhoto: async (vehicleId: string, photo: File): Promise<ApiResponse<string>> => {
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      const response = await api.post(`/valet/vehicles/${vehicleId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      return { success: false, error: 'Fotoğraf yüklenemedi' };
    }
  },
};

// İşletme sahibi API'leri
export const ownerAPI = {
  // Günlük metrikleri getir
  getMetrics: async (date?: string): Promise<ApiResponse<OwnerMetrics>> => {
    try {
      const params = date ? { date } : {};
      const response = await api.get('/owner/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('Metrik getirme hatası:', error);
      return { success: false, error: 'Metrikler getirilemedi' };
    }
  },

  // CSV rapor indirme
  downloadReport: async (date: string): Promise<Blob | null> => {
    try {
      const response = await api.get(`/owner/report/${date}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      return null;
    }
  },

  // WhatsApp günlük özeti gönderme
  sendDailySummary: async (): Promise<ApiResponse<boolean>> => {
    try {
      const response = await api.post('/owner/send-daily-summary');
      return response.data;
    } catch (error) {
      console.error('Özet gönderme hatası:', error);
      return { success: false, error: 'Özet gönderilemedi' };
    }
  },

  // Plaka düzeltme
  correctPlate: async (vehicleId: string, newPlate: string): Promise<ApiResponse<Vehicle>> => {
    try {
      const response = await api.put(`/owner/vehicles/${vehicleId}/correct-plate`, {
        plate: normalizePlate(newPlate),
      });
      return response.data;
    } catch (error) {
      console.error('Plaka düzeltme hatası:', error);
      return { success: false, error: 'Plaka düzeltilemedi' };
    }
  },
};

export default api;
