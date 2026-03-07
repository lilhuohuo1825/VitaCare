export interface StoreAddress {
  so_nha?: string;
  duong?: string;
  phuong_xa?: string;
  quan_huyen?: string;
  tinh_thanh?: string;
  ma_tinh?: string;
  ma_quan?: string;
  dia_chi_day_du?: string;
}

export interface StoreCoordinates {
  lat: number;
  lng: number;
}

export interface TimeSlot {
  mo_cua: string;
  dong_cua: string;
}

export interface StoreSchedule {
  thu_2_6?: TimeSlot;
  thu_7?: TimeSlot;
  chu_nhat?: TimeSlot;
  ngay_le?: string;
  ghi_chu?: string;
}

export interface StoreDanhGia {
  diem_tb?: number;
  so_luot?: number;
  binh_luan_noi_bat?: string[];
}

export interface StoreDuocSi {
  ho_ten?: string;
  trinh_do?: string;
  kinh_nghiem?: string;
  chuyen_mon?: string[];
}

export interface StoreGiayPhep {
  so_giay_phep?: string;
  noi_cap?: string;
  ngay_het_han?: string;
}

export interface Store {
  _id?: string;
  ma_cua_hang?: string;
  ten_cua_hang?: string;
  loai_hinh?: string;
  dia_chi?: StoreAddress;
  toa_do?: StoreCoordinates;
  thong_tin_lien_he?: {
    so_dien_thoai?: string[];
    email?: string;
    website?: string;
    hotline?: string;
    zalo?: string;
  };
  thoi_gian_hoat_dong?: StoreSchedule;
  dich_vu?: string[];
  tien_nghi?: string[];
  giao_hang?: boolean;
  ban_kinh_giao_hang?: number;
  danh_gia?: StoreDanhGia;
  mo_ta?: string;
  duoc_si?: StoreDuocSi;
  giay_phep?: StoreGiayPhep;
  phuong_thuc_thanh_toan?: string[];
}
