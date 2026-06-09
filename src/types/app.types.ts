export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  invite_token: string;
  created_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile?: Profile;
}

export interface Stop {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  notes: string | null;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  start_time: string | null;
  end_time: string | null;
  day_index: number | null;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  stop_id: string | null;
  created_at: string;
  splits?: ExpenseSplit[];
  payer?: Profile;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share: number;
  profile?: Profile;
}

export interface Media {
  id: string;
  trip_id: string;
  uploaded_by: string;
  stop_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number | null;
  thumbnail_path: string | null;
  created_at: string;
  signedUrl?: string;
}
