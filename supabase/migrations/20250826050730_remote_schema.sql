create schema if not exists "audit";

create sequence "audit"."access_log_id_seq";

create sequence "audit"."event_log_id_seq";


  create table "audit"."access_log" (
    "id" bigint not null default nextval('audit.access_log_id_seq'::regclass),
    "occurred_at_utc" timestamp with time zone default now(),
    "action" text not null,
    "method" text,
    "resource" text,
    "result" text not null,
    "request_id" text not null,
    "src_ip" inet,
    "user_agent" text,
    "latency_ms" integer,
    "meta" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "audit"."access_log" enable row level security;


  create table "audit"."event_log" (
    "id" bigint not null default nextval('audit.event_log_id_seq'::regclass),
    "occurred_at_utc" timestamp with time zone default now(),
    "action" text not null,
    "resource" text not null,
    "resource_id" text,
    "actor_id" text,
    "actor_role" text not null,
    "result" text not null,
    "reason" text,
    "correlation_id" text not null,
    "meta" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "audit"."event_log" enable row level security;

alter sequence "audit"."access_log_id_seq" owned by "audit"."access_log"."id";

alter sequence "audit"."event_log_id_seq" owned by "audit"."event_log"."id";

CREATE UNIQUE INDEX access_log_pkey ON audit.access_log USING btree (id);

CREATE UNIQUE INDEX event_log_pkey ON audit.event_log USING btree (id);

CREATE INDEX idx_access_log_occurred_at ON audit.access_log USING btree (occurred_at_utc);

CREATE INDEX idx_access_log_request_id ON audit.access_log USING btree (request_id);

CREATE INDEX idx_event_log_action ON audit.event_log USING btree (action);

CREATE INDEX idx_event_log_correlation_id ON audit.event_log USING btree (correlation_id);

CREATE INDEX idx_event_log_occurred_at ON audit.event_log USING btree (occurred_at_utc);

alter table "audit"."access_log" add constraint "access_log_pkey" PRIMARY KEY using index "access_log_pkey";

alter table "audit"."event_log" add constraint "event_log_pkey" PRIMARY KEY using index "event_log_pkey";

alter table "audit"."event_log" add constraint "event_log_actor_role_check" CHECK ((actor_role = ANY (ARRAY['user'::text, 'admin'::text, 'system'::text]))) not valid;

alter table "audit"."event_log" validate constraint "event_log_actor_role_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION audit.log_access(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO audit.access_log (
        action,
        method,
        resource,
        result,
        request_id,
        src_ip,
        user_agent,
        latency_ms,
        meta
    ) VALUES (
        p->>'action',
        p->>'method',
        p->>'resource',
        p->>'result',
        p->>'request_id',
        (p->>'src_ip')::INET,
        p->>'user_agent',
        (p->>'latency_ms')::INTEGER,
        p->'meta'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION audit.log_event(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO audit.event_log (
        action,
        resource,
        resource_id,
        actor_id,
        actor_role,
        result,
        reason,
        correlation_id,
        meta
    ) VALUES (
        p->>'action',
        p->>'resource',
        p->>'resource_id',
        p->>'actor_id',
        p->>'actor_role',
        p->>'result',
        p->>'reason',
        p->>'correlation_id',
        p->'meta'
    );
END;
$function$
;

grant delete on table "audit"."access_log" to "authenticated";

grant insert on table "audit"."access_log" to "authenticated";

grant references on table "audit"."access_log" to "authenticated";

grant select on table "audit"."access_log" to "authenticated";

grant trigger on table "audit"."access_log" to "authenticated";

grant truncate on table "audit"."access_log" to "authenticated";

grant update on table "audit"."access_log" to "authenticated";

grant delete on table "audit"."access_log" to "service_role";

grant insert on table "audit"."access_log" to "service_role";

grant references on table "audit"."access_log" to "service_role";

grant select on table "audit"."access_log" to "service_role";

grant trigger on table "audit"."access_log" to "service_role";

grant truncate on table "audit"."access_log" to "service_role";

grant update on table "audit"."access_log" to "service_role";

grant delete on table "audit"."event_log" to "authenticated";

grant insert on table "audit"."event_log" to "authenticated";

grant references on table "audit"."event_log" to "authenticated";

grant select on table "audit"."event_log" to "authenticated";

grant trigger on table "audit"."event_log" to "authenticated";

grant truncate on table "audit"."event_log" to "authenticated";

grant update on table "audit"."event_log" to "authenticated";

grant delete on table "audit"."event_log" to "service_role";

grant insert on table "audit"."event_log" to "service_role";

grant references on table "audit"."event_log" to "service_role";

grant select on table "audit"."event_log" to "service_role";

grant trigger on table "audit"."event_log" to "service_role";

grant truncate on table "audit"."event_log" to "service_role";

grant update on table "audit"."event_log" to "service_role";


  create policy "Authenticated users can access all audit logs"
  on "audit"."access_log"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Service role can access all audit logs"
  on "audit"."access_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Authenticated users can access all audit logs"
  on "audit"."event_log"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Service role can access all audit logs"
  on "audit"."event_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);


drop extension if exists "pg_net";

create schema if not exists "ops";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION ops.now_utc()
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
AS $function$
  select (now() at time zone 'utc')::timestamptz;
$function$
;

CREATE OR REPLACE FUNCTION ops.purge_old_logs(retention_days integer DEFAULT 90)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'audit', 'public'
AS $function$
begin
  execute format($i$ delete from audit.access_log where occurred_at_utc < (now() at time zone 'utc') - interval '%s days' $i$, retention_days);
  execute format($i$ delete from audit.event_log  where occurred_at_utc < (now() at time zone 'utc') - interval '%s days' $i$, retention_days);
end $function$
;

drop policy "Admin users can insert event settings" on "public"."event_settings";

drop policy "Admin users can update event settings" on "public"."event_settings";

drop policy "Admin users can view event settings" on "public"."event_settings";

drop policy "Admin users can update registrations" on "public"."registrations";

drop policy "Admin users can view all registrations" on "public"."registrations";

drop view if exists "public"."admin_registrations_view";

drop index if exists "public"."idx_email_outbox_status_scheduled";

drop index if exists "public"."idx_email_outbox_status_sent_at";


  create table "public"."registrations_backup_yyyymmdd" (
    "id" uuid,
    "registration_id" character varying(50),
    "status" character varying(20),
    "title" character varying(10),
    "first_name" character varying(50),
    "last_name" character varying(50),
    "nickname" character varying(30),
    "phone" character varying(15),
    "line_id" character varying(30),
    "email" character varying(255),
    "company_name" character varying(100),
    "business_type" character varying(50),
    "business_type_other" character varying(50),
    "yec_province" character varying(50),
    "hotel_choice" character varying(20),
    "room_type" character varying(20),
    "roommate_info" character varying(100),
    "roommate_phone" character varying(15),
    "external_hotel_name" character varying(100),
    "travel_type" character varying(20),
    "profile_image_url" text,
    "chamber_card_url" text,
    "payment_slip_url" text,
    "badge_url" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email_sent" boolean,
    "email_sent_at" timestamp with time zone,
    "ip_address" inet,
    "user_agent" text,
    "form_data" jsonb
      );


alter table "public"."admin_audit_logs" drop column "details";

alter table "public"."admin_audit_logs" drop column "ip_address";

alter table "public"."admin_audit_logs" drop column "user_agent";

alter table "public"."admin_audit_logs" add column "after" jsonb;

alter table "public"."admin_audit_logs" add column "before" jsonb;

alter table "public"."admin_users" alter column "created_at" drop not null;

alter table "public"."admin_users" alter column "id" drop default;

alter table "public"."admin_users" alter column "updated_at" drop not null;

alter table "public"."email_outbox" alter column "payload" drop default;

-- Ensure the enum label exists (safe even if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'email_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE email_status ADD VALUE 'pending';
  END IF;
END$$;

-- Drop any existing default to avoid type mismatch, then set the correct one
ALTER TABLE public.email_outbox
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.email_outbox
  ALTER COLUMN status SET DEFAULT 'pending'::email_status;

-- Optional: validate that the default expression is bound to the enum type
DO $$
DECLARE def_expr text;
BEGIN
  SELECT pg_get_expr(d.adbin, d.adrelid) INTO def_expr
  FROM pg_attrdef d
  JOIN pg_class c ON c.oid = d.adrelid
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
  WHERE c.relname = 'email_outbox' AND a.attname = 'status';

  IF def_expr NOT LIKE '%::email_status%' THEN
    RAISE EXCEPTION 'email_outbox.status default must be email_status, got: %', def_expr;
  END IF;
END$$;

alter table "public"."registrations" drop column "full_name";

alter table "public"."registrations" drop column "registration_date";

alter table "public"."registrations" drop column "review_notes";

alter table "public"."registrations" add column "badge_url" text;

alter table "public"."registrations" add column "business_type_other" character varying(50);

alter table "public"."registrations" add column "chamber_card_url" text;

alter table "public"."registrations" add column "email_sent" boolean default false;

alter table "public"."registrations" add column "email_sent_at" timestamp with time zone;

alter table "public"."registrations" add column "external_hotel_name" character varying(100);

alter table "public"."registrations" add column "hotel_choice" character varying(20) not null;

alter table "public"."registrations" add column "ip_address" inet;

alter table "public"."registrations" add column "line_id" character varying(30) not null;

alter table "public"."registrations" add column "nickname" character varying(30) not null;

alter table "public"."registrations" add column "payment_slip_url" text;

alter table "public"."registrations" add column "profile_image_url" text;

alter table "public"."registrations" add column "room_type" character varying(20);

alter table "public"."registrations" add column "roommate_info" character varying(100);

alter table "public"."registrations" add column "roommate_phone" character varying(15);

alter table "public"."registrations" add column "travel_type" character varying(20) not null;

alter table "public"."registrations" add column "user_agent" text;

alter table "public"."registrations" alter column "business_type" set not null;

alter table "public"."registrations" alter column "business_type" set data type character varying(50) using "business_type"::character varying(50);

alter table "public"."registrations" alter column "company_name" set not null;

alter table "public"."registrations" alter column "company_name" set data type character varying(100) using "company_name"::character varying(100);

alter table "public"."registrations" alter column "created_at" drop not null;

alter table "public"."registrations" alter column "email" set data type character varying(255) using "email"::character varying(255);

alter table "public"."registrations" alter column "first_name" set not null;

alter table "public"."registrations" alter column "first_name" set data type character varying(50) using "first_name"::character varying(50);

alter table "public"."registrations" alter column "form_data" drop default;

alter table "public"."registrations" alter column "last_name" set not null;

alter table "public"."registrations" alter column "last_name" set data type character varying(50) using "last_name"::character varying(50);

alter table "public"."registrations" alter column "payment_review_status" drop default;

alter table "public"."registrations" alter column "phone" set not null;

alter table "public"."registrations" alter column "phone" set data type character varying(15) using "phone"::character varying(15);

alter table "public"."registrations" alter column "profile_review_status" drop default;

alter table "public"."registrations" alter column "registration_id" set data type character varying(50) using "registration_id"::character varying(50);

alter table "public"."registrations" alter column "status" drop default;

alter table "public"."registrations" alter column "status" drop not null;

alter table "public"."registrations" alter column "tcc_review_status" drop default;

alter table "public"."registrations" alter column "title" set not null;

alter table "public"."registrations" alter column "title" set data type character varying(10) using "title"::character varying(10);

alter table "public"."registrations" alter column "updated_at" drop not null;

alter table "public"."registrations" alter column "yec_province" set data type character varying(50) using "yec_province"::character varying(50);

CREATE INDEX idx_audit_admin_email ON public.admin_audit_logs USING btree (admin_email);

CREATE INDEX idx_audit_created_at ON public.admin_audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_registration_id ON public.admin_audit_logs USING btree (registration_id);

CREATE UNIQUE INDEX ux_event_settings_singleton ON public.event_settings USING btree ((true));

CREATE INDEX idx_email_outbox_status_scheduled ON public.email_outbox USING btree (status, scheduled_at);

CREATE INDEX idx_email_outbox_status_sent_at ON public.email_outbox USING btree (status, sent_at);

alter table "public"."admin_users" add constraint "admin_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_users" validate constraint "admin_users_id_fkey";

alter table "public"."registrations" add constraint "chk_review_statuses" CHECK (((payment_review_status = ANY (ARRAY['pending'::text, 'needs_update'::text, 'passed'::text, 'rejected'::text])) AND (profile_review_status = ANY (ARRAY['pending'::text, 'needs_update'::text, 'passed'::text, 'rejected'::text])) AND (tcc_review_status = ANY (ARRAY['pending'::text, 'needs_update'::text, 'passed'::text, 'rejected'::text])))) not valid;

alter table "public"."registrations" validate constraint "chk_review_statuses";

alter table "public"."registrations" add constraint "chk_status" CHECK ((status = ANY (ARRAY['waiting_for_review'::text, 'waiting_for_update_payment'::text, 'waiting_for_update_info'::text, 'waiting_for_update_tcc'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."registrations" validate constraint "chk_status";

alter table "public"."registrations" add constraint "chk_update_reason" CHECK (((update_reason IS NULL) OR (update_reason = ANY (ARRAY['payment'::text, 'info'::text, 'tcc'::text])))) not valid;

alter table "public"."registrations" validate constraint "chk_update_reason";

alter table "public"."registrations" add constraint "external_hotel_required_when_out_quota" CHECK (((((hotel_choice)::text = 'out-of-quota'::text) AND (external_hotel_name IS NOT NULL)) OR (((hotel_choice)::text = 'in-quota'::text) AND (external_hotel_name IS NULL)))) not valid;

alter table "public"."registrations" validate constraint "external_hotel_required_when_out_quota";

alter table "public"."registrations" add constraint "registrations_email_check" CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)) not valid;

alter table "public"."registrations" validate constraint "registrations_email_check";

alter table "public"."registrations" add constraint "registrations_hotel_choice_check" CHECK (((hotel_choice)::text = ANY (ARRAY[('in-quota'::character varying)::text, ('out-of-quota'::character varying)::text]))) not valid;

alter table "public"."registrations" validate constraint "registrations_hotel_choice_check";

alter table "public"."registrations" add constraint "registrations_line_id_check" CHECK (((line_id)::text ~ '^[a-zA-Z0-9._-]+$'::text)) not valid;

alter table "public"."registrations" validate constraint "registrations_line_id_check";

alter table "public"."registrations" add constraint "registrations_phone_check" CHECK ((((phone)::text ~ '^0[0-9]{9}$'::text) OR ((phone)::text ~ '^\\+66[0-9]{8}$'::text))) not valid;

alter table "public"."registrations" validate constraint "registrations_phone_check";

alter table "public"."registrations" add constraint "registrations_travel_type_check" CHECK (((travel_type)::text = ANY (ARRAY[('private-car'::character varying)::text, ('van'::character varying)::text]))) not valid;

alter table "public"."registrations" validate constraint "registrations_travel_type_check";

alter table "public"."registrations" add constraint "room_type_required_when_in_quota" CHECK (((((hotel_choice)::text = 'in-quota'::text) AND (room_type IS NOT NULL)) OR (((hotel_choice)::text = 'out-of-quota'::text) AND (room_type IS NULL)))) not valid;

alter table "public"."registrations" validate constraint "room_type_required_when_in_quota";

alter table "public"."registrations" add constraint "roommate_info_required_for_double" CHECK (((((room_type)::text = 'double'::text) AND (roommate_info IS NOT NULL) AND (roommate_phone IS NOT NULL)) OR ((room_type)::text <> 'double'::text))) not valid;

alter table "public"."registrations" validate constraint "roommate_info_required_for_double";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.query_access_logs_by_request_id(request_id_param text, cutoff_time_param timestamp with time zone)
 RETURNS TABLE(id bigint, occurred_at_utc timestamp with time zone, action text, resource text, result text, request_id text, meta jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.occurred_at_utc,
    al.action,
    al.resource,
    al.result,
    al.request_id,
    al.meta
  FROM audit.access_log al
  WHERE al.request_id = request_id_param
    AND al.occurred_at_utc >= cutoff_time_param
  ORDER BY al.occurred_at_utc ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.query_event_logs_by_correlation_id(correlation_id_param text, cutoff_time_param timestamp with time zone)
 RETURNS TABLE(id bigint, occurred_at_utc timestamp with time zone, action text, resource text, resource_id text, actor_role text, result text, reason text, correlation_id text, meta jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.occurred_at_utc,
    el.action,
    el.resource,
    el.resource_id,
    el.actor_role,
    el.result,
    el.reason,
    el.correlation_id,
    el.meta
  FROM audit.event_log el
  WHERE el.correlation_id = correlation_id_param
    AND el.occurred_at_utc >= cutoff_time_param
  ORDER BY el.occurred_at_utc ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.query_recent_access_logs(cutoff_time_param timestamp with time zone)
 RETURNS TABLE(id bigint, occurred_at_utc timestamp with time zone, action text, resource text, result text, request_id text, meta jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.occurred_at_utc,
    al.action,
    al.resource,
    al.result,
    al.request_id,
    al.meta
  FROM audit.access_log al
  WHERE al.occurred_at_utc >= cutoff_time_param
  ORDER BY al.occurred_at_utc DESC
  LIMIT 20;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.query_recent_event_logs(cutoff_time_param timestamp with time zone)
 RETURNS TABLE(id bigint, occurred_at_utc timestamp with time zone, action text, resource text, resource_id text, actor_role text, result text, reason text, correlation_id text, meta jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.occurred_at_utc,
    el.action,
    el.resource,
    el.resource_id,
    el.actor_role,
    el.result,
    el.reason,
    el.correlation_id,
    el.meta
  FROM audit.event_log el
  WHERE el.occurred_at_utc >= cutoff_time_param
  ORDER BY el.occurred_at_utc DESC
  LIMIT 20;
END;
$function$
;

create or replace view "public"."admin_registrations_view" as  SELECT id,
    registration_id,
    title,
    first_name,
    last_name,
    email,
    company_name,
    yec_province,
    status,
    update_reason,
    payment_review_status,
    profile_review_status,
    tcc_review_status,
    price_applied,
    currency,
    selected_package_code,
    created_at,
    updated_at
   FROM registrations
  ORDER BY created_at DESC;


grant delete on table "public"."registrations_backup_yyyymmdd" to "anon";

grant insert on table "public"."registrations_backup_yyyymmdd" to "anon";

grant references on table "public"."registrations_backup_yyyymmdd" to "anon";

grant select on table "public"."registrations_backup_yyyymmdd" to "anon";

grant trigger on table "public"."registrations_backup_yyyymmdd" to "anon";

grant truncate on table "public"."registrations_backup_yyyymmdd" to "anon";

grant update on table "public"."registrations_backup_yyyymmdd" to "anon";

grant delete on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant insert on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant references on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant select on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant trigger on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant truncate on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant update on table "public"."registrations_backup_yyyymmdd" to "authenticated";

grant delete on table "public"."registrations_backup_yyyymmdd" to "service_role";

grant insert on table "public"."registrations_backup_yyyymmdd" to "service_role";

grant references on table "public"."registrations_backup_yyyymmdd" to "service_role";

grant select on table "public"."registrations_backup_yyyymmdd" to "service_role";

grant trigger on table "public"."registrations_backup_yyyymmdd" to "service_role";

grant truncate on table "public"."registrations_backup_yyyymmdd" to "service_role";

grant update on table "public"."registrations_backup_yyyymmdd" to "service_role";


  create policy "Super admins can delete admin users"
  on "public"."admin_users"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))));



  create policy "Super admins can insert admin users"
  on "public"."admin_users"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))));



  create policy "Super admins can update admin users"
  on "public"."admin_users"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))))
with check ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))));



  create policy "Super admins can view all admin users"
  on "public"."admin_users"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))));



  create policy "Users can view own admin record"
  on "public"."admin_users"
  as permissive
  for select
  to public
using (((id = auth.uid()) AND (is_active = true)));



  create policy "Allow Admin Read"
  on "public"."registrations"
  as permissive
  for select
  to public
using ((auth.role() = 'admin'::text));



  create policy "Allow Public Insert"
  on "public"."registrations"
  as permissive
  for insert
  to public
with check (true);



  create policy "Admin users can insert event settings"
  on "public"."event_settings"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)))));



  create policy "Admin users can update event settings"
  on "public"."event_settings"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)))));



  create policy "Admin users can view event settings"
  on "public"."event_settings"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)))));



  create policy "Admin users can update registrations"
  on "public"."registrations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)))));



  create policy "Admin users can view all registrations"
  on "public"."registrations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)))));


CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


