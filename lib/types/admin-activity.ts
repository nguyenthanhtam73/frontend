export type AdminActivityCheckIn = {
  user_id: string;
  username: string;
  email: string;
  display_name?: string;
  check_id: string;
  has_photos: boolean;
  photo_count: number;
  photo_urls: string[];
  created_at: string;
};

export type AdminActivityProductUse = {
  user_id: string;
  username: string;
  email: string;
  display_name?: string;
  morning_ticked: number;
  evening_ticked: number;
  ticked_titles: string[];
  updated_at: string;
};

export type AdminActivityResponse = {
  date: string;
  check_in_count: number;
  check_in_photo_count: number;
  product_usage_count: number;
  check_ins: AdminActivityCheckIn[];
  product_usage: AdminActivityProductUse[];
};
