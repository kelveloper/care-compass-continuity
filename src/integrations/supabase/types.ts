export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          name: string
          date_of_birth: string
          diagnosis: string
          discharge_date: string
          required_followup: string
          insurance: string
          address: string
          leakage_risk_score: number
          leakage_risk_level: "low" | "medium" | "high"
          referral_status: "needed" | "sent" | "scheduled" | "completed"
          current_referral_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          date_of_birth: string
          diagnosis: string
          discharge_date: string
          required_followup: string
          insurance: string
          address: string
          leakage_risk_score: number
          leakage_risk_level: "low" | "medium" | "high"
          referral_status?: "needed" | "sent" | "scheduled" | "completed"
          current_referral_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          date_of_birth?: string
          diagnosis?: string
          discharge_date?: string
          required_followup?: string
          insurance?: string
          address?: string
          leakage_risk_score?: number
          leakage_risk_level?: "low" | "medium" | "high"
          referral_status?: "needed" | "sent" | "scheduled" | "completed"
          current_referral_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_current_referral_id_fkey"
            columns: ["current_referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          }
        ]
      }
      providers: {
        Row: {
          id: string
          name: string
          type: string
          address: string
          phone: string
          specialties: string[]
          accepted_insurance: string[]
          rating: number
          latitude: number | null
          longitude: number | null
          availability_next: string | null
          in_network_plans: string[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          address: string
          phone: string
          specialties: string[]
          accepted_insurance: string[]
          rating?: number
          latitude?: number | null
          longitude?: number | null
          availability_next?: string | null
          in_network_plans: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          address?: string
          phone?: string
          specialties?: string[]
          accepted_insurance?: string[]
          rating?: number
          latitude?: number | null
          longitude?: number | null
          availability_next?: string | null
          in_network_plans?: string[]
          created_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          patient_id: string
          provider_id: string
          service_type: string
          status: "pending" | "sent" | "scheduled" | "completed" | "cancelled"
          scheduled_date: string | null
          completed_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          provider_id: string
          service_type: string
          status?: "pending" | "sent" | "scheduled" | "completed" | "cancelled"
          scheduled_date?: string | null
          completed_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          provider_id?: string
          service_type?: string
          status?: "pending" | "sent" | "scheduled" | "completed" | "cancelled"
          scheduled_date?: string | null
          completed_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_history: {
        Row: {
          id: string
          referral_id: string
          status: string
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          referral_id: string
          status: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          referral_id?: string
          status?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_history_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Patient = Database["public"]["Tables"]["patients"]["Row"]
export type Provider = Database["public"]["Tables"]["providers"]["Row"]
export type Referral = Database["public"]["Tables"]["referrals"]["Row"]
export type ReferralHistory = Database["public"]["Tables"]["referral_history"]["Row"]

export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"]
export type ProviderInsert = Database["public"]["Tables"]["providers"]["Insert"]
export type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"]
export type ReferralHistoryInsert = Database["public"]["Tables"]["referral_history"]["Insert"]

export type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"]
export type ProviderUpdate = Database["public"]["Tables"]["providers"]["Update"]
export type ReferralUpdate = Database["public"]["Tables"]["referrals"]["Update"]
export type ReferralHistoryUpdate = Database["public"]["Tables"]["referral_history"]["Update"]