export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ayarlar: {
        Row: {
          aidat_mail_gonderim: Json
          aidat_tutar: number
          ekstra_hocalar: Json
          gonderen_ad: string
          gonderen_eposta: string
          grup_liste: Json
          hoca_mailler: Json
          id: string
          updated_at: string
        }
        Insert: {
          aidat_mail_gonderim?: Json
          aidat_tutar?: number
          ekstra_hocalar?: Json
          gonderen_ad?: string
          gonderen_eposta?: string
          grup_liste?: Json
          hoca_mailler?: Json
          id: string
          updated_at?: string
        }
        Update: {
          aidat_mail_gonderim?: Json
          aidat_tutar?: number
          ekstra_hocalar?: Json
          gonderen_ad?: string
          gonderen_eposta?: string
          grup_liste?: Json
          hoca_mailler?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      talebeler: {
        Row: {
          aidat: Json
          aidat_haric: boolean
          aidat_sadece: boolean
          created_at: string
          dogum: string | null
          fikih_gunler: Json
          fikih_konu: number
          foto_url: string | null
          gecmis: Json
          grup: string | null
          hadis_gunler: Json
          hadis_no: number
          hedef_haftalik: number
          id: string
          isim: string
          kiraat: boolean
          kiraat_gunler: Json
          notlar: string | null
          sayfa: number
          sinif: string | null
          sira: number
          telefon: string | null
          updated_at: string
          yon: string
        }
        Insert: {
          aidat?: Json
          aidat_haric?: boolean
          aidat_sadece?: boolean
          created_at?: string
          dogum?: string | null
          fikih_gunler?: Json
          fikih_konu?: number
          foto_url?: string | null
          gecmis?: Json
          grup?: string | null
          hadis_gunler?: Json
          hadis_no?: number
          hedef_haftalik?: number
          id?: string
          isim?: string
          kiraat?: boolean
          kiraat_gunler?: Json
          notlar?: string | null
          sayfa?: number
          sinif?: string | null
          sira?: number
          telefon?: string | null
          updated_at?: string
          yon?: string
        }
        Update: {
          aidat?: Json
          aidat_haric?: boolean
          aidat_sadece?: boolean
          created_at?: string
          dogum?: string | null
          fikih_gunler?: Json
          fikih_konu?: number
          foto_url?: string | null
          gecmis?: Json
          grup?: string | null
          hadis_gunler?: Json
          hadis_no?: number
          hedef_haftalik?: number
          id?: string
          isim?: string
          kiraat?: boolean
          kiraat_gunler?: Json
          notlar?: string | null
          sayfa?: number
          sinif?: string | null
          sira?: number
          telefon?: string | null
          updated_at?: string
          yon?: string
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
