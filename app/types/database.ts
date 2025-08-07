// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      registrations: {
        Row: Registration;
        Insert: RegistrationInsert;
        Update: RegistrationUpdate;
      };
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
    Enums: {
      [key: string]: any;
    };
  };
}

// Registration table types
export interface Registration {
  id: number;
  registration_id: string;
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  line_id: string;
  email: string;
  company_name: string;
  business_type: string;
  business_type_other: string | null;
  yec_province: string;
  hotel_choice: 'in-quota' | 'out-of-quota';
  room_type: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info: string | null;
  roommate_phone: string | null;
  external_hotel_name: string | null;
  travel_type: 'private-car' | 'van';
  profile_image_url: string | null;
  chamber_card_url: string | null;
  payment_slip_url: string | null;
  badge_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  form_data: any;
  created_at: string;
  updated_at: string;
}

export interface RegistrationInsert {
  registration_id: string;
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  line_id: string;
  email: string;
  company_name: string;
  business_type: string;
  business_type_other?: string | null;
  yec_province: string;
  hotel_choice: 'in-quota' | 'out-of-quota';
  room_type?: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info?: string | null;
  roommate_phone?: string | null;
  external_hotel_name?: string | null;
  travel_type: 'private-car' | 'van';
  profile_image_url?: string | null;
  chamber_card_url?: string | null;
  payment_slip_url?: string | null;
  badge_url?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  status?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  form_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface RegistrationUpdate {
  registration_id?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  phone?: string;
  line_id?: string;
  email?: string;
  company_name?: string;
  business_type?: string;
  business_type_other?: string | null;
  yec_province?: string;
  hotel_choice?: 'in-quota' | 'out-of-quota';
  room_type?: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info?: string | null;
  roommate_phone?: string | null;
  external_hotel_name?: string | null;
  travel_type?: 'private-car' | 'van';
  profile_image_url?: string | null;
  chamber_card_url?: string | null;
  payment_slip_url?: string | null;
  badge_url?: string | null;
  email_sent?: boolean;
  email_sent_at?: string | null;
  status?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  form_data?: any;
  created_at?: string;
  updated_at?: string;
} 