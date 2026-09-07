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
      cmdb_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changed_fields: string[] | null
          id: number
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changed_fields?: string[] | null
          id?: number
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changed_fields?: string[] | null
          id?: number
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      cmdb_ci_db_mssql_instance: {
        Row: {
          always_on: string | null
          app_id: string | null
          application_name: string | null
          backup_location: string | null
          backup_tool: string | null
          build: string | null
          checkdb: string | null
          cluster_listener_name: string | null
          core_count: number | null
          cpu_count: number | null
          critical_jobs: string | null
          database_feature: string | null
          database_web_features: string | null
          dba_lifecycle: string | null
          diff_backups: string | null
          edition: string | null
          environment: string | null
          eol_date: string | null
          fqdn: string | null
          full_backups: string | null
          gcc_managed: string | null
          index_job: string | null
          instance_name: string | null
          location: string | null
          log_backups: string | null
          manufacturer_model: string | null
          memory_gb: number | null
          metal_class_of_service: string | null
          monitoring: string | null
          operating_system: string | null
          rdp: string | null
          region: string | null
          sa: string | null
          sap_nonsap: string | null
          server_ip: string | null
          server_name: string
          server_state: string | null
          server_type: string | null
          service_owner: string | null
          sql_agent_service_account: string | null
          sql_port: number | null
          sql_service_account: string | null
          sql_version: string | null
          stats_update: string | null
          support_cycle: string | null
          sys_class_name: string
          sys_created_on: string
          sys_id: string
          sys_updated_on: string
          sysadmin: string | null
          windows_patching_schedule: string | null
        }
        Insert: {
          always_on?: string | null
          app_id?: string | null
          application_name?: string | null
          backup_location?: string | null
          backup_tool?: string | null
          build?: string | null
          checkdb?: string | null
          cluster_listener_name?: string | null
          core_count?: number | null
          cpu_count?: number | null
          critical_jobs?: string | null
          database_feature?: string | null
          database_web_features?: string | null
          dba_lifecycle?: string | null
          diff_backups?: string | null
          edition?: string | null
          environment?: string | null
          eol_date?: string | null
          fqdn?: string | null
          full_backups?: string | null
          gcc_managed?: string | null
          index_job?: string | null
          instance_name?: string | null
          location?: string | null
          log_backups?: string | null
          manufacturer_model?: string | null
          memory_gb?: number | null
          metal_class_of_service?: string | null
          monitoring?: string | null
          operating_system?: string | null
          rdp?: string | null
          region?: string | null
          sa?: string | null
          sap_nonsap?: string | null
          server_ip?: string | null
          server_name: string
          server_state?: string | null
          server_type?: string | null
          service_owner?: string | null
          sql_agent_service_account?: string | null
          sql_port?: number | null
          sql_service_account?: string | null
          sql_version?: string | null
          stats_update?: string | null
          support_cycle?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          sysadmin?: string | null
          windows_patching_schedule?: string | null
        }
        Update: {
          always_on?: string | null
          app_id?: string | null
          application_name?: string | null
          backup_location?: string | null
          backup_tool?: string | null
          build?: string | null
          checkdb?: string | null
          cluster_listener_name?: string | null
          core_count?: number | null
          cpu_count?: number | null
          critical_jobs?: string | null
          database_feature?: string | null
          database_web_features?: string | null
          dba_lifecycle?: string | null
          diff_backups?: string | null
          edition?: string | null
          environment?: string | null
          eol_date?: string | null
          fqdn?: string | null
          full_backups?: string | null
          gcc_managed?: string | null
          index_job?: string | null
          instance_name?: string | null
          location?: string | null
          log_backups?: string | null
          manufacturer_model?: string | null
          memory_gb?: number | null
          metal_class_of_service?: string | null
          monitoring?: string | null
          operating_system?: string | null
          rdp?: string | null
          region?: string | null
          sa?: string | null
          sap_nonsap?: string | null
          server_ip?: string | null
          server_name?: string
          server_state?: string | null
          server_type?: string | null
          service_owner?: string | null
          sql_agent_service_account?: string | null
          sql_port?: number | null
          sql_service_account?: string | null
          sql_version?: string | null
          stats_update?: string | null
          support_cycle?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          sysadmin?: string | null
          windows_patching_schedule?: string | null
        }
        Relationships: []
      }
      cmdb_ci_netgear_switch: {
        Row: {
          app_id: string | null
          application_name: string | null
          backup_status: string | null
          business_functions: string | null
          commission_ritm: string | null
          deployment_date: string | null
          environment: string | null
          eol_date: string | null
          firmware_version: string | null
          gcc_managed: string | null
          hostname: string
          iit_ot: string | null
          ip_gateway: string | null
          maintenance_schedule: string | null
          management_ip: string | null
          management_vlan: string | null
          manufacturer: string | null
          model: string | null
          monitoring: string | null
          os_lifecycle: string | null
          poe_capable: string | null
          port_count: number | null
          region: string | null
          remarks: string | null
          serial_number: string | null
          site_address: string | null
          sla: string | null
          snmp_version: string | null
          stack_member_count: number | null
          stack_name: string | null
          status: string | null
          support_cycle: string | null
          support_team: string | null
          switch_role: string | null
          sys_class_name: string
          sys_created_on: string
          sys_id: string
          sys_updated_on: string
          technical_owner: string | null
          uplink_device: string | null
          uplink_port: string | null
          vlan_count: number | null
          vm_location: string | null
        }
        Insert: {
          app_id?: string | null
          application_name?: string | null
          backup_status?: string | null
          business_functions?: string | null
          commission_ritm?: string | null
          deployment_date?: string | null
          environment?: string | null
          eol_date?: string | null
          firmware_version?: string | null
          gcc_managed?: string | null
          hostname: string
          iit_ot?: string | null
          ip_gateway?: string | null
          maintenance_schedule?: string | null
          management_ip?: string | null
          management_vlan?: string | null
          manufacturer?: string | null
          model?: string | null
          monitoring?: string | null
          os_lifecycle?: string | null
          poe_capable?: string | null
          port_count?: number | null
          region?: string | null
          remarks?: string | null
          serial_number?: string | null
          site_address?: string | null
          sla?: string | null
          snmp_version?: string | null
          stack_member_count?: number | null
          stack_name?: string | null
          status?: string | null
          support_cycle?: string | null
          support_team?: string | null
          switch_role?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          technical_owner?: string | null
          uplink_device?: string | null
          uplink_port?: string | null
          vlan_count?: number | null
          vm_location?: string | null
        }
        Update: {
          app_id?: string | null
          application_name?: string | null
          backup_status?: string | null
          business_functions?: string | null
          commission_ritm?: string | null
          deployment_date?: string | null
          environment?: string | null
          eol_date?: string | null
          firmware_version?: string | null
          gcc_managed?: string | null
          hostname?: string
          iit_ot?: string | null
          ip_gateway?: string | null
          maintenance_schedule?: string | null
          management_ip?: string | null
          management_vlan?: string | null
          manufacturer?: string | null
          model?: string | null
          monitoring?: string | null
          os_lifecycle?: string | null
          poe_capable?: string | null
          port_count?: number | null
          region?: string | null
          remarks?: string | null
          serial_number?: string | null
          site_address?: string | null
          sla?: string | null
          snmp_version?: string | null
          stack_member_count?: number | null
          stack_name?: string | null
          status?: string | null
          support_cycle?: string | null
          support_team?: string | null
          switch_role?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          technical_owner?: string | null
          uplink_device?: string | null
          uplink_port?: string | null
          vlan_count?: number | null
          vm_location?: string | null
        }
        Relationships: []
      }
      cmdb_ci_server: {
        Row: {
          app_id: string | null
          appliance: string | null
          application_details: string | null
          application_name: string | null
          azure_deployment_year: string | null
          backup_status: string | null
          business_functions: string | null
          cluster_type: string | null
          commission_ritm: string | null
          compatible_version: string | null
          cone_class: string | null
          data_disk: string | null
          database_type: string | null
          deployment_date: string | null
          environment: string | null
          eol_date: string | null
          gcc_managed: string | null
          hostname: string
          iit_ot: string | null
          ilo: string | null
          ip_address: string | null
          ldr: string | null
          maintenance_schedule: string | null
          market: string | null
          operating_system: string | null
          os_lifecycle: string | null
          os_type: string | null
          region: string | null
          remarks: string | null
          sap_nonsap: string | null
          sap_sid: string | null
          site_address: string | null
          sla: string | null
          status: string | null
          subscription: string | null
          support_cycle: string | null
          support_team: string | null
          sys_class_name: string
          sys_created_on: string
          sys_id: string
          sys_updated_on: string
          tags_updated: string | null
          technical_owner: string | null
          type: string | null
          version_lock_enabled: string | null
          virtual_hostname: string | null
          vm_location: string | null
          vm_size: string | null
        }
        Insert: {
          app_id?: string | null
          appliance?: string | null
          application_details?: string | null
          application_name?: string | null
          azure_deployment_year?: string | null
          backup_status?: string | null
          business_functions?: string | null
          cluster_type?: string | null
          commission_ritm?: string | null
          compatible_version?: string | null
          cone_class?: string | null
          data_disk?: string | null
          database_type?: string | null
          deployment_date?: string | null
          environment?: string | null
          eol_date?: string | null
          gcc_managed?: string | null
          hostname: string
          iit_ot?: string | null
          ilo?: string | null
          ip_address?: string | null
          ldr?: string | null
          maintenance_schedule?: string | null
          market?: string | null
          operating_system?: string | null
          os_lifecycle?: string | null
          os_type?: string | null
          region?: string | null
          remarks?: string | null
          sap_nonsap?: string | null
          sap_sid?: string | null
          site_address?: string | null
          sla?: string | null
          status?: string | null
          subscription?: string | null
          support_cycle?: string | null
          support_team?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          tags_updated?: string | null
          technical_owner?: string | null
          type?: string | null
          version_lock_enabled?: string | null
          virtual_hostname?: string | null
          vm_location?: string | null
          vm_size?: string | null
        }
        Update: {
          app_id?: string | null
          appliance?: string | null
          application_details?: string | null
          application_name?: string | null
          azure_deployment_year?: string | null
          backup_status?: string | null
          business_functions?: string | null
          cluster_type?: string | null
          commission_ritm?: string | null
          compatible_version?: string | null
          cone_class?: string | null
          data_disk?: string | null
          database_type?: string | null
          deployment_date?: string | null
          environment?: string | null
          eol_date?: string | null
          gcc_managed?: string | null
          hostname?: string
          iit_ot?: string | null
          ilo?: string | null
          ip_address?: string | null
          ldr?: string | null
          maintenance_schedule?: string | null
          market?: string | null
          operating_system?: string | null
          os_lifecycle?: string | null
          os_type?: string | null
          region?: string | null
          remarks?: string | null
          sap_nonsap?: string | null
          sap_sid?: string | null
          site_address?: string | null
          sla?: string | null
          status?: string | null
          subscription?: string | null
          support_cycle?: string | null
          support_team?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          tags_updated?: string | null
          technical_owner?: string | null
          type?: string | null
          version_lock_enabled?: string | null
          virtual_hostname?: string | null
          vm_location?: string | null
          vm_size?: string | null
        }
        Relationships: []
      }
      cmdb_ci_wap: {
        Row: {
          ap_name: string
          app_id: string | null
          application_name: string | null
          business_functions: string | null
          channel_width: string | null
          client_capacity: number | null
          commission_ritm: string | null
          controller_ip: string | null
          controller_name: string | null
          deployment_date: string | null
          environment: string | null
          eol_date: string | null
          firmware_version: string | null
          floor_zone: string | null
          gcc_managed: string | null
          iit_ot: string | null
          mac_address: string | null
          maintenance_schedule: string | null
          management_ip: string | null
          management_vlan: string | null
          manufacturer: string | null
          model: string | null
          monitoring: string | null
          os_lifecycle: string | null
          poe_port: string | null
          poe_switch: string | null
          radio_bands: string | null
          region: string | null
          remarks: string | null
          serial_number: string | null
          site_address: string | null
          sla: string | null
          ssid_list: string | null
          status: string | null
          support_cycle: string | null
          support_team: string | null
          sys_class_name: string
          sys_created_on: string
          sys_id: string
          sys_updated_on: string
          technical_owner: string | null
          tx_power: string | null
          vm_location: string | null
          wifi_standard: string | null
        }
        Insert: {
          ap_name: string
          app_id?: string | null
          application_name?: string | null
          business_functions?: string | null
          channel_width?: string | null
          client_capacity?: number | null
          commission_ritm?: string | null
          controller_ip?: string | null
          controller_name?: string | null
          deployment_date?: string | null
          environment?: string | null
          eol_date?: string | null
          firmware_version?: string | null
          floor_zone?: string | null
          gcc_managed?: string | null
          iit_ot?: string | null
          mac_address?: string | null
          maintenance_schedule?: string | null
          management_ip?: string | null
          management_vlan?: string | null
          manufacturer?: string | null
          model?: string | null
          monitoring?: string | null
          os_lifecycle?: string | null
          poe_port?: string | null
          poe_switch?: string | null
          radio_bands?: string | null
          region?: string | null
          remarks?: string | null
          serial_number?: string | null
          site_address?: string | null
          sla?: string | null
          ssid_list?: string | null
          status?: string | null
          support_cycle?: string | null
          support_team?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          technical_owner?: string | null
          tx_power?: string | null
          vm_location?: string | null
          wifi_standard?: string | null
        }
        Update: {
          ap_name?: string
          app_id?: string | null
          application_name?: string | null
          business_functions?: string | null
          channel_width?: string | null
          client_capacity?: number | null
          commission_ritm?: string | null
          controller_ip?: string | null
          controller_name?: string | null
          deployment_date?: string | null
          environment?: string | null
          eol_date?: string | null
          firmware_version?: string | null
          floor_zone?: string | null
          gcc_managed?: string | null
          iit_ot?: string | null
          mac_address?: string | null
          maintenance_schedule?: string | null
          management_ip?: string | null
          management_vlan?: string | null
          manufacturer?: string | null
          model?: string | null
          monitoring?: string | null
          os_lifecycle?: string | null
          poe_port?: string | null
          poe_switch?: string | null
          radio_bands?: string | null
          region?: string | null
          remarks?: string | null
          serial_number?: string | null
          site_address?: string | null
          sla?: string | null
          ssid_list?: string | null
          status?: string | null
          support_cycle?: string | null
          support_team?: string | null
          sys_class_name?: string
          sys_created_on?: string
          sys_id?: string
          sys_updated_on?: string
          technical_owner?: string | null
          tx_power?: string | null
          vm_location?: string | null
          wifi_standard?: string | null
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          due_at: string
          id: string
          notes: string | null
          received_at: string
          request_type: string
          status: string
          subject_identifier: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_at?: string
          id?: string
          notes?: string | null
          received_at?: string
          request_type: string
          status?: string
          subject_identifier: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_at?: string
          id?: string
          notes?: string | null
          received_at?: string
          request_type?: string
          status?: string
          subject_identifier?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_data_register: {
        Row: {
          created_at: string
          data_category: string
          field_name: string
          id: string
          lawful_basis: string
          purpose: string
          retention_period: string
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_category: string
          field_name: string
          id?: string
          lawful_basis: string
          purpose: string
          retention_period: string
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_category?: string
          field_name?: string
          id?: string
          lawful_basis?: string
          purpose?: string
          retention_period?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
    Enums: {
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
