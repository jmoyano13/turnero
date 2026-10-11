export type UserRole = "owner" | "player";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_numbers: string[];
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Court = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type SystemSettings = {
  id: number;
  current_price: number;
  updated_at: string;
  updated_by: string | null;
};

export type Booking = {
  id: string;
  court_id: string;
  player_id: string | null;
  manual_player_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  is_manual: boolean;
  total_price: number;
  deposit_amount: number;
  payment_status: "none" | "pending" | "paid" | "refund_pending";
  payment_id: string | null;
  paid_at: string | null;
  refund_required: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingPaymentAttempt = {
  id: string;
  player_id: string;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  deposit_amount: number;
  status: "pending" | "confirmed" | "lost" | "failed";
  preference_id: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CourtLock = {
  id: string;
  court_id: string | null;
  court_scope: "single" | "both";
  lock_type: "one_time" | "recurring";
  reason: string;
  specific_date: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      courts: {
        Row: Court;
        Insert: { id?: string; name: string; is_active?: boolean; created_at?: string };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      system_settings: {
        Row: SystemSettings;
        Insert: { id?: number; current_price: number; updated_at?: string; updated_by?: string | null };
        Update: { current_price?: number; updated_at?: string; updated_by?: string | null };
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: {
          id?: string; court_id: string; player_id?: string | null; manual_player_name?: string | null;
          booking_date: string; start_time: string; end_time: string; status?: Booking["status"];
          is_manual?: boolean; total_price: number; deposit_amount: number;
          payment_status?: Booking["payment_status"]; payment_id?: string | null; paid_at?: string | null;
          refund_required?: boolean; created_at?: string; updated_at?: string;
        };
        Update: Partial<Booking>;
        Relationships: [];
      };
      booking_payment_attempts: {
        Row: BookingPaymentAttempt;
        Insert: {
          id?: string; player_id: string; court_id: string; booking_date: string;
          start_time: string; end_time: string; total_price: number; deposit_amount: number;
          status?: BookingPaymentAttempt["status"]; preference_id?: string | null;
          payment_id?: string | null; created_at?: string; updated_at?: string;
        };
        Update: Partial<BookingPaymentAttempt>;
        Relationships: [];
      };
      locks: {
        Row: CourtLock;
        Insert: {
          id?: string; court_id?: string | null; court_scope: CourtLock["court_scope"];
          lock_type: CourtLock["lock_type"]; reason: string; specific_date?: string | null;
          day_of_week?: number | null; start_time: string; end_time: string; is_active?: boolean;
          created_by: string; created_at?: string;
        };
        Update: Partial<CourtLock>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone_numbers?: string[];
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          email?: string;
          phone_numbers?: string[];
          role?: UserRole;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_owner: { Args: Record<string, never>; Returns: boolean };
      owner_create_manual_booking: {
        Args: {
          p_court_id: string;
          p_booking_date: string;
          p_start_time: string;
          p_player_id: string | null;
          p_manual_player_name: string | null;
        };
        Returns: Json;
      };
      owner_update_booking: {
        Args: { p_booking_id: string; p_court_id: string; p_booking_date: string; p_start_time: string };
        Returns: Json;
      };
      owner_cancel_booking: { Args: { p_booking_id: string }; Returns: Json };
      create_booking_payment_attempt: {
        Args: { p_court_id: string; p_booking_date: string; p_start_time: string };
        Returns: Json;
      };
      record_booking_preference: { Args: { p_attempt_id: string; p_preference_id: string }; Returns: boolean };
      confirm_booking_payment: {
        Args: { p_attempt_id: string; p_payment_id: string; p_amount_paid: number };
        Returns: Json;
      };
      cancel_booking_by_player: { Args: { p_booking_id: string }; Returns: Json };
      get_public_bookings_by_date: {
        Args: { p_booking_date: string };
        Returns: Array<{ court_id: string; start_time: string; end_time: string }>;
      };
      get_affected_bookings_for_lock: {
        Args: {
          p_lock_type: string;
          p_court_scope: string;
          p_court_id: string | null;
          p_specific_date: string | null;
          p_day_of_week: number | null;
          p_start_time: string;
          p_end_time: string;
        };
        Returns: Array<{
          booking_id: string;
          booking_date: string;
          start_time: string;
          court_name: string;
          player_name: string;
        }>;
      };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
}