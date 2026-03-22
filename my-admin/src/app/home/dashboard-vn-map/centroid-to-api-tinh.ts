/**
 * Map tên tỉnh trên centroid (Highcharts) → giá trị `dia_chi.tinh_thanh` trong DB cửa hàng.
 */
const CENTROID_TO_API: Record<string, string> = {
  'Ha Noi': 'Hà Nội',
  'Hồ Chí Minh city': 'Hồ Chí Minh',
  'Hung Yen': 'Hưng Yên',
  'Da Nang': 'Đà Nẵng',
  'Can Tho': 'Cần Thơ',
  Haiphong: 'Hải Phòng',
  'Ha Tinh': 'Hà Tĩnh',
  'Son La': 'Sơn La',
  'Lai Chau': 'Lai Châu',
  'Dak Lak': 'Đắk Lắk',
  'Đăk Nông': 'Đắk Nông',
  'Bà Rịa-Vũng Tàu': 'Bà Rịa - Vũng Tàu',
  'Bắc Liêu': 'Bạc Liêu',
  'Hau Giang': 'Hậu Giang',
  'Gia Lai': 'Gia Lai'
};

/** Thử lần lượt nếu không có kết quả (Huế / Thừa Thiên Huế, Nha Trang / Khánh Hòa, …) */
const TRY_ALTERNATES: Record<string, string[]> = {
  Huế: ['Huế', 'Thừa Thiên Huế'],
  'Thừa Thiên Huế': ['Thừa Thiên Huế', 'Huế'],
  'Khánh Hòa': ['Khánh Hòa', 'Nha Trang'],
  'Nha Trang': ['Nha Trang', 'Khánh Hòa'],
  Vinh: ['Vinh', 'Nghệ An'],
  'Nghệ An': ['Nghệ An', 'Vinh'],
  'Vũng Tàu': ['Vũng Tàu', 'Bà Rịa - Vũng Tàu'],
  'Biên Hòa': ['Biên Hòa', 'Đồng Nai'],
  'Đồng Nai': ['Đồng Nai', 'Biên Hòa'],
  'Hà Tĩnh': ['Hà Tĩnh', 'Ha Tinh'],
  'Ha Tinh': ['Hà Tĩnh', 'Ha Tinh']
};

export function primaryApiTinhFromCentroid(centroidName: string): string {
  return CENTROID_TO_API[centroidName] ?? centroidName;
}

export function apiTinhQueryVariants(centroidName: string): string[] {
  const primary = primaryApiTinhFromCentroid(centroidName);
  const extra = TRY_ALTERNATES[primary] || TRY_ALTERNATES[centroidName];
  if (extra?.length) {
    const set = new Set<string>(extra);
    set.add(primary);
    return [...set];
  }
  return [primary];
}
