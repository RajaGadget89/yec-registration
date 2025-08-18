create extension if not exists "pg_trgm" with schema "public";


  create table if not exists "public"."admin_audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "admin_email" text not null,
    "action" text not null,
    "registration_id" text not null,
    "before" jsonb,
    "after" jsonb
      );



  create table if not exists "public"."admin_users" (
    "id" uuid not null,
    "email" text not null,
    "role" text not null default 'admin'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "last_login_at" timestamp with time zone,
    "is_active" boolean default true
      );


alter table "public"."admin_users" enable row level security;


  create table if not exists "public"."email_outbox" (
    "id" uuid not null default gen_random_uuid(),
    "template" text not null,
    "to_email" text not null,
    "payload" jsonb not null,
    "status" text not null default 'pending'::text,
    "last_error" text,

    "scheduled_at" timestamp with time zone not null default now(),
    "last_attempt_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."email_outbox" enable row level security;


  create table if not exists "public"."event_settings" (
    "id" uuid not null default gen_random_uuid(),
    "registration_deadline_utc" timestamp with time zone not null,
    "early_bird_deadline_utc" timestamp with time zone not null,
    "price_packages" jsonb not null,
    "eligibility_rules" jsonb,
    "timezone" text not null default 'Asia/Bangkok'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."event_settings" enable row level security;


  create table if not exists "public"."registrations" (
    "id" uuid not null default gen_random_uuid(),
    "registration_id" character varying(50) not null,
    "title" character varying(10) not null,
    "first_name" character varying(50) not null,
    "last_name" character varying(50) not null,
    "nickname" character varying(30) not null,
    "phone" character varying(15) not null,
    "line_id" character varying(30) not null,
    "email" character varying(255) not null,
    "company_name" character varying(100) not null,
    "business_type" character varying(50) not null,
    "business_type_other" character varying(50),
    "yec_province" character varying(50) not null,
    "hotel_choice" character varying(20) not null,
    "room_type" character varying(20),
    "roommate_info" character varying(100),
    "roommate_phone" character varying(15),
    "external_hotel_name" character varying(100),
    "travel_type" character varying(20) not null,
    "profile_image_url" text,
    "chamber_card_url" text,
    "payment_slip_url" text,
    "badge_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "email_sent" boolean default false,
    "email_sent_at" timestamp with time zone,
    "ip_address" inet,
    "user_agent" text,
    "form_data" jsonb,
    "status" text,
    "update_reason" text,
    "rejected_reason" text,
    "payment_review_status" text not null,
    "profile_review_status" text not null,
    "tcc_review_status" text not null,
    "price_applied" numeric(12,2),
    "currency" text default 'THB'::text,
    "selected_package_code" text,
    "status_new" text
      );


alter table "public"."registrations" enable row level security;


  create table if not exists "public"."registrations_backup_yyyymmdd" (
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


CREATE UNIQUE INDEX IF NOT EXISTS admin_audit_logs_pkey ON public.admin_audit_logs USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_key ON public.admin_users USING btree (email);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_pkey ON public.admin_users USING btree (id);





CREATE UNIQUE INDEX IF NOT EXISTS event_settings_pkey ON public.event_settings USING btree (id);

CREATE INDEX IF NOT EXISTS idx_audit_admin_email ON public.admin_audit_logs USING btree (admin_email);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.admin_audit_logs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_registration_id ON public.admin_audit_logs USING btree (registration_id);



CREATE INDEX IF NOT EXISTS idx_registrations_business_type ON public.registrations USING btree (business_type);

CREATE INDEX IF NOT EXISTS idx_registrations_company_name ON public.registrations USING btree (company_name);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations USING btree (email);

CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations USING btree (status);

CREATE INDEX IF NOT EXISTS idx_registrations_status_created_at ON public.registrations USING btree (status, created_at);

CREATE INDEX IF NOT EXISTS idx_registrations_status_province ON public.registrations USING btree (status, yec_province);

CREATE INDEX IF NOT EXISTS idx_registrations_update_reason ON public.registrations USING btree (update_reason) WHERE (update_reason IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_registrations_yec_province ON public.registrations USING btree (yec_province);

CREATE UNIQUE INDEX IF NOT EXISTS registrations_pkey ON public.registrations USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS registrations_registration_id_key ON public.registrations USING btree (registration_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_event_settings_singleton ON public.event_settings USING btree ((true));



alter table "public"."admin_users" add constraint "admin_users_email_key" UNIQUE using index "admin_users_email_key";

alter table "public"."admin_users" add constraint "admin_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_users" validate constraint "admin_users_id_fkey";

alter table "public"."admin_users" add constraint "admin_users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'super_admin'::text]))) not valid;

alter table "public"."admin_users" validate constraint "admin_users_role_check";







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

alter table "public"."registrations" add constraint "registrations_registration_id_key" UNIQUE using index "registrations_registration_id_key";

alter table "public"."registrations" add constraint "registrations_travel_type_check" CHECK (((travel_type)::text = ANY (ARRAY[('private-car'::character varying)::text, ('van'::character varying)::text]))) not valid;

alter table "public"."registrations" validate constraint "registrations_travel_type_check";

alter table "public"."registrations" add constraint "room_type_required_when_in_quota" CHECK (((((hotel_choice)::text = 'in-quota'::text) AND (room_type IS NOT NULL)) OR (((hotel_choice)::text = 'out-of-quota'::text) AND (room_type IS NULL)))) not valid;

alter table "public"."registrations" validate constraint "room_type_required_when_in_quota";

alter table "public"."registrations" add constraint "roommate_info_required_for_double" CHECK (((((room_type)::text = 'double'::text) AND (roommate_info IS NOT NULL) AND (roommate_phone IS NOT NULL)) OR ((room_type)::text <> 'double'::text))) not valid;

alter table "public"."registrations" validate constraint "roommate_info_required_for_double";

set check_function_bodies = off;

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












CREATE OR REPLACE FUNCTION public.get_price_packages()
 RETURNS TABLE(code text, name text, currency text, early_bird_amount numeric, regular_amount numeric, is_early_bird boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  event_setting RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event settings not found';
  END IF;
  
  -- Return price packages with early bird status
  RETURN QUERY
  SELECT 
    (package->>'code')::TEXT as code,
    (package->>'name')::TEXT as name,
    (package->>'currency')::TEXT as currency,
    (package->>'early_bird_amount')::NUMERIC as early_bird_amount,
    (package->>'regular_amount')::NUMERIC as regular_amount,
    (NOW() <= event_setting.early_bird_deadline_utc) as is_early_bird
  FROM jsonb_array_elements(event_setting.price_packages) as package;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_registration_statistics()
 RETURNS TABLE(total_count bigint, waiting_for_review_count bigint, waiting_for_update_payment_count bigint, waiting_for_update_info_count bigint, waiting_for_update_tcc_count bigint, approved_count bigint, rejected_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_review') as waiting_for_review_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_payment') as waiting_for_update_payment_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_info') as waiting_for_update_info_count,
    COUNT(*) FILTER (WHERE status = 'waiting_for_update_tcc') as waiting_for_update_tcc_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
  FROM registrations;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_registration_open()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  event_setting RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current time is before registration deadline
  RETURN NOW() <= event_setting.registration_deadline_utc;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.registration_sweep()
 RETURNS TABLE(registration_id text, action text, reason text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  event_setting RECORD;
  reg RECORD;
BEGIN
  -- Get event settings
  SELECT * INTO event_setting FROM event_settings LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event settings not found';
  END IF;
  
  -- Process deadline rejections
  FOR reg IN 
    SELECT id, registration_id, email, first_name, last_name
    FROM registrations 
    WHERE status IN ('waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc')
      AND created_at < event_setting.registration_deadline_utc
  LOOP
    -- Update registration status
    UPDATE registrations 
    SET 
      status = 'rejected',
      rejected_reason = 'deadline_missed',
      payment_review_status = 'rejected',
      profile_review_status = 'rejected',
      tcc_review_status = 'rejected',
      updated_at = NOW()
    WHERE id = reg.id;
    
    -- Enqueue rejection email
    PERFORM fn_enqueue_email(
      'rejection',
      reg.email,
      json_build_object(
        'trackingCode', reg.registration_id,
        'rejectedReason', 'deadline_missed',
        'applicantName', reg.first_name || ' ' || reg.last_name
      ),
      'registration:' || reg.id || ':rejection'
    );
    
    registration_id := reg.registration_id;
    action := 'rejected';
    reason := 'deadline_missed';
    RETURN NEXT;
  END LOOP;
  
  -- Process eligibility rule rejections (if rules exist)
  IF event_setting.eligibility_rules IS NOT NULL AND 
     (event_setting.eligibility_rules->>'blocked_emails' != '[]' OR 
      event_setting.eligibility_rules->>'blocked_domains' != '[]' OR 
      event_setting.eligibility_rules->>'blocked_keywords' != '[]') THEN
    
    FOR reg IN 
      SELECT id, registration_id, email, first_name, last_name
      FROM registrations 
      WHERE status IN ('waiting_for_review', 'waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc')
        AND (
          -- Check blocked emails
          email = ANY(SELECT jsonb_array_elements_text(event_setting.eligibility_rules->'blocked_emails'))
          OR
          -- Check blocked domains
          email LIKE '%@' || ANY(SELECT jsonb_array_elements_text(event_setting.eligibility_rules->'blocked_domains'))
          OR
          -- Check blocked keywords in email
          email LIKE ANY(SELECT '%' || jsonb_array_elements_text(event_setting.eligibility_rules->'blocked_keywords') || '%')
        )
    LOOP
      -- Update registration status
      UPDATE registrations 
      SET 
        status = 'rejected',
        rejected_reason = 'ineligible_rule_match',
        payment_review_status = 'rejected',
        profile_review_status = 'rejected',
        tcc_review_status = 'rejected',
        updated_at = NOW()
      WHERE id = reg.id;
      
      -- Enqueue rejection email
      PERFORM fn_enqueue_email(
        'rejection',
        reg.email,
        json_build_object(
          'trackingCode', reg.registration_id,
          'rejectedReason', 'ineligible_rule_match',
          'applicantName', reg.first_name || ' ' || reg.last_name
        ),
        'registration:' || reg.id || ':rejection'
      );
      
      registration_id := reg.registration_id;
      action := 'rejected';
      reason := 'ineligible_rule_match';
      RETURN NEXT;
    END LOOP;
  END IF;
  
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_registration_review_status(registration_id_param text, track_param text, status_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  registration_record RECORD;
BEGIN
  -- Get the registration
  SELECT * INTO registration_record 
  FROM registrations 
  WHERE registration_id = registration_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the appropriate track status
  CASE track_param
    WHEN 'payment' THEN
      UPDATE registrations 
      SET payment_review_status = status_param::TEXT,
          updated_at = NOW()
      WHERE registration_id = registration_id_param;
    WHEN 'profile' THEN
      UPDATE registrations 
      SET profile_review_status = status_param::TEXT,
          updated_at = NOW()
      WHERE registration_id = registration_id_param;
    WHEN 'tcc' THEN
      UPDATE registrations 
      SET tcc_review_status = status_param::TEXT,
          updated_at = NOW()
      WHERE registration_id = registration_id_param;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_registration_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If all review statuses are 'passed', set status to 'approved'
  IF NEW.payment_review_status = 'passed' AND 
     NEW.profile_review_status = 'passed' AND 
     NEW.tcc_review_status = 'passed' THEN
    NEW.status := 'approved';
    NEW.update_reason := NULL;
  
  -- If any review status is 'rejected', set status to 'rejected'
  ELSIF NEW.payment_review_status = 'rejected' OR 
        NEW.profile_review_status = 'rejected' OR 
        NEW.tcc_review_status = 'rejected' THEN
    NEW.status := 'rejected';
    NEW.update_reason := NULL;
  
  -- If any review status is 'needs_update', set appropriate waiting status
  ELSIF NEW.payment_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_payment';
    NEW.update_reason := 'payment';
  ELSIF NEW.profile_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_info';
    NEW.update_reason := 'info';
  ELSIF NEW.tcc_review_status = 'needs_update' THEN
    NEW.status := 'waiting_for_update_tcc';
    NEW.update_reason := 'tcc';
  
  -- If all review statuses are 'pending', set status to 'waiting_for_review'
  ELSIF NEW.payment_review_status = 'pending' AND 
        NEW.profile_review_status = 'pending' AND 
        NEW.tcc_review_status = 'pending' THEN
    NEW.status := 'waiting_for_review';
    NEW.update_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."admin_audit_logs" to "anon";

grant insert on table "public"."admin_audit_logs" to "anon";

grant references on table "public"."admin_audit_logs" to "anon";

grant select on table "public"."admin_audit_logs" to "anon";

grant trigger on table "public"."admin_audit_logs" to "anon";

grant truncate on table "public"."admin_audit_logs" to "anon";

grant update on table "public"."admin_audit_logs" to "anon";

grant delete on table "public"."admin_audit_logs" to "authenticated";

grant insert on table "public"."admin_audit_logs" to "authenticated";

grant references on table "public"."admin_audit_logs" to "authenticated";

grant select on table "public"."admin_audit_logs" to "authenticated";

grant trigger on table "public"."admin_audit_logs" to "authenticated";

grant truncate on table "public"."admin_audit_logs" to "authenticated";

grant update on table "public"."admin_audit_logs" to "authenticated";

grant delete on table "public"."admin_audit_logs" to "service_role";

grant insert on table "public"."admin_audit_logs" to "service_role";

grant references on table "public"."admin_audit_logs" to "service_role";

grant select on table "public"."admin_audit_logs" to "service_role";

grant trigger on table "public"."admin_audit_logs" to "service_role";

grant truncate on table "public"."admin_audit_logs" to "service_role";

grant update on table "public"."admin_audit_logs" to "service_role";

grant delete on table "public"."admin_users" to "anon";

grant insert on table "public"."admin_users" to "anon";

grant references on table "public"."admin_users" to "anon";

grant select on table "public"."admin_users" to "anon";

grant trigger on table "public"."admin_users" to "anon";

grant truncate on table "public"."admin_users" to "anon";

grant update on table "public"."admin_users" to "anon";

grant delete on table "public"."admin_users" to "authenticated";

grant insert on table "public"."admin_users" to "authenticated";

grant references on table "public"."admin_users" to "authenticated";

grant select on table "public"."admin_users" to "authenticated";

grant trigger on table "public"."admin_users" to "authenticated";

grant truncate on table "public"."admin_users" to "authenticated";

grant update on table "public"."admin_users" to "authenticated";

grant delete on table "public"."admin_users" to "service_role";

grant insert on table "public"."admin_users" to "service_role";

grant references on table "public"."admin_users" to "service_role";

grant select on table "public"."admin_users" to "service_role";

grant trigger on table "public"."admin_users" to "service_role";

grant truncate on table "public"."admin_users" to "service_role";

grant update on table "public"."admin_users" to "service_role";

grant delete on table "public"."email_outbox" to "anon";

grant insert on table "public"."email_outbox" to "anon";

grant references on table "public"."email_outbox" to "anon";

grant select on table "public"."email_outbox" to "anon";

grant trigger on table "public"."email_outbox" to "anon";

grant truncate on table "public"."email_outbox" to "anon";

grant update on table "public"."email_outbox" to "anon";

grant delete on table "public"."email_outbox" to "authenticated";

grant insert on table "public"."email_outbox" to "authenticated";

grant references on table "public"."email_outbox" to "authenticated";

grant select on table "public"."email_outbox" to "authenticated";

grant trigger on table "public"."email_outbox" to "authenticated";

grant truncate on table "public"."email_outbox" to "authenticated";

grant update on table "public"."email_outbox" to "authenticated";

grant delete on table "public"."email_outbox" to "service_role";

grant insert on table "public"."email_outbox" to "service_role";

grant references on table "public"."email_outbox" to "service_role";

grant select on table "public"."email_outbox" to "service_role";

grant trigger on table "public"."email_outbox" to "service_role";

grant truncate on table "public"."email_outbox" to "service_role";

grant update on table "public"."email_outbox" to "service_role";

grant delete on table "public"."event_settings" to "anon";

grant insert on table "public"."event_settings" to "anon";

grant references on table "public"."event_settings" to "anon";

grant select on table "public"."event_settings" to "anon";

grant trigger on table "public"."event_settings" to "anon";

grant truncate on table "public"."event_settings" to "anon";

grant update on table "public"."event_settings" to "anon";

grant delete on table "public"."event_settings" to "authenticated";

grant insert on table "public"."event_settings" to "authenticated";

grant references on table "public"."event_settings" to "authenticated";

grant select on table "public"."event_settings" to "authenticated";

grant trigger on table "public"."event_settings" to "authenticated";

grant truncate on table "public"."event_settings" to "authenticated";

grant update on table "public"."event_settings" to "authenticated";

grant delete on table "public"."event_settings" to "service_role";

grant insert on table "public"."event_settings" to "service_role";

grant references on table "public"."event_settings" to "service_role";

grant select on table "public"."event_settings" to "service_role";

grant trigger on table "public"."event_settings" to "service_role";

grant truncate on table "public"."event_settings" to "service_role";

grant update on table "public"."event_settings" to "service_role";

grant delete on table "public"."registrations" to "anon";

grant insert on table "public"."registrations" to "anon";

grant references on table "public"."registrations" to "anon";

grant select on table "public"."registrations" to "anon";

grant trigger on table "public"."registrations" to "anon";

grant truncate on table "public"."registrations" to "anon";

grant update on table "public"."registrations" to "anon";

grant delete on table "public"."registrations" to "authenticated";

grant insert on table "public"."registrations" to "authenticated";

grant references on table "public"."registrations" to "authenticated";

grant select on table "public"."registrations" to "authenticated";

grant trigger on table "public"."registrations" to "authenticated";

grant truncate on table "public"."registrations" to "authenticated";

grant update on table "public"."registrations" to "authenticated";

grant delete on table "public"."registrations" to "service_role";

grant insert on table "public"."registrations" to "service_role";

grant references on table "public"."registrations" to "service_role";

grant select on table "public"."registrations" to "service_role";

grant trigger on table "public"."registrations" to "service_role";

grant truncate on table "public"."registrations" to "service_role";

grant update on table "public"."registrations" to "service_role";

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



  create policy "Admin can read email outbox"
  on "public"."email_outbox"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Service role can manage email outbox"
  on "public"."email_outbox"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



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



  create policy "Users can insert registrations"
  on "public"."registrations"
  as permissive
  for insert
  to public
with check (true);


CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_registration_status BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION update_registration_status();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


