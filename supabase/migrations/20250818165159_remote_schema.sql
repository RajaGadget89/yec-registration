

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "audit";


ALTER SCHEMA "audit" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "ops";


ALTER SCHEMA "ops" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "audit"."log_access"("p" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "audit"."log_access"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "audit"."log_event"("p" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "audit"."log_event"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ops"."now_utc"() RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    AS $$
  select (now() at time zone 'utc')::timestamptz;
$$;


ALTER FUNCTION "ops"."now_utc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "ops"."purge_old_logs"("retention_days" integer DEFAULT 90) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'audit', 'public'
    AS $_$
begin
  execute format($i$ delete from audit.access_log where occurred_at_utc < (now() at time zone 'utc') - interval '%s days' $i$, retention_days);
  execute format($i$ delete from audit.event_log  where occurred_at_utc < (now() at time zone 'utc') - interval '%s days' $i$, retention_days);
end $_$;


ALTER FUNCTION "ops"."purge_old_logs"("retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_price_packages"() RETURNS TABLE("code" "text", "name" "text", "currency" "text", "early_bird_amount" numeric, "regular_amount" numeric, "is_early_bird" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_price_packages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_registration_statistics"() RETURNS TABLE("total_count" bigint, "waiting_for_review_count" bigint, "waiting_for_update_payment_count" bigint, "waiting_for_update_info_count" bigint, "waiting_for_update_tcc_count" bigint, "approved_count" bigint, "rejected_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_registration_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_registration_open"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."is_registration_open"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."query_access_logs_by_request_id"("request_id_param" "text", "cutoff_time_param" timestamp with time zone) RETURNS TABLE("id" bigint, "occurred_at_utc" timestamp with time zone, "action" "text", "resource" "text", "result" "text", "request_id" "text", "meta" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."query_access_logs_by_request_id"("request_id_param" "text", "cutoff_time_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."query_event_logs_by_correlation_id"("correlation_id_param" "text", "cutoff_time_param" timestamp with time zone) RETURNS TABLE("id" bigint, "occurred_at_utc" timestamp with time zone, "action" "text", "resource" "text", "resource_id" "text", "actor_role" "text", "result" "text", "reason" "text", "correlation_id" "text", "meta" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."query_event_logs_by_correlation_id"("correlation_id_param" "text", "cutoff_time_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."query_recent_access_logs"("cutoff_time_param" timestamp with time zone) RETURNS TABLE("id" bigint, "occurred_at_utc" timestamp with time zone, "action" "text", "resource" "text", "result" "text", "request_id" "text", "meta" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."query_recent_access_logs"("cutoff_time_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."query_recent_event_logs"("cutoff_time_param" timestamp with time zone) RETURNS TABLE("id" bigint, "occurred_at_utc" timestamp with time zone, "action" "text", "resource" "text", "resource_id" "text", "actor_role" "text", "result" "text", "reason" "text", "correlation_id" "text", "meta" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."query_recent_event_logs"("cutoff_time_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registration_sweep"() RETURNS TABLE("registration_id" "text", "action" "text", "reason" "text")
    LANGUAGE "plpgsql"
    AS $$
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
    UPDATE registrations 
    SET 
      status = 'rejected',
      rejected_reason = 'deadline_missed',
      payment_review_status = 'rejected',
      profile_review_status = 'rejected',
      tcc_review_status = 'rejected',
      updated_at = NOW()
    WHERE id = reg.id;
    
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
      UPDATE registrations 
      SET 
        status = 'rejected',
        rejected_reason = 'ineligible_rule_match',
        payment_review_status = 'rejected',
        profile_review_status = 'rejected',
        tcc_review_status = 'rejected',
        updated_at = NOW()
      WHERE id = reg.id;
      
      registration_id := reg.registration_id;
      action := 'rejected';
      reason := 'ineligible_rule_match';
      RETURN NEXT;
    END LOOP;
  END IF;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."registration_sweep"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_registration_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_registration_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "audit"."access_log" (
    "id" bigint NOT NULL,
    "occurred_at_utc" timestamp with time zone DEFAULT "now"(),
    "action" "text" NOT NULL,
    "method" "text",
    "resource" "text",
    "result" "text" NOT NULL,
    "request_id" "text" NOT NULL,
    "src_ip" "inet",
    "user_agent" "text",
    "latency_ms" integer,
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "audit"."access_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "audit"."access_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "audit"."access_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "audit"."access_log_id_seq" OWNED BY "audit"."access_log"."id";



CREATE TABLE IF NOT EXISTS "audit"."event_log" (
    "id" bigint NOT NULL,
    "occurred_at_utc" timestamp with time zone DEFAULT "now"(),
    "action" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "resource_id" "text",
    "actor_id" "text",
    "actor_role" "text" NOT NULL,
    "result" "text" NOT NULL,
    "reason" "text",
    "correlation_id" "text" NOT NULL,
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_log_actor_role_check" CHECK (("actor_role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'system'::"text"])))
);


ALTER TABLE "audit"."event_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "audit"."event_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "audit"."event_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "audit"."event_log_id_seq" OWNED BY "audit"."event_log"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "admin_email" "text" NOT NULL,
    "action" "text" NOT NULL,
    "registration_id" "text" NOT NULL,
    "before" "jsonb",
    "after" "jsonb"
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" character varying(50) NOT NULL,
    "title" character varying(10) NOT NULL,
    "first_name" character varying(50) NOT NULL,
    "last_name" character varying(50) NOT NULL,
    "nickname" character varying(30) NOT NULL,
    "phone" character varying(15) NOT NULL,
    "line_id" character varying(30) NOT NULL,
    "email" character varying(255) NOT NULL,
    "company_name" character varying(100) NOT NULL,
    "business_type" character varying(50) NOT NULL,
    "business_type_other" character varying(50),
    "yec_province" character varying(50) NOT NULL,
    "hotel_choice" character varying(20) NOT NULL,
    "room_type" character varying(20),
    "roommate_info" character varying(100),
    "roommate_phone" character varying(15),
    "external_hotel_name" character varying(100),
    "travel_type" character varying(20) NOT NULL,
    "profile_image_url" "text",
    "chamber_card_url" "text",
    "payment_slip_url" "text",
    "badge_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email_sent" boolean DEFAULT false,
    "email_sent_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "form_data" "jsonb",
    "status" "text",
    "update_reason" "text",
    "rejected_reason" "text",
    "payment_review_status" "text" NOT NULL,
    "profile_review_status" "text" NOT NULL,
    "tcc_review_status" "text" NOT NULL,
    "price_applied" numeric(12,2),
    "currency" "text" DEFAULT 'THB'::"text",
    "selected_package_code" "text",
    CONSTRAINT "chk_review_statuses" CHECK ((("payment_review_status" = ANY (ARRAY['pending'::"text", 'needs_update'::"text", 'passed'::"text", 'rejected'::"text"])) AND ("profile_review_status" = ANY (ARRAY['pending'::"text", 'needs_update'::"text", 'passed'::"text", 'rejected'::"text"])) AND ("tcc_review_status" = ANY (ARRAY['pending'::"text", 'needs_update'::"text", 'passed'::"text", 'rejected'::"text"])))),
    CONSTRAINT "chk_status" CHECK (("status" = ANY (ARRAY['waiting_for_review'::"text", 'waiting_for_update_payment'::"text", 'waiting_for_update_info'::"text", 'waiting_for_update_tcc'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "chk_update_reason" CHECK ((("update_reason" IS NULL) OR ("update_reason" = ANY (ARRAY['payment'::"text", 'info'::"text", 'tcc'::"text"])))),
    CONSTRAINT "external_hotel_required_when_out_quota" CHECK ((((("hotel_choice")::"text" = 'out-of-quota'::"text") AND ("external_hotel_name" IS NOT NULL)) OR ((("hotel_choice")::"text" = 'in-quota'::"text") AND ("external_hotel_name" IS NULL)))),
    CONSTRAINT "registrations_email_check" CHECK ((("email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "registrations_hotel_choice_check" CHECK ((("hotel_choice")::"text" = ANY (ARRAY[('in-quota'::character varying)::"text", ('out-of-quota'::character varying)::"text"]))),
    CONSTRAINT "registrations_line_id_check" CHECK ((("line_id")::"text" ~ '^[a-zA-Z0-9._-]+$'::"text")),
    CONSTRAINT "registrations_phone_check" CHECK (((("phone")::"text" ~ '^0[0-9]{9}$'::"text") OR (("phone")::"text" ~ '^\\+66[0-9]{8}$'::"text"))),
    CONSTRAINT "registrations_travel_type_check" CHECK ((("travel_type")::"text" = ANY (ARRAY[('private-car'::character varying)::"text", ('van'::character varying)::"text"]))),
    CONSTRAINT "room_type_required_when_in_quota" CHECK ((((("hotel_choice")::"text" = 'in-quota'::"text") AND ("room_type" IS NOT NULL)) OR ((("hotel_choice")::"text" = 'out-of-quota'::"text") AND ("room_type" IS NULL)))),
    CONSTRAINT "roommate_info_required_for_double" CHECK ((((("room_type")::"text" = 'double'::"text") AND ("roommate_info" IS NOT NULL) AND ("roommate_phone" IS NOT NULL)) OR (("room_type")::"text" <> 'double'::"text")))
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_registrations_view" AS
 SELECT "id",
    "registration_id",
    "title",
    "first_name",
    "last_name",
    "email",
    "company_name",
    "yec_province",
    "status",
    "update_reason",
    "payment_review_status",
    "profile_review_status",
    "tcc_review_status",
    "price_applied",
    "currency",
    "selected_package_code",
    "created_at",
    "updated_at"
   FROM "public"."registrations"
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."admin_registrations_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template" "text" NOT NULL,
    "to_email" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_error" "text",
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_outbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_deadline_utc" timestamp with time zone NOT NULL,
    "early_bird_deadline_utc" timestamp with time zone NOT NULL,
    "price_packages" "jsonb" NOT NULL,
    "eligibility_rules" "jsonb",
    "timezone" "text" DEFAULT 'Asia/Bangkok'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations_backup_yyyymmdd" (
    "id" "uuid",
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
    "profile_image_url" "text",
    "chamber_card_url" "text",
    "payment_slip_url" "text",
    "badge_url" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email_sent" boolean,
    "email_sent_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "form_data" "jsonb"
);


ALTER TABLE "public"."registrations_backup_yyyymmdd" OWNER TO "postgres";


ALTER TABLE ONLY "audit"."access_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"audit"."access_log_id_seq"'::"regclass");



ALTER TABLE ONLY "audit"."event_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"audit"."event_log_id_seq"'::"regclass");



ALTER TABLE ONLY "audit"."access_log"
    ADD CONSTRAINT "access_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "audit"."event_log"
    ADD CONSTRAINT "event_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_settings"
    ADD CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_registration_id_key" UNIQUE ("registration_id");



CREATE INDEX "idx_access_log_occurred_at" ON "audit"."access_log" USING "btree" ("occurred_at_utc");



CREATE INDEX "idx_access_log_request_id" ON "audit"."access_log" USING "btree" ("request_id");



CREATE INDEX "idx_event_log_action" ON "audit"."event_log" USING "btree" ("action");



CREATE INDEX "idx_event_log_correlation_id" ON "audit"."event_log" USING "btree" ("correlation_id");



CREATE INDEX "idx_event_log_occurred_at" ON "audit"."event_log" USING "btree" ("occurred_at_utc");



CREATE INDEX "idx_audit_admin_email" ON "public"."admin_audit_logs" USING "btree" ("admin_email");



CREATE INDEX "idx_audit_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_registration_id" ON "public"."admin_audit_logs" USING "btree" ("registration_id");



CREATE INDEX "idx_registrations_business_type" ON "public"."registrations" USING "btree" ("business_type");



CREATE INDEX "idx_registrations_company_name" ON "public"."registrations" USING "btree" ("company_name");



CREATE INDEX "idx_registrations_created_at" ON "public"."registrations" USING "btree" ("created_at");



CREATE INDEX "idx_registrations_email" ON "public"."registrations" USING "btree" ("email");



CREATE INDEX "idx_registrations_status" ON "public"."registrations" USING "btree" ("status");



CREATE INDEX "idx_registrations_status_created_at" ON "public"."registrations" USING "btree" ("status", "created_at");



CREATE INDEX "idx_registrations_status_province" ON "public"."registrations" USING "btree" ("status", "yec_province");



CREATE INDEX "idx_registrations_update_reason" ON "public"."registrations" USING "btree" ("update_reason") WHERE ("update_reason" IS NOT NULL);



CREATE INDEX "idx_registrations_yec_province" ON "public"."registrations" USING "btree" ("yec_province");



CREATE UNIQUE INDEX "ux_event_settings_singleton" ON "public"."event_settings" USING "btree" ((true));



CREATE OR REPLACE TRIGGER "trg_admin_users_updated_at" BEFORE UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_registration_status" BEFORE UPDATE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_registration_status"();



CREATE OR REPLACE TRIGGER "update_registrations_updated_at" BEFORE UPDATE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can access all audit logs" ON "audit"."access_log" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can access all audit logs" ON "audit"."event_log" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can access all audit logs" ON "audit"."access_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can access all audit logs" ON "audit"."event_log" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "audit"."access_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "audit"."event_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admin users can insert event settings" ON "public"."event_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Admin users can update event settings" ON "public"."event_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Admin users can update registrations" ON "public"."registrations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Admin users can view all registrations" ON "public"."registrations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Admin users can view event settings" ON "public"."event_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Allow Admin Read" ON "public"."registrations" FOR SELECT USING (("auth"."role"() = 'admin'::"text"));



CREATE POLICY "Allow Public Insert" ON "public"."registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Super admins can delete admin users" ON "public"."admin_users" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can insert admin users" ON "public"."admin_users" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can update admin users" ON "public"."admin_users" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can view all admin users" ON "public"."admin_users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Users can insert registrations" ON "public"."registrations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can view own admin record" ON "public"."admin_users" FOR SELECT USING ((("id" = "auth"."uid"()) AND ("is_active" = true)));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "audit" TO "service_role";
GRANT USAGE ON SCHEMA "audit" TO "authenticated";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "audit"."log_access"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "audit"."log_access"("p" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "audit"."log_event"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "audit"."log_event"("p" "jsonb") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."get_price_packages"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_price_packages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_price_packages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_registration_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_registration_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_registration_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_registration_open"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_registration_open"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_registration_open"() TO "service_role";



GRANT ALL ON FUNCTION "public"."query_access_logs_by_request_id"("request_id_param" "text", "cutoff_time_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."query_access_logs_by_request_id"("request_id_param" "text", "cutoff_time_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_access_logs_by_request_id"("request_id_param" "text", "cutoff_time_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."query_event_logs_by_correlation_id"("correlation_id_param" "text", "cutoff_time_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."query_event_logs_by_correlation_id"("correlation_id_param" "text", "cutoff_time_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_event_logs_by_correlation_id"("correlation_id_param" "text", "cutoff_time_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."query_recent_access_logs"("cutoff_time_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."query_recent_access_logs"("cutoff_time_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_recent_access_logs"("cutoff_time_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."query_recent_event_logs"("cutoff_time_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."query_recent_event_logs"("cutoff_time_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_recent_event_logs"("cutoff_time_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."registration_sweep"() TO "anon";
GRANT ALL ON FUNCTION "public"."registration_sweep"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."registration_sweep"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_registration_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_registration_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_registration_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON TABLE "audit"."access_log" TO "service_role";
GRANT ALL ON TABLE "audit"."access_log" TO "authenticated";



GRANT ALL ON SEQUENCE "audit"."access_log_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "audit"."access_log_id_seq" TO "authenticated";



GRANT ALL ON TABLE "audit"."event_log" TO "service_role";
GRANT ALL ON TABLE "audit"."event_log" TO "authenticated";



GRANT ALL ON SEQUENCE "audit"."event_log_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "audit"."event_log_id_seq" TO "authenticated";















GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



GRANT ALL ON TABLE "public"."admin_registrations_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_registrations_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_registrations_view" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."email_outbox" TO "anon";
GRANT ALL ON TABLE "public"."email_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."email_outbox" TO "service_role";



GRANT ALL ON TABLE "public"."event_settings" TO "anon";
GRANT ALL ON TABLE "public"."event_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."event_settings" TO "service_role";



GRANT ALL ON TABLE "public"."registrations_backup_yyyymmdd" TO "anon";
GRANT ALL ON TABLE "public"."registrations_backup_yyyymmdd" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations_backup_yyyymmdd" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
