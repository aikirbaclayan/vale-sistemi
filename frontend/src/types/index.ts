// Veritabanı şemasına uygun TypeScript tipleri

export interface Vehicle {
  id: string;
  plate: string;
  status: 'parked' | 'requested' | 'preparing' | 'ready';
  vehicle_photo_url?: string;
  location_note?: string;
  check_in_at: string;
  requested_at?: string;
  ready_at?: string;
  requested_in?: number;
  valet_notes?: string;
  is_loyal?: boolean;
}

export interface VehicleLog {
  id: string;
  plate: string;
  check_in_at: string;
  check_out_at: string;
  total_stay_duration: number;
  wait_time: number;
  valet_id?: string;
}

// API Response tipleri
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Müşteri çağrı talebi
export interface CustomerRequest {
  plate: string;
  requested_in: number; // 5, 10, 15 dakika
  customer_phone?: string;
}

// Müşteri geri bildirim
export interface CustomerFeedback {
  success: boolean;
  message: string;
  queuePosition?: number;
  estimatedTime?: number;
}

// Vale dashboard için durum
export interface ValetDashboardData {
  vehicles: Vehicle[];
  totalCount: number;
}

// İşletme sahibi metrikleri
export interface OwnerMetrics {
  todayCount: number;
  parkedCount: number;
  avgWaitTime: number;
  avgStayTime: number;
  loyaltyRate: number;
  hourlyData: Array<{
    hour: number;
    count: number;
  }>;
}
