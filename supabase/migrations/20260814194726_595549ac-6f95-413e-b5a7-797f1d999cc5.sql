CREATE TABLE public.cmdb_ci_netgear_switch (
  sys_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sys_class_name text NOT NULL DEFAULT 'cmdb_ci_netgear_switch',
  sys_created_on timestamptz NOT NULL DEFAULT now(),
  sys_updated_on timestamptz NOT NULL DEFAULT now(),
  hostname text NOT NULL,
  management_ip text,
  region text,
  site_address text,
  vm_location text,
  environment text,
  status text,
  switch_role text,
  manufacturer text,
  model text,
  serial_number text,
  firmware_version text,
  port_count integer,
  poe_capable text,
  uplink_device text,
  uplink_port text,
  stack_name text,
  stack_member_count integer,
  management_vlan text,
  vlan_count integer,
  ip_gateway text,
  snmp_version text,
  gcc_managed text,
  technical_owner text,
  support_team text,
  sla text,
  app_id text,
  application_name text,
  business_functions text,
  iit_ot text,
  os_lifecycle text,
  support_cycle text,
  eol_date text,
  deployment_date text,
  maintenance_schedule text,
  backup_status text,
  monitoring text,
  commission_ritm text,
  remarks text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmdb_ci_netgear_switch TO authenticated;
GRANT ALL ON public.cmdb_ci_netgear_switch TO service_role;

ALTER TABLE public.cmdb_ci_netgear_switch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read switches" ON public.cmdb_ci_netgear_switch FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors insert switches" ON public.cmdb_ci_netgear_switch FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Editors update switches" ON public.cmdb_ci_netgear_switch FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Admins delete switches" ON public.cmdb_ci_netgear_switch FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_switch_updated BEFORE UPDATE ON public.cmdb_ci_netgear_switch FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();
CREATE TRIGGER audit_switch AFTER INSERT OR UPDATE OR DELETE ON public.cmdb_ci_netgear_switch FOR EACH ROW EXECUTE FUNCTION public.log_cmdb_change();

CREATE INDEX idx_switch_hostname ON public.cmdb_ci_netgear_switch (hostname);
CREATE INDEX idx_switch_region ON public.cmdb_ci_netgear_switch (region);

CREATE TABLE public.cmdb_ci_wap (
  sys_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sys_class_name text NOT NULL DEFAULT 'cmdb_ci_wap',
  sys_created_on timestamptz NOT NULL DEFAULT now(),
  sys_updated_on timestamptz NOT NULL DEFAULT now(),
  ap_name text NOT NULL,
  management_ip text,
  mac_address text,
  region text,
  site_address text,
  vm_location text,
  floor_zone text,
  environment text,
  status text,
  manufacturer text,
  model text,
  serial_number text,
  firmware_version text,
  controller_name text,
  controller_ip text,
  ssid_list text,
  radio_bands text,
  wifi_standard text,
  channel_width text,
  tx_power text,
  client_capacity integer,
  poe_switch text,
  poe_port text,
  management_vlan text,
  gcc_managed text,
  technical_owner text,
  support_team text,
  sla text,
  app_id text,
  application_name text,
  business_functions text,
  iit_ot text,
  os_lifecycle text,
  support_cycle text,
  eol_date text,
  deployment_date text,
  maintenance_schedule text,
  monitoring text,
  commission_ritm text,
  remarks text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cmdb_ci_wap TO authenticated;
GRANT ALL ON public.cmdb_ci_wap TO service_role;

ALTER TABLE public.cmdb_ci_wap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read access points" ON public.cmdb_ci_wap FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors insert access points" ON public.cmdb_ci_wap FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Editors update access points" ON public.cmdb_ci_wap FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Admins delete access points" ON public.cmdb_ci_wap FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_wap_updated BEFORE UPDATE ON public.cmdb_ci_wap FOR EACH ROW EXECUTE FUNCTION public.set_sys_updated_on();
CREATE TRIGGER audit_wap AFTER INSERT OR UPDATE OR DELETE ON public.cmdb_ci_wap FOR EACH ROW EXECUTE FUNCTION public.log_cmdb_change();

CREATE INDEX idx_wap_name ON public.cmdb_ci_wap (ap_name);
CREATE INDEX idx_wap_region ON public.cmdb_ci_wap (region);

INSERT INTO public.cmdb_ci_netgear_switch (hostname, management_ip, region, site_address, vm_location, environment, status, switch_role, manufacturer, model, serial_number, firmware_version, port_count, poe_capable, uplink_device, uplink_port, stack_name, stack_member_count, management_vlan, vlan_count, ip_gateway, snmp_version, gcc_managed, technical_owner, support_team, sla, app_id, application_name, business_functions, iit_ot, os_lifecycle, support_cycle, eol_date, deployment_date, maintenance_schedule, backup_status, monitoring, commission_ritm, remarks) VALUES
('CPH-SW-CORE-01','10.10.0.11','EMEA','Ny Carlsberg Vej 100, Copenhagen','DC-1 Rack A3','Production','Operational','Core','Cisco','Catalyst 9500-48Y4C','FDO24120ABC','17.09.04a',48,'No','CPH-RTR-01','Te1/0/1','CPH-CORE-STACK',2,'VLAN 900',64,'10.10.0.1','v3','Yes','Mads Sørensen','Network Operations','Gold','APP-0451','Site Core Network','Brewery Operations','IIT','Supported','LDoS 2029','2029-10-31','2022-03-14','Sun 02:00-04:00 CET','Backed up','SolarWinds','RITM0034512','Redundant core pair'),
('CPH-SW-ACC-04','10.10.4.24','EMEA','Ny Carlsberg Vej 100, Copenhagen','Brewhouse Floor 2','Production','Operational','Access','Aruba','CX 6300M 48G PoE','SG2245ACC4','10.11.1021',48,'Yes','CPH-SW-CORE-01','1/1/49','CPH-ACC-STACK-B',3,'VLAN 900',18,'10.10.4.1','v3','Yes','Mads Sørensen','Network Operations','Silver','APP-0452','Plant Access Layer','Production Line','OT','Supported','Supported','2031-01-31','2023-06-02','Sat 01:00-03:00 CET','Backed up','SolarWinds','RITM0041209','Feeds OT line sensors'),
('FRA-SW-DIST-02','10.24.2.12','EMEA','Industriestrasse 8, Frankfurt','DC-2 Rack C1','Production','Operational','Distribution','Cisco','Catalyst 9300-48P','FCW2310DIST','17.06.05',48,'Yes','FRA-SW-CORE-01','Gi1/0/48',NULL,1,'VLAN 910',24,'10.24.2.1','v3','Yes','Lena Brandt','Network Operations','Gold','APP-0460','Distribution Layer','Logistics','IIT','Supported','Supported','2030-04-30','2021-11-19','Sun 03:00-05:00 CET','Backed up','SolarWinds','RITM0029884',NULL),
('WAW-SW-ACC-09','10.31.9.19','EMEA','ul. Browarna 12, Warsaw','Warehouse','Production','Degraded','Access','Netgear','M4300-52G-PoE+','5GT2299WAW','12.0.15.9',52,'Yes','WAW-SW-DIST-01','1/0/51',NULL,1,'VLAN 920',12,'10.31.9.1','v3','No','Piotr Kowalski','Site IT','Bronze','APP-0466','Warehouse Network','Logistics','OT','Extended','Extended support','2027-06-30','2019-08-07','Wed 22:00-23:30 CET','Backed up','PRTG','RITM0018233','Scheduled for refresh 2026'),
('SIN-SW-ACC-02','10.44.2.22','APAC','12 Tuas Ave, Singapore','Packaging Hall','Production','Operational','Access','Aruba','CX 6200F 24G PoE','SG2301SIN2','10.10.1010',24,'Yes','SIN-SW-CORE-01','1/1/25',NULL,1,'VLAN 930',9,'10.44.2.1','v3','Yes','Wei Lim','Network Operations','Silver','APP-0471','Packaging Network','Packaging','OT','Supported','Supported','2032-03-31','2024-02-21','Sun 00:00-02:00 SGT','Backed up','SolarWinds','RITM0052771',NULL),
('CPH-SW-LAB-01','10.12.1.5','EMEA','Ny Carlsberg Vej 100, Copenhagen','Innovation Lab','Test','Operational','Access','Netgear','M4250-40G8XF-PoE++','5GT2410LAB','13.0.4.2',40,'Yes','CPH-SW-CORE-01','1/0/40',NULL,1,'VLAN 990',6,'10.12.1.1','v3','No','Anne Holm','Site IT','Bronze','APP-0480','Lab Network','R&D','IIT','Supported','Supported','2033-01-31','2025-01-15','On demand','Not backed up','PRTG','RITM0061004','Non-production lab gear');

INSERT INTO public.cmdb_ci_wap (ap_name, management_ip, mac_address, region, site_address, vm_location, floor_zone, environment, status, manufacturer, model, serial_number, firmware_version, controller_name, controller_ip, ssid_list, radio_bands, wifi_standard, channel_width, tx_power, client_capacity, poe_switch, poe_port, management_vlan, gcc_managed, technical_owner, support_team, sla, app_id, application_name, business_functions, iit_ot, os_lifecycle, support_cycle, eol_date, deployment_date, maintenance_schedule, monitoring, commission_ritm, remarks) VALUES
('CPH-AP-BREW-101','10.10.40.101','a4:53:0e:11:22:33','EMEA','Ny Carlsberg Vej 100, Copenhagen','Brewhouse','Floor 1 / Zone A','Production','Operational','Aruba','AP-635','AR2312AP101','8.11.2.1','CPH-WLC-01','10.10.40.10','NB-CORP; NB-GUEST; NB-OT','2.4/5/6 GHz','Wi-Fi 6E','80 MHz','Auto (14 dBm)',120,'CPH-SW-ACC-04','1/1/12','VLAN 940','Yes','Mads Sørensen','Network Operations','Gold','APP-0491','Brewery Wireless','Brewery Operations','OT','Supported','Supported','2032-06-30','2023-06-10','Sat 01:00-03:00 CET','Aruba Central','RITM0041300',NULL),
('CPH-AP-OFF-204','10.10.41.204','a4:53:0e:44:55:66','EMEA','Ny Carlsberg Vej 100, Copenhagen','HQ Office','Floor 2 / Open plan','Production','Operational','Aruba','AP-535','AR2211AP204','8.11.2.1','CPH-WLC-01','10.10.40.10','NB-CORP; NB-GUEST','2.4/5 GHz','Wi-Fi 6','40 MHz','Auto (11 dBm)',90,'CPH-SW-ACC-07','1/1/20','VLAN 940','Yes','Anne Holm','Site IT','Silver','APP-0492','Office Wireless','Corporate Services','IIT','Supported','Supported','2030-12-31','2022-09-05','Sun 02:00-04:00 CET','Aruba Central','RITM0032118',NULL),
('FRA-AP-WHS-012','10.24.40.12','3c:2c:99:ab:cd:ef','EMEA','Industriestrasse 8, Frankfurt','Warehouse','Ground / Dock 3','Production','Degraded','Cisco','Catalyst 9120AXI','FGL2320AP12','17.09.04','FRA-WLC-01','10.24.40.5','NB-CORP; NB-SCAN','2.4/5 GHz','Wi-Fi 6','20 MHz','Fixed (17 dBm)',60,'FRA-SW-DIST-02','Gi1/0/14','VLAN 950','Yes','Lena Brandt','Network Operations','Gold','APP-0495','Warehouse Wireless','Logistics','OT','Supported','Supported','2031-05-31','2021-12-01','Sun 03:00-05:00 CET','Cisco DNA Center','RITM0030044','Intermittent client drops under investigation'),
('WAW-AP-PRD-007','10.31.40.7','3c:2c:99:12:34:56','EMEA','ul. Browarna 12, Warsaw','Packaging Hall','Ground / Line 2','Production','Operational','Cisco','Catalyst 9115AXI','FGL2119AP07','17.06.05','WAW-WLC-01','10.31.40.2','NB-OT; NB-SCAN','2.4/5 GHz','Wi-Fi 6','20 MHz','Fixed (20 dBm)',50,'WAW-SW-ACC-09','1/0/18','VLAN 950','No','Piotr Kowalski','Site IT','Bronze','APP-0497','Line Wireless','Packaging','OT','Extended','Extended support','2027-12-31','2019-10-22','Wed 22:00-23:30 CET','PRTG','RITM0018890','Refresh planned with switch swap'),
('SIN-AP-OFF-031','10.44.40.31','a4:53:0e:77:88:99','APAC','12 Tuas Ave, Singapore','Site Office','Floor 1 / Meeting rooms','Production','Operational','Aruba','AP-615','AR2402AP031','8.12.0.0','SIN-WLC-01','10.44.40.4','NB-CORP; NB-GUEST','5/6 GHz','Wi-Fi 6E','80 MHz','Auto (12 dBm)',80,'SIN-SW-ACC-02','1/1/8','VLAN 960','Yes','Wei Lim','Network Operations','Silver','APP-0498','Office Wireless','Corporate Services','IIT','Supported','Supported','2033-02-28','2024-03-04','Sun 00:00-02:00 SGT','Aruba Central','RITM0052905',NULL),
('CPH-AP-LAB-002','10.12.40.2','a4:53:0e:aa:bb:cc','EMEA','Ny Carlsberg Vej 100, Copenhagen','Innovation Lab','Floor 1 / Lab B','Test','Maintenance','Netgear','WAX630E','5GT2405AP02','11.0.2.6',NULL,NULL,'NB-LAB','2.4/5/6 GHz','Wi-Fi 6E','160 MHz','Manual (10 dBm)',40,'CPH-SW-LAB-01','1/0/9','VLAN 990','No','Anne Holm','Site IT','Bronze','APP-0499','Lab Wireless','R&D','IIT','Supported','Supported','2032-09-30','2025-02-11','On demand','PRTG','RITM0061120','Standalone AP, no controller');