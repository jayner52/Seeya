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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      calendar_sharing: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          owner_id: string
          shared_with_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          owner_id: string
          shared_with_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          owner_id?: string
          shared_with_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sharing_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sharing_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          google_place_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          region: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          region?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          continent: string
          created_at: string
          emoji: string
          id: string
          name: string
        }
        Insert: {
          code: string
          continent: string
          created_at?: string
          emoji: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          continent?: string
          created_at?: string
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_participants: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_participants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "trip_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          friendship_id: string | null
          from_user_id: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          trip_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friendship_id?: string | null
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          trip_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          friendship_id?: string | null
          from_user_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          trip_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bio_visibility: string | null
          created_at: string | null
          full_name: string | null
          homebase_city: string | null
          homebase_city_id: string | null
          homebase_google_place_id: string | null
          id: string
          notify_friend_requests: boolean | null
          notify_trip_invites: boolean | null
          notify_trip_messages: boolean | null
          notify_tripbit_participant: boolean | null
          onboarding_completed: boolean | null
          recommendations_visibility: string | null
          stats_visibility: string | null
          travel_pals_visibility: string | null
          trips_visibility: string | null
          updated_at: string | null
          username: string
          wanderlist_visibility: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bio_visibility?: string | null
          created_at?: string | null
          full_name?: string | null
          homebase_city?: string | null
          homebase_city_id?: string | null
          homebase_google_place_id?: string | null
          id: string
          notify_friend_requests?: boolean | null
          notify_trip_invites?: boolean | null
          notify_trip_messages?: boolean | null
          notify_tripbit_participant?: boolean | null
          onboarding_completed?: boolean | null
          recommendations_visibility?: string | null
          stats_visibility?: string | null
          travel_pals_visibility?: string | null
          trips_visibility?: string | null
          updated_at?: string | null
          username: string
          wanderlist_visibility?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bio_visibility?: string | null
          created_at?: string | null
          full_name?: string | null
          homebase_city?: string | null
          homebase_city_id?: string | null
          homebase_google_place_id?: string | null
          id?: string
          notify_friend_requests?: boolean | null
          notify_trip_invites?: boolean | null
          notify_trip_messages?: boolean | null
          notify_tripbit_participant?: boolean | null
          onboarding_completed?: boolean | null
          recommendations_visibility?: string | null
          stats_visibility?: string | null
          travel_pals_visibility?: string | null
          trips_visibility?: string | null
          updated_at?: string | null
          username?: string
          wanderlist_visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_homebase_city_id_fkey"
            columns: ["homebase_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_participants: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_participants_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "trip_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recommendations: {
        Row: {
          created_at: string | null
          id: string
          shared_recommendation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shared_recommendation_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shared_recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recommendations_shared_recommendation_id_fkey"
            columns: ["shared_recommendation_id"]
            isOneToOne: false
            referencedRelation: "shared_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_recommendations: {
        Row: {
          category: Database["public"]["Enums"]["recommendation_category"]
          city_id: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          google_place_id: string | null
          id: string
          rating: number | null
          source_resource_id: string | null
          source_trip_id: string | null
          tips: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["recommendation_category"]
          city_id?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          rating?: number | null
          source_resource_id?: string | null
          source_trip_id?: string | null
          tips?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["recommendation_category"]
          city_id?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          rating?: number | null
          source_resource_id?: string | null
          source_trip_id?: string | null
          tips?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_recommendations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_recommendations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_recommendations_source_resource_id_fkey"
            columns: ["source_resource_id"]
            isOneToOne: false
            referencedRelation: "trip_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_recommendations_source_trip_id_fkey"
            columns: ["source_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_chat_reads: {
        Row: {
          id: string
          last_read_at: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_chat_reads_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invites: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          included_location_ids: string[] | null
          included_tripbit_ids: string[] | null
          max_uses: number | null
          token: string
          trip_id: string
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          included_location_ids?: string[] | null
          included_tripbit_ids?: string[] | null
          max_uses?: number | null
          token?: string
          trip_id: string
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          included_location_ids?: string[] | null
          included_tripbit_ids?: string[] | null
          max_uses?: number | null
          token?: string
          trip_id?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_locations: {
        Row: {
          city_id: string | null
          created_at: string | null
          destination: string
          end_date: string | null
          id: string
          order_index: number
          start_date: string | null
          trip_id: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          destination: string
          end_date?: string | null
          id?: string
          order_index?: number
          start_date?: string | null
          trip_id: string
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          destination?: string
          end_date?: string | null
          id?: string
          order_index?: number
          start_date?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_participants: {
        Row: {
          id: string
          invited_at: string | null
          personal_visibility:
            | Database["public"]["Enums"]["visibility_level"]
            | null
          responded_at: string | null
          status: Database["public"]["Enums"]["participation_status"]
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          personal_visibility?:
            | Database["public"]["Enums"]["visibility_level"]
            | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["participation_status"]
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          personal_visibility?:
            | Database["public"]["Enums"]["visibility_level"]
            | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["participation_status"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_recommendations: {
        Row: {
          category: Database["public"]["Enums"]["recommendation_category"]
          created_at: string | null
          description: string | null
          id: string
          location_id: string | null
          title: string
          trip_id: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          title: string
          trip_id: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          title?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_recommendations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "trip_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_recommendations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_resources: {
        Row: {
          category: Database["public"]["Enums"]["resource_category"]
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          location_id: string | null
          metadata: Json | null
          order_index: number | null
          start_date: string | null
          title: string
          trip_id: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["resource_category"]
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          order_index?: number | null
          start_date?: string | null
          title: string
          trip_id: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["resource_category"]
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          order_index?: number | null
          start_date?: string | null
          title?: string
          trip_id?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "trip_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_resources_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_types: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          city_id: string | null
          created_at: string | null
          description: string | null
          destination: string
          end_date: string | null
          flexible_month: string | null
          id: string
          is_flexible_dates: boolean
          is_logged_past_trip: boolean | null
          name: string
          owner_id: string
          start_date: string | null
          trip_type_id: string | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          destination: string
          end_date?: string | null
          flexible_month?: string | null
          id?: string
          is_flexible_dates?: boolean
          is_logged_past_trip?: boolean | null
          name: string
          owner_id: string
          start_date?: string | null
          trip_type_id?: string | null
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string
          end_date?: string | null
          flexible_month?: string | null
          id?: string
          is_flexible_dates?: boolean
          is_logged_past_trip?: boolean | null
          name?: string
          owner_id?: string
          start_date?: string | null
          trip_type_id?: string | null
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "trips_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_trip_type_id_fkey"
            columns: ["trip_type_id"]
            isOneToOne: false
            referencedRelation: "trip_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wanderlist: {
        Row: {
          city_id: string | null
          country_id: string | null
          created_at: string | null
          google_place_id: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string | null
          google_place_id?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string | null
          google_place_id?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanderlist_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanderlist_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trip_invite: { Args: { _token: string }; Returns: string }
      are_friends: {
        Args: { _user_id_1: string; _user_id_2: string }
        Returns: boolean
      }
      get_circle_trips: {
        Args: { _user_id: string }
        Returns: {
          country_emoji: string
          destination: string
          end_date: string
          owner_avatar_url: string
          owner_full_name: string
          owner_id: string
          owner_username: string
          start_date: string
          trip_id: string
          trip_name: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }[]
      }
      get_popular_locations: {
        Args: { _user_id: string }
        Returns: {
          country_emoji: string
          country_name: string
          is_country: boolean
          location_name: string
          trip_count: number
        }[]
      }
      get_suggested_friends: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          mutual_count: number
          suggestion_reason: string
          user_id: string
          username: string
        }[]
      }
      get_trending_wanderlist: {
        Args: { _user_id: string }
        Returns: {
          city_id: string
          country_emoji: string
          country_id: string
          friend_count: number
          google_place_id: string
          name: string
        }[]
      }
      get_trip_invite_preview: { Args: { _token: string }; Returns: Json }
      get_tripmates: {
        Args: { _user_id: string }
        Returns: {
          first_shared_trip_date: string
          user_id: string
        }[]
      }
      get_user_countries_and_cities: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: {
          country_emoji: string
          country_name: string
          emoji: string
          item_id: string
          name: string
          rec_count: number
          trip_count: number
          type: string
        }[]
      }
      get_user_profile_stats: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: {
          cities_with_recs: number
          countries_visited: number
          recommendations_count: number
          trips_count: number
        }[]
      }
      get_user_public_trips: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: {
          destination: string
          end_date: string
          flexible_month: string
          id: string
          is_flexible_dates: boolean
          is_owner: boolean
          name: string
          start_date: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_trip_owner: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_participant: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      search_users_for_friends: {
        Args: { _query: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          username: string
        }[]
      }
      shares_trip_with: {
        Args: { _user_id_1: string; _user_id_2: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      friendship_status: "pending" | "accepted" | "declined"
      notification_type:
        | "friend_request"
        | "friend_accepted"
        | "trip_invite"
        | "trip_accepted"
        | "trip_declined"
        | "friend_trip"
        | "trip_message"
        | "trip_resource"
        | "trip_recommendation"
        | "join_request"
        | "trip_tripbit"
        | "tripbit_participant_added"
      participation_status:
        | "invited"
        | "confirmed"
        | "declined"
        | "pending"
        | "tentative"
      recommendation_category: "restaurant" | "activity" | "stay" | "tip"
      resource_category:
        | "accommodation"
        | "transportation"
        | "money"
        | "reservation"
        | "document"
        | "communication"
        | "other"
        | "flight"
        | "rental_car"
        | "activity"
      visibility_level:
        | "only_me"
        | "busy_only"
        | "dates_only"
        | "location_only"
        | "full_details"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      friendship_status: ["pending", "accepted", "declined"],
      notification_type: [
        "friend_request",
        "friend_accepted",
        "trip_invite",
        "trip_accepted",
        "trip_declined",
        "friend_trip",
        "trip_message",
        "trip_resource",
        "trip_recommendation",
        "join_request",
        "trip_tripbit",
        "tripbit_participant_added",
      ],
      participation_status: [
        "invited",
        "confirmed",
        "declined",
        "pending",
        "tentative",
      ],
      recommendation_category: ["restaurant", "activity", "stay", "tip"],
      resource_category: [
        "accommodation",
        "transportation",
        "money",
        "reservation",
        "document",
        "communication",
        "other",
        "flight",
        "rental_car",
        "activity",
      ],
      visibility_level: [
        "only_me",
        "busy_only",
        "dates_only",
        "location_only",
        "full_details",
      ],
    },
  },
} as const
