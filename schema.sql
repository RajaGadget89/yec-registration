

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."admin_status" AS ENUM (
    'active',
    'suspended'
);


ALTER TYPE "public"."admin_status" OWNER TO "postgres";


CREATE TYPE "public"."email_status" AS ENUM (
    'pending',
    'processing',
    'sent',
    'failed',
    'blocked'
);


ALTER TYPE "public"."email_status" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."accept_admin_invitation"("p_token" "text", "p_admin_id" "uuid") RETURNS TABLE("success" boolean, "message" "text", "admin_user_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_invitation_id UUID;
  v_email TEXT;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_invited_by_admin_id UUID;
  v_admin_user_id UUID;
BEGIN
  -- Validate token
  SELECT 
    invitation_id,
    email,
    status,
    expires_at,
    invited_by_admin_id
  INTO v_invitation_id, v_email, v_status, v_expires_at, v_invited_by_admin_id
  FROM validate_admin_invitation_token(p_token);
  
  IF v_invitation_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation token', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if admin user already exists
  SELECT id INTO v_admin_user_id
  FROM admin_users
  WHERE email = v_email;
  
  IF v_admin_user_id IS NULL THEN
    -- Create new admin user with business_roles
    INSERT INTO admin_users (id, email, role, status, business_roles, created_at, updated_at)
    VALUES (p_admin_id, v_email, 'admin', 'active', ARRAY['user_profile']::TEXT[], now(), now())
    RETURNING id INTO v_admin_user_id;
  ELSE
    -- Update existing admin user with business_roles if not set
    UPDATE admin_users
    SET 
      id = p_admin_id,
      status = 'active',
      business_roles = CASE 
        WHEN business_roles IS NULL OR business_roles = '{}' THEN ARRAY['user_profile']::TEXT[]
        ELSE business_roles
      END,
      updated_at = now()
    WHERE id = v_admin_user_id;
  END IF;
  
  -- Mark invitation as accepted
  UPDATE admin_invitations
  SET 
    status = 'accepted',
    accepted_admin_id = v_admin_user_id,
    updated_at = now()
  WHERE id = v_invitation_id;
  
  RETURN QUERY SELECT TRUE, 'Invitation accepted successfully', v_admin_user_id;
END;
$$;


ALTER FUNCTION "public"."accept_admin_invitation"("p_token" "text", "p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_admin_invitation"("p_token" "text", "p_admin_id" "uuid") IS 'Accepts an admin invitation and creates/updates admin user';



CREATE OR REPLACE FUNCTION "public"."admin_has_business_role"("admin_email" "text", "required_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if admin exists and has the required business role
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE email = admin_email 
    AND is_active = true 
    AND (
      role = 'super_admin' OR 
      business_roles @> ARRAY[required_role]::TEXT[]
    )
  );
END;
$$;


ALTER FUNCTION "public"."admin_has_business_role"("admin_email" "text", "required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_admin_invitations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE admin_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
  AND expires_at < now();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_admin_invitations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_admin_invitations"() IS 'Marks expired invitations as expired (run periodically)';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_deep_link_tokens"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete tokens that are expired and unused
  DELETE FROM deep_link_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_deep_link_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tokens"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM deep_link_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_email_outbox"("older_than_days" integer DEFAULT 7) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_outbox 
  WHERE created_at < now() - INTERVAL '1 day' * older_than_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_email_outbox"("older_than_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_email_outbox"("older_than_days" integer) IS 'Cleans up email outbox entries older than specified days (default 7)';



CREATE OR REPLACE FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_token TEXT;
  v_salt TEXT;
  v_hash TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Generate a unique salt for this token
  v_salt := encode(gen_random_bytes(16), 'hex');
  
  -- Hash the token with the salt
  v_hash := encode(digest(v_token || v_salt, 'sha256'), 'hex');
  
  -- Set expiration to 24 hours from now
  v_expires_at := NOW() + INTERVAL '24 hours';
  
  -- Insert the token with secure storage
  INSERT INTO deep_link_tokens (
    token_id,
    token,
    token_hash,
    token_salt,
    registration_id,
    dimension,
    admin_email,
    notes,
    expires_at
  ) VALUES (
    gen_random_uuid(),
    v_token,
    v_hash,
    v_salt,
    p_registration_id,
    p_dimension,
    p_admin_email,
    p_notes,
    v_expires_at
  );
  
  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text" DEFAULT NULL::"text", "p_ttl_hours" integer DEFAULT 24) RETURNS TABLE("success" boolean, "token" "text", "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_token TEXT;
  token_expires TIMESTAMPTZ;
BEGIN
  -- Validate dimension
  IF p_dimension NOT IN ('payment', 'profile', 'tcc') THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Invalid dimension'::TEXT;
    RETURN;
  END IF;
  
  -- Check if registration exists
  IF NOT EXISTS (SELECT 1 FROM registrations WHERE id = p_registration_id) THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Registration not found'::TEXT;
    RETURN;
  END IF;
  
  -- Generate token and expiration
  new_token := generate_deep_link_token();
  token_expires := NOW() + (p_ttl_hours || ' hours')::INTERVAL;
  
  -- Insert token
  INSERT INTO deep_link_tokens (
    token,
    registration_id,
    dimension,
    admin_email,
    notes,
    expires_at
  ) VALUES (
    new_token,
    p_registration_id,
    p_dimension,
    p_admin_email,
    p_notes,
    token_expires
  );
  
  RETURN QUERY SELECT TRUE, new_token, 'Token created successfully'::TEXT;
END;
$$;


ALTER FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text", "p_ttl_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."discover_fk_references"("target_table" "text", "target_column" "text") RETURNS TABLE("table_name" "text", "column_name" "text", "constraint_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    tc.table_name::text,
    kcu.column_name::text,
    tc.constraint_name::text
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'public'
    AND ccu.table_name = target_table
    AND ccu.column_name = target_column
  ORDER BY tc.table_name, kcu.column_name;
$$;


ALTER FUNCTION "public"."discover_fk_references"("target_table" "text", "target_column" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."discover_fk_references"("target_table" "text", "target_column" "text") IS 'Discovers foreign key relationships pointing to a specific table and column. Used for safe admin deletion operations.';



CREATE OR REPLACE FUNCTION "public"."fn_cleanup_old_emails"("days_to_keep" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_outbox
  WHERE created_at < now() - (days_to_keep || ' days')::interval
    AND status IN ('sent', 'failed', 'blocked');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."fn_cleanup_old_emails"("days_to_keep" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_dispatch_email_batch"("batch_size" integer DEFAULT 50, "dry_run" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_emails RECORD;
  v_processed INTEGER := 0;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get pending emails
  FOR v_emails IN
    SELECT id, template, to_email, payload
    FROM email_outbox
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
  LOOP
    v_processed := v_processed + 1;
    
    IF dry_run THEN
      -- Just count, don't actually process
      v_success := v_success + 1;
    ELSE
      -- Process the email
      v_result := fn_dispatch_single_email(v_emails.id);
      
      IF (v_result->>'success')::BOOLEAN THEN
        v_success := v_success + 1;
      ELSE
        v_failed := v_failed + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'processed', v_processed,
    'success', v_success,
    'failed', v_failed,
    'dry_run', dry_run
  );
END;
$$;


ALTER FUNCTION "public"."fn_dispatch_email_batch"("batch_size" integer, "dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_dispatch_single_email"("p_email_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_email RECORD;
  v_html TEXT;
  v_subject TEXT;
  v_result JSONB;
BEGIN
  -- Get the email from outbox
  SELECT * INTO v_email
  FROM email_outbox
  WHERE id = p_email_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email not found or not pending',
      'email_id', p_email_id
    );
  END IF;
  
  -- Render the template
  BEGIN
    v_html := fn_render_email_template(v_email.template, v_email.payload);
    
    -- Extract subject from template
    CASE v_email.template
      WHEN 'tracking' THEN
        v_subject := '[YEC Day] รหัสติดตามการสมัครของคุณ | Your Registration Tracking Code';
      WHEN 'update-payment' THEN
        v_subject := '[YEC Day] โปรดอัปเดตสลิปโอนเงิน | Please Update Your Payment Slip';
      WHEN 'update-info' THEN
        v_subject := '[YEC Day] โปรดอัปเดตข้อมูลส่วนบุคคล | Please Update Your Profile Information';
      WHEN 'update-tcc' THEN
        v_subject := '[YEC Day] โปรดอัปเดตรูปบัตร TCC | Please Update Your TCC Card';
      WHEN 'approval-badge' THEN
        v_subject := '[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar';
      WHEN 'rejection' THEN
        v_subject := '[YEC Day] คำขอสมัครไม่ผ่าน | Registration Not Approved';
      ELSE
        v_subject := '[YEC Day] Email Notification';
    END CASE;
    
    -- Update the email with rendered content
    UPDATE email_outbox
    SET 
      html_content = v_html,
      text_content = 'Plain text version not available',
      subject = v_subject,
      status = 'sent',
      sent_at = NOW(),
      updated_at = NOW()
    WHERE id = p_email_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'email_id', p_email_id,
      'template', v_email.template,
      'to_email', v_email.to_email,
      'subject', v_subject,
      'html_length', length(v_html)
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Mark as failed
    UPDATE email_outbox
    SET 
      status = 'failed',
      error_message = SQLERRM,
      updated_at = NOW()
    WHERE id = p_email_id;
    
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'email_id', p_email_id
    );
  END;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."fn_dispatch_single_email"("p_email_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_payload" "jsonb", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Generate a new UUID for the email
    v_id := gen_random_uuid();
    
    -- Insert into email_outbox (using the EXACT columns that exist)
    INSERT INTO email_outbox (
        id,
        template,
        to_email,
        to_name,
        subject,
        payload,
        status,
        attempts,
        max_attempts,
        last_error,
        scheduled_at,
        next_attempt,
        sent_at,
        dedupe_key,
        created_at,
        updated_at,
        idempotency_key,
        last_attempt_at,
        html_content,
        text_content,
        error_message
    ) VALUES (
        v_id,
        p_template,
        p_to_email,
        NULL, -- to_name (nullable)
        'YEC Registration Notification', -- subject (nullable)
        p_payload,
        'pending'::email_status, -- status (required, enum)
        0, -- attempts (default 0)
        5, -- max_attempts (default 5)
        NULL, -- last_error (nullable)
        NOW(), -- scheduled_at (default now())
        NULL, -- next_attempt (nullable)
        NULL, -- sent_at (nullable)
        p_idempotency_key, -- dedupe_key (nullable)
        NOW(), -- created_at (default now())
        NOW(), -- updated_at (default now())
        p_idempotency_key, -- idempotency_key (nullable)
        NULL, -- last_attempt_at (nullable)
        '', -- html_content (required, set to empty string)
        '', -- text_content (required, set to empty string)
        NULL -- error_message (nullable)
    );
    
    -- Return the generated ID
    RETURN v_id;
    
EXCEPTION
    WHEN unique_violation THEN
        -- If idempotency_key already exists, return the existing ID
        SELECT id INTO v_id 
        FROM email_outbox 
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_id IS NOT NULL THEN
            RETURN v_id;
        ELSE
            RAISE;
        END IF;
END;
$$;


ALTER FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_payload" "jsonb", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_subject" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_dedupe_key" "text" DEFAULT NULL::"text", "p_scheduled_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id UUID;
BEGIN
  -- If dedupe key provided, try to find existing record
  IF p_dedupe_key IS NOT NULL THEN
    SELECT id INTO v_id FROM email_outbox WHERE dedupe_key = p_dedupe_key;
    IF FOUND THEN
      RETURN v_id;
    END IF;
  END IF;

  -- Insert new email record
  INSERT INTO email_outbox (
    template, 
    to_email, 
    subject,
    payload, 
    dedupe_key,
    scheduled_at
  ) VALUES (
    p_template,
    p_to_email,
    p_subject,
    COALESCE(p_payload, '{}'::jsonb),
    p_dedupe_key,
    p_scheduled_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_subject" "text", "p_payload" "jsonb", "p_dedupe_key" "text", "p_scheduled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_outbox_stats"() RETURNS TABLE("total_pending" integer, "total_sent" integer, "total_failed" integer, "total_blocked" integer, "oldest_pending" timestamp with time zone, "avg_attempts" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as total_pending,
    COUNT(*) FILTER (WHERE status = 'sent')::INTEGER as total_sent,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as total_failed,
    COUNT(*) FILTER (WHERE status = 'blocked')::INTEGER as total_blocked,
    MIN(created_at) FILTER (WHERE status = 'pending') as oldest_pending,
    AVG(attempts)::NUMERIC as avg_attempts
  FROM email_outbox;
END;
$$;


ALTER FUNCTION "public"."fn_get_outbox_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_pending_emails"("p_batch_size" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "template" "text", "to_email" "text", "to_name" "text", "subject" "text", "payload" "jsonb", "dedupe_key" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eo.id,
    eo.template,
    eo.to_email,
    eo.to_name,
    eo.subject,
    eo.payload,
    eo.dedupe_key
  FROM email_outbox eo
  WHERE eo.status = 'pending' 
    AND eo.scheduled_at <= now()
    AND (eo.next_attempt IS NULL OR eo.next_attempt <= now())
    AND eo.attempts < eo.max_attempts
  ORDER BY eo.created_at ASC
  LIMIT p_batch_size;
END;
$$;


ALTER FUNCTION "public"."fn_get_pending_emails"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_mark_email_failed"("p_id" "uuid", "p_error" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_record RECORD;
  next_attempt TIMESTAMPTZ;
BEGIN
  -- Get current record
  SELECT * INTO current_record FROM email_outbox WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate next attempt time with exponential backoff
  IF current_record.attempts < current_record.max_attempts THEN
    -- Exponential backoff: 1min, 2min, 4min, 8min, 16min
    next_attempt := now() + (POWER(2, current_record.attempts) || ' minutes')::interval;
    
    UPDATE email_outbox 
    SET 
      status = 'pending',
      attempts = attempts + 1,
      last_error = p_error,
      next_attempt = next_attempt,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = p_id;
  ELSE
    -- Max attempts reached, mark as failed
    UPDATE email_outbox 
    SET 
      status = 'failed',
      last_error = p_error,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = p_id;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."fn_mark_email_failed"("p_id" "uuid", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_mark_email_sent"("p_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE email_outbox 
  SET 
    status = 'sent',
    sent_at = now(),
    last_attempt_at = now(),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."fn_mark_email_sent"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_render_email_template"("p_template" "text", "p_payload" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_html TEXT;
  v_subject TEXT;
  v_applicant_name TEXT;
  v_tracking_code TEXT;
  v_support_email TEXT;
BEGIN
  -- Extract common fields from payload
  v_applicant_name := COALESCE(p_payload->>'applicantName', 'ผู้สมัคร');
  v_tracking_code := COALESCE(p_payload->>'trackingCode', 'N/A');
  v_support_email := COALESCE(p_payload->>'supportEmail', 'support@example.com');
  
  -- Generate HTML based on template
  CASE p_template
    WHEN 'tracking' THEN
      v_subject := '[YEC Day] รหัสติดตามการสมัครของคุณ | Your Registration Tracking Code';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>' || v_subject || '</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #1A237E; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .tracking-code { background-color: #FF6B35; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>YEC Day Registration</h1>
                <p>ยินดีต้อนรับสู่การสมัคร YEC Day</p>
              </div>
              <div class="content">
                <h2>สวัสดี ' || v_applicant_name || '</h2>
                <p>ขอบคุณสำหรับการสมัครเข้าร่วมงาน YEC Day ของคุณ</p>
                <p>รหัสติดตามการสมัครของคุณคือ:</p>
                <div class="tracking-code">' || v_tracking_code || '</div>
                <p>คุณสามารถใช้รหัสนี้เพื่อติดตามสถานะการสมัครของคุณได้</p>
                <p>หากมีคำถามใดๆ กรุณาติดต่อทีมงานที่ ' || v_support_email || '</p>
              </div>
              <div class="footer">
                <p>ขอบคุณสำหรับการเข้าร่วม YEC Day</p>
                <p>ทีมงาน YEC Day</p>
              </div>
            </div>
          </body>
        </html>
      ';
    WHEN 'update-payment' THEN
      v_subject := '[YEC Day] โปรดอัปเดตสลิปโอนเงิน | Please Update Your Payment Slip';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>' || v_subject || '</title>
          </head>
          <body>
            <h1>YEC Day - Payment Update Required</h1>
            <p>Hello ' || v_applicant_name || ',</p>
            <p>Please update your payment slip.</p>
            <p>Tracking Code: ' || v_tracking_code || '</p>
          </body>
        </html>
      ';
    WHEN 'update-info' THEN
      v_subject := '[YEC Day] โปรดอัปเดตข้อมูลส่วนบุคคล | Please Update Your Profile Information';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>' || v_subject || '</title>
          </head>
          <body>
            <h1>YEC Day - Profile Update Required</h1>
            <p>Hello ' || v_applicant_name || ',</p>
            <p>Please update your profile information.</p>
            <p>Tracking Code: ' || v_tracking_code || '</p>
          </body>
        </html>
      ';
    WHEN 'update-tcc' THEN
      v_subject := '[YEC Day] โปรดอัปเดตรูปบัตร TCC | Please Update Your TCC Card';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>' || v_subject || '</title>
          </head>
          <body>
            <h1>YEC Day - TCC Card Update Required</h1>
            <p>Hello ' || v_applicant_name || ',</p>
            <p>Please update your TCC card image.</p>
            <p>Tracking Code: ' || v_tracking_code || '</p>
          </body>
        </html>
      ';
    WHEN 'approval-badge' THEN
      v_subject := '[YEC Day] อนุมัติเรียบร้อย — เจอกันในงาน! | Approved — See You at the Seminar';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>' || v_subject || '</title>
          </head>
          <body>
            <h1>YEC Day - Registration Approved!</h1>
            <p>Congratulations ' || v_applicant_name || '!</p>
            <p>Your registration has been approved.</p>
            <p>Tracking Code: ' || v_tracking_code || '</p>
          </body>
        </html>
      ';
    WHEN 'rejection' THEN
      v_subject := '[YEC Day] คำขอสมัครไม่ผ่าน | Registration Not Approved';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>' || v_subject || '</title>
          </head>
          <body>
            <h1>YEC Day - Registration Not Approved</h1>
            <p>Hello ' || v_applicant_name || ',</p>
            <p>Unfortunately, your registration was not approved.</p>
            <p>Tracking Code: ' || v_tracking_code || '</p>
          </body>
        </html>
      ';
    ELSE
      v_subject := '[YEC Day] Email Notification';
      v_html := '
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>' || v_subject || '</title>
          </head>
          <body>
            <h1>YEC Day Notification</h1>
            <p>Hello ' || v_applicant_name || ',</p>
            <p>This is a notification from YEC Day.</p>
            <p>Tracking Code: ' || v_tracking_code || '</p>
          </body>
        </html>
      ';
  END CASE;
  
  RETURN v_html;
END;
$$;


ALTER FUNCTION "public"."fn_render_email_template"("p_template" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_request_update"("reg_id" "uuid", "dimension" "text", "reviewer_id" "text", "notes" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "message" "text", "new_status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_reg RECORD;
  new_checklist JSONB;
  new_status TEXT;
BEGIN
  -- Get current registration
  SELECT * INTO current_reg 
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Registration not found', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Validate dimension
  IF dimension NOT IN ('payment', 'profile', 'tcc') THEN
    RETURN QUERY SELECT FALSE, 'Invalid dimension', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Update review checklist
  new_checklist = current_reg.review_checklist;
  new_checklist = jsonb_set(
    new_checklist, 
    ARRAY[dimension, 'status'], 
    '"needs_update"'::jsonb
  );
  
  -- Set notes if provided
  IF notes IS NOT NULL THEN
    new_checklist = jsonb_set(
      new_checklist, 
      ARRAY[dimension, 'notes'], 
      to_jsonb(notes)
    );
  END IF;
  
  -- Determine new status based on dimension
  CASE dimension
    WHEN 'payment' THEN new_status := 'waiting_for_update_payment';
    WHEN 'profile' THEN new_status := 'waiting_for_update_info';
    WHEN 'tcc' THEN new_status := 'waiting_for_update_tcc';
  END CASE;
  
  -- Update registration
  UPDATE registrations 
  SET 
    review_checklist = new_checklist,
    status = new_status,
    update_reason = dimension,
    updated_at = NOW()
  WHERE id = reg_id;
  
  RETURN QUERY SELECT TRUE, 'Update requested successfully', new_status;
END;
$$;


ALTER FUNCTION "public"."fn_request_update"("reg_id" "uuid", "dimension" "text", "reviewer_id" "text", "notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_retry_failed_emails"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE email_outbox
  SET 
    status = 'pending',
    attempts = 0,
          next_attempt = now(),
    last_error = NULL,
    updated_at = now()
  WHERE status = 'failed';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."fn_retry_failed_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_try_approve"("reg_id" "uuid") RETURNS TABLE("success" boolean, "message" "text", "new_status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_reg RECORD;
  all_passed BOOLEAN;
BEGIN
  -- Get current registration
  SELECT * INTO current_reg 
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Registration not found', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if all dimensions are passed
  all_passed := (
    current_reg.review_checklist->'payment'->>'status' = 'passed' AND
    current_reg.review_checklist->'profile'->>'status' = 'passed' AND
    current_reg.review_checklist->'tcc'->>'status' = 'passed'
  );
  
  IF NOT all_passed THEN
    RETURN QUERY SELECT FALSE, 'Not all dimensions are passed', current_reg.status;
    RETURN;
  END IF;
  
  -- Update to approved
  UPDATE registrations 
  SET 
    status = 'approved',
    update_reason = NULL,
    updated_at = NOW()
  WHERE id = reg_id;
  
  RETURN QUERY SELECT TRUE, 'Registration approved', 'approved';
END;
$$;


ALTER FUNCTION "public"."fn_try_approve"("reg_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_user_resubmit"("reg_id" "uuid", "payload" "jsonb") RETURNS TABLE("success" boolean, "message" "text", "new_status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_reg RECORD;
  new_checklist JSONB;
  update_reason TEXT;
  update_reason_norm TEXT;  -- Normalized update reason
  allowed_fields JSONB;
  field_updates JSONB := '{}'::jsonb;
  field_key TEXT;
  field_value JSONB;
  new_profile_status TEXT;
  new_payment_status TEXT;
  new_tcc_status TEXT;
BEGIN
  -- Get current registration
  SELECT * INTO current_reg 
  FROM registrations 
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Registration not found', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Validate registration is in update state
  IF current_reg.status NOT IN ('waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc') THEN
    RETURN QUERY SELECT FALSE, 'Registration not in update state', NULL::TEXT;
    RETURN;
  END IF;
  
  -- Determine which fields are allowed based on update reason
  update_reason := current_reg.update_reason;
  
  -- Normalize legacy 'info' values to 'profile'
  update_reason_norm := CASE WHEN update_reason = 'info' THEN 'profile' ELSE update_reason END;
  
  CASE update_reason_norm
    WHEN 'payment' THEN
      allowed_fields := '["payment_slip_url"]'::jsonb;
    WHEN 'profile' THEN
      allowed_fields := '["first_name", "last_name", "nickname", "phone", "line_id", "email", "company_name", "business_type", "business_type_other", "yec_province", "profile_image_url"]'::jsonb;
    WHEN 'tcc' THEN
      allowed_fields := '["chamber_card_url"]'::jsonb;
    ELSE
      RETURN QUERY SELECT FALSE, 'Invalid update reason', NULL::TEXT;
      RETURN;
  END CASE;
  
  -- Build field updates from payload
  FOR field_key, field_value IN SELECT * FROM jsonb_each(payload)
  LOOP
    IF allowed_fields ? field_key THEN
      field_updates = field_updates || jsonb_build_object(field_key, field_value);
    END IF;
  END LOOP;
  
  -- Create a clean checklist structure with only status fields
  new_checklist = jsonb_build_object(
    'profile', jsonb_build_object('status', 'pending'),
    'payment', jsonb_build_object('status', 'pending'),
    'tcc', jsonb_build_object('status', 'pending')
  );
  
  -- Update the specific dimension to pending (this will be the one being resubmitted)
  new_checklist = jsonb_set(
    new_checklist, 
    ARRAY[update_reason_norm, 'status'], 
    '"pending"'::jsonb
  );
  
  -- Set all review statuses to pending
  new_profile_status := 'pending';
  new_payment_status := 'pending';
  new_tcc_status := 'pending';
  
  -- Update registration with clean checklist and individual status columns
  UPDATE registrations 
  SET 
    review_checklist = new_checklist,
    profile_review_status = new_profile_status,
    payment_review_status = new_payment_status,
    tcc_review_status = new_tcc_status,
    update_reason = NULL,
    updated_at = NOW()
  WHERE id = reg_id;
  
  -- Apply field updates if any
  IF jsonb_typeof(field_updates) = 'object' AND field_updates != '{}'::jsonb THEN
    -- This would need to be handled by the API route since we can't dynamically update columns
    -- For now, we'll just update the form_data field
    UPDATE registrations 
    SET 
      form_data = form_data || field_updates,
      updated_at = NOW()
    WHERE id = reg_id;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Resubmission successful', 'waiting_for_review';
END;
$$;


ALTER FUNCTION "public"."fn_user_resubmit"("reg_id" "uuid", "payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_admin_invitation_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Generate a cryptographically secure random token
  -- Using 32 bytes of random data encoded as base64
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;


ALTER FUNCTION "public"."generate_admin_invitation_token"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_admin_invitation_token"() IS 'Generates a cryptographically secure token for admin invitations';



CREATE OR REPLACE FUNCTION "public"."generate_deep_link_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Generate a secure random token using pgcrypto
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;


ALTER FUNCTION "public"."generate_deep_link_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_secure_deep_link_token"("reg_id" "uuid", "dimension" "text", "admin_email" "text", "ttl_seconds" integer DEFAULT 86400) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  token_data JSONB;
  token TEXT;
  token_hash TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Validate dimension
  IF dimension NOT IN ('payment', 'profile', 'tcc') THEN
    RAISE EXCEPTION 'Invalid dimension: %', dimension;
  END IF;
  
  -- Check if registration exists and is in update state
  IF NOT EXISTS (
    SELECT 1 FROM registrations 
    WHERE id = reg_id 
    AND status IN ('waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc')
  ) THEN
    RAISE EXCEPTION 'Registration % is not in update state', reg_id;
  END IF;
  
  -- Set expiration time
  expires_at := NOW() + (ttl_seconds || ' seconds')::interval;
  
  -- Create token data
  token_data := jsonb_build_object(
    'reg_id', reg_id,
    'dimension', dimension,
    'expires_at', expires_at::text,
    'created_at', NOW()::text,
    'nonce', encode(gen_random_bytes(16), 'hex')
  );
  
  -- Generate token using HMAC with secret
  token := encode(
    hmac(
      token_data::text, 
      COALESCE(current_setting('app.deep_link_secret', true), 'default-secret'), 
      'sha256'
    ), 
    'base64'
  );
  
  -- Create hash for storage (we don't store the actual token)
  token_hash := encode(
    hmac(token, 'storage-salt', 'sha256'),
    'hex'
  );
  
  -- Store token record
  INSERT INTO deep_link_tokens (
    token_hash,
    registration_id,
    dimension,
    expires_at,
    created_by
  ) VALUES (
    token_hash,
    reg_id,
    dimension,
    expires_at,
    admin_email
  );
  
  RETURN token;
END;
$$;


ALTER FUNCTION "public"."generate_secure_deep_link_token"("reg_id" "uuid", "dimension" "text", "admin_email" "text", "ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_simple_deep_link_token"("admin_email" "text", "dimension" "text", "reg_id" "uuid", "ttl_seconds" integer DEFAULT 86400) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE 
  raw TEXT; 
  tok TEXT; 
  exp TIMESTAMPTZ;
BEGIN
  -- Set default TTL to 24 hours if not specified
  IF ttl_seconds IS NULL OR ttl_seconds <= 0 THEN 
    ttl_seconds := 86400; 
  END IF;
  
  -- Calculate expiration time
  exp := NOW() + (ttl_seconds || ' seconds')::interval;
  
  -- Generate raw string for hashing
  raw := reg_id::text || '-' || dimension || '-' || NOW()::text || '-' || gen_random_uuid()::text;
  
  -- Create SHA256 hash as token
  tok := encode(digest(raw, 'sha256'), 'hex');
  
  -- Insert token record using the enhanced system
  INSERT INTO deep_link_tokens (registration_id, dimension, token_hash, expires_at, created_by)
  VALUES (reg_id, dimension, encode(hmac(tok, 'storage-salt', 'sha256'), 'hex'), exp, admin_email);
  
  RETURN tok;
END $$;


ALTER FUNCTION "public"."generate_simple_deep_link_token"("admin_email" "text", "dimension" "text", "reg_id" "uuid", "ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_business_roles"("admin_email" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  admin_role TEXT;
  admin_business_roles TEXT[];
BEGIN
  -- Get admin role and business roles
  SELECT role, business_roles 
  INTO admin_role, admin_business_roles
  FROM admin_users 
  WHERE email = admin_email 
  AND is_active = true;
  
  -- If admin not found, return empty array
  IF NOT FOUND THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- If super_admin, return all business roles
  IF admin_role = 'super_admin' THEN
    RETURN ARRAY['user_profile', 'payment_slip', 'tcc_card']::TEXT[];
  END IF;
  
  -- Return actual business roles
  RETURN COALESCE(admin_business_roles, ARRAY[]::TEXT[]);
END;
$$;


ALTER FUNCTION "public"."get_admin_business_roles"("admin_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_invitation_stats"() RETURNS TABLE("total_invitations" bigint, "pending_invitations" bigint, "accepted_invitations" bigint, "expired_invitations" bigint, "revoked_invitations" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations,
    COUNT(*) FILTER (WHERE status = 'revoked') as revoked_invitations
  FROM admin_invitations;
END;
$$;


ALTER FUNCTION "public"."get_admin_invitation_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_invitation_stats"() IS 'Returns statistics about admin invitations';



CREATE OR REPLACE FUNCTION "public"."get_checklist_summary"("reg_id" "uuid") RETURNS TABLE("payment_status" "text", "profile_status" "text", "tcc_status" "text", "all_passed" boolean, "any_needs_update" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  checklist JSONB;
BEGIN
  SELECT review_checklist INTO checklist
  FROM registrations
  WHERE id = reg_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  
  RETURN QUERY SELECT
    checklist->'payment'->>'status' as payment_status,
    checklist->'profile'->>'status' as profile_status,
    checklist->'tcc'->>'status' as tcc_status,
    (checklist->'payment'->>'status' = 'passed' AND
     checklist->'profile'->>'status' = 'passed' AND
     checklist->'tcc'->>'status' = 'passed') as all_passed,
    (checklist->'payment'->>'status' = 'needs_update' OR
     checklist->'profile'->>'status' = 'needs_update' OR
     checklist->'tcc'->>'status' = 'needs_update') as any_needs_update;
END;
$$;


ALTER FUNCTION "public"."get_checklist_summary"("reg_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_admin_user"() RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "is_active" boolean, "last_login_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.role,
    au.is_active,
    au.last_login_at
  FROM admin_users au
  WHERE au.email = current_setting('request.jwt.claims', true)::json->>'email'
  AND au.is_active = true;
END;
$$;


ALTER FUNCTION "public"."get_current_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_deep_link_token_stats"("days_back" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_created', COUNT(*),
    'total_used', COUNT(*) FILTER (WHERE used_at IS NOT NULL),
    'total_expired', COUNT(*) FILTER (WHERE expires_at < NOW() AND used_at IS NULL),
    'active_tokens', COUNT(*) FILTER (WHERE expires_at > NOW() AND used_at IS NULL),
    'by_dimension', jsonb_object_agg(
      dimension, 
      jsonb_build_object(
        'created', COUNT(*) FILTER (WHERE dimension = dlt.dimension),
        'used', COUNT(*) FILTER (WHERE dimension = dlt.dimension AND used_at IS NOT NULL),
        'expired', COUNT(*) FILTER (WHERE dimension = dlt.dimension AND expires_at < NOW() AND used_at IS NULL)
      )
    )
  ) INTO stats
  FROM deep_link_tokens dlt
  WHERE created_at > NOW() - (days_back || ' days')::interval;
  
  RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_deep_link_token_stats"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_outbox_stats"() RETURNS TABLE("total_emails" bigint, "sent_emails" bigint, "failed_emails" bigint, "pending_emails" bigint, "templates_used" "text"[], "recent_activity" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_emails,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as sent_emails,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_emails,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_emails,
    ARRAY_AGG(DISTINCT template) as templates_used,
    MAX(created_at) as recent_activity
  FROM email_outbox;
END;
$$;


ALTER FUNCTION "public"."get_email_outbox_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_email_outbox_stats"() IS 'Returns statistics about email outbox usage';



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


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("action_param" "text", "registration_id_param" "text", "before_data" "jsonb" DEFAULT NULL::"jsonb", "after_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  admin_email TEXT;
  audit_id UUID;
BEGIN
  -- Get admin email from JWT claims
  admin_email := current_setting('request.jwt.claims', true)::json->>'email';
  
  -- Insert audit log
  INSERT INTO admin_audit_logs (
    admin_email,
    action,
    registration_id,
    before,
    after
  ) VALUES (
    admin_email,
    action_param,
    registration_id_param,
    before_data,
    after_data
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("action_param" "text", "registration_id_param" "text", "before_data" "jsonb", "after_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_deep_link_token_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO deep_link_token_audit (
    token_id,
    event_type,
    registration_id,
    dimension,
    admin_email,
    created_at
  ) VALUES (
    NEW.id,
    'created',
    NEW.registration_id,
    NEW.dimension,
    NEW.created_by,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_deep_link_token_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_deep_link_token_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.used_at IS NOT NULL AND OLD.used_at IS NULL THEN
    INSERT INTO deep_link_token_audit (
      token_id,
      event_type,
      registration_id,
      dimension,
      admin_email,
      user_email,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      NEW.id,
      'used',
      NEW.registration_id,
      NEW.dimension,
      NEW.created_by,
      NEW.used_by,
      NEW.ip_address,
      NEW.user_agent,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_deep_link_token_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_deep_link_token_used"("p_token" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Mark token as used
  UPDATE deep_link_tokens 
  SET used_at = NOW(), updated_at = NOW()
  WHERE token = p_token AND used_at IS NULL;
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Token marked as used'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Token not found or already used'::TEXT;
  END IF;
END;
$$;


ALTER FUNCTION "public"."mark_deep_link_token_used"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_deep_link_token_used_by_id"("p_token_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mark token as used
  UPDATE deep_link_tokens 
  SET used_at = NOW(), updated_at = NOW()
  WHERE token_id = p_token_id AND used_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;


ALTER FUNCTION "public"."mark_deep_link_token_used_by_id"("p_token_id" "uuid") OWNER TO "postgres";


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
      'Registration Rejected - YEC Day',
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
        'Registration Rejected - YEC Day',
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
$$;


ALTER FUNCTION "public"."registration_sweep"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_admin_invitation"("p_invitation_id" "uuid", "p_revoked_by_admin_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if invitation exists and is pending
  IF NOT EXISTS (
    SELECT 1 FROM admin_invitations 
    WHERE id = p_invitation_id 
    AND status = 'pending'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already processed';
    RETURN;
  END IF;
  
  -- Revoke invitation
  UPDATE admin_invitations
  SET 
    status = 'revoked',
    updated_at = now()
  WHERE id = p_invitation_id;
  
  RETURN QUERY SELECT TRUE, 'Invitation revoked successfully';
END;
$$;


ALTER FUNCTION "public"."revoke_admin_invitation"("p_invitation_id" "uuid", "p_revoked_by_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_admin_invitation"("p_invitation_id" "uuid", "p_revoked_by_admin_id" "uuid") IS 'Revokes a pending admin invitation';



CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_try_approve_on_checklist_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if all dimensions are passed (auto-approve)
  IF (NEW.review_checklist->'payment'->>'status' = 'passed' AND
      NEW.review_checklist->'profile'->>'status' = 'passed' AND
      NEW.review_checklist->'tcc'->>'status' = 'passed') THEN
    
    -- Auto-approve
    NEW.status := 'approved';
    NEW.update_reason := NULL;
  
  -- Check if any dimension needs update
  ELSIF NEW.review_checklist->'payment'->>'status' = 'needs_update' THEN
    NEW.status := 'waiting_for_update_payment';
    NEW.update_reason := 'payment';
  ELSIF NEW.review_checklist->'profile'->>'status' = 'needs_update' THEN
    NEW.status := 'waiting_for_update_info';
    NEW.update_reason := 'info';
  ELSIF NEW.review_checklist->'tcc'->>'status' = 'needs_update' THEN
    NEW.status := 'waiting_for_update_tcc';
    NEW.update_reason := 'tcc';
  
  -- Check if any dimension is rejected
  ELSIF NEW.review_checklist->'payment'->>'status' = 'rejected' OR
        NEW.review_checklist->'profile'->>'status' = 'rejected' OR
        NEW.review_checklist->'tcc'->>'status' = 'rejected' THEN
    NEW.status := 'rejected';
    NEW.update_reason := NULL;
  
  -- If all dimensions are pending, set to waiting for review
  ELSIF NEW.review_checklist->'payment'->>'status' = 'pending' AND
        NEW.review_checklist->'profile'->>'status' = 'pending' AND
        NEW.review_checklist->'tcc'->>'status' = 'pending' THEN
    NEW.status := 'waiting_for_review';
    NEW.update_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_try_approve_on_checklist_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_invitations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_invitations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_last_login"("admin_email_param" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE admin_users 
  SET last_login_at = NOW()
  WHERE email = admin_email_param;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_admin_last_login"("admin_email_param" "text") OWNER TO "postgres";


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
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();
  
  -- Handle status updates based on review checklist changes
  -- CORRECT FIX: Monitor the actual JSONB field that the API updates
  
  -- If any review status is 'rejected', set status to 'rejected'
  IF (NEW.review_checklist->'payment'->>'status') = 'rejected' OR 
     (NEW.review_checklist->'profile'->>'status') = 'rejected' OR 
     (NEW.review_checklist->'tcc'->>'status') = 'rejected' THEN
    NEW.status := 'rejected';
    NEW.update_reason := NULL;
  
  -- If any review status is 'needs_update', set appropriate waiting status
  ELSIF (NEW.review_checklist->'payment'->>'status') = 'needs_update' THEN
    NEW.status := 'waiting_for_update_payment';
    -- Preserve API-set update_reason if it exists
    IF NEW.update_reason IS NULL OR NEW.update_reason = '' THEN
      NEW.update_reason := 'payment';
    END IF;
    
  ELSIF (NEW.review_checklist->'profile'->>'status') = 'needs_update' THEN
    NEW.status := 'waiting_for_update_info';
    -- Preserve API-set update_reason if it exists
    IF NEW.update_reason IS NULL OR NEW.update_reason = '' THEN
      NEW.update_reason := 'profile';
    END IF;
    
  ELSIF (NEW.review_checklist->'tcc'->>'status') = 'needs_update' THEN
    NEW.status := 'waiting_for_update_tcc';
    -- Preserve API-set update_reason if it exists
    IF NEW.update_reason IS NULL OR NEW.update_reason = '' THEN
      NEW.update_reason := 'tcc';
    END IF;
  
  -- If all review statuses are 'pending', set status to 'waiting_for_review'
  ELSIF (NEW.review_checklist->'payment'->>'status') = 'pending' AND 
        (NEW.review_checklist->'profile'->>'status') = 'pending' AND 
        (NEW.review_checklist->'tcc'->>'status') = 'pending' THEN
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
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_admin_invitation_token"("p_token" "text") RETURNS TABLE("invitation_id" "uuid", "email" "extensions"."citext", "status" "text", "expires_at" timestamp with time zone, "invited_by_admin_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.email,  -- This is CITEXT, now matches return type
    ai.status,
    ai.expires_at,
    ai.invited_by_admin_id
  FROM admin_invitations ai
  WHERE ai.token = p_token
  AND ai.status = 'pending'
  AND ai.expires_at > now();
END;
$$;


ALTER FUNCTION "public"."validate_admin_invitation_token"("p_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_admin_invitation_token"("p_token" "text") IS 'Validates an invitation token and returns invitation details. FIXED: Now returns CITEXT for email to match column type.';



CREATE OR REPLACE FUNCTION "public"."validate_and_consume_deep_link_token"("token" "text", "reg_id" "uuid", "user_email" "text" DEFAULT NULL::"text", "ip_address" "text" DEFAULT NULL::"text", "user_agent" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  token_data JSONB;
  expected_token TEXT;
  expires_at TIMESTAMPTZ;
  token_hash TEXT;
  token_record RECORD;
  result JSONB;
BEGIN
  -- Create token data for validation (same structure as generation)
  token_data := jsonb_build_object(
    'reg_id', reg_id,
    'dimension', 'unknown', -- Will be determined from stored record
    'expires_at', 'unknown', -- Will be determined from stored record
    'created_at', 'unknown', -- Will be determined from stored record
    'nonce', 'unknown' -- Will be determined from stored record
  );
  
  -- Generate expected token hash
  token_hash := encode(
    hmac(token, 'storage-salt', 'sha256'),
    'hex'
  );
  
  -- Find token record
  SELECT * INTO token_record
  FROM deep_link_tokens
  WHERE token_hash = token_hash
  AND registration_id = reg_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'token_not_found'
    );
  END IF;
  
  -- Check if token is expired
  IF token_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'token_expired',
      'expires_at', token_record.expires_at
    );
  END IF;
  
  -- Check if token is already used
  IF token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'token_already_used',
      'used_at', token_record.used_at
    );
  END IF;
  
  -- Mark token as used
  UPDATE deep_link_tokens
  SET 
    used_at = NOW(),
    used_by = user_email,
    ip_address = ip_address,
    user_agent = user_agent
  WHERE id = token_record.id;
  
  -- Return success with token details
  RETURN jsonb_build_object(
    'valid', true,
    'dimension', token_record.dimension,
    'created_at', token_record.created_at,
    'expires_at', token_record.expires_at,
    'used_at', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."validate_and_consume_deep_link_token"("token" "text", "reg_id" "uuid", "user_email" "text", "ip_address" "text", "user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_deep_link_token"("p_token" "text") RETURNS TABLE("success" boolean, "registration_id" "uuid", "dimension" "text", "admin_email" "text", "notes" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if token exists and is not expired
  RETURN QUERY
  SELECT 
    CASE 
      WHEN dlt.used_at IS NOT NULL THEN FALSE
      WHEN dlt.expires_at < NOW() THEN FALSE
      ELSE TRUE
    END as success,
    dlt.registration_id,
    dlt.dimension,
    dlt.admin_email,
    dlt.notes,
    CASE 
      WHEN dlt.used_at IS NOT NULL THEN 'Token has already been used'
      WHEN dlt.expires_at < NOW() THEN 'Token has expired'
      ELSE 'Token is valid'
    END as message
  FROM deep_link_tokens dlt
  WHERE dlt.token = p_token;
  
  -- If no token found, return failure
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      FALSE as success,
      NULL::UUID as registration_id,
      NULL::TEXT as dimension,
      NULL::TEXT as admin_email,
      NULL::TEXT as notes,
      'Token not found' as message;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_deep_link_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_deep_link_token_by_id"("p_token_id" "uuid") RETURNS TABLE("success" boolean, "registration_id" "uuid", "dimension" "text", "admin_email" "text", "notes" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if token exists and is not expired
  RETURN QUERY
  SELECT 
    CASE 
      WHEN dlt.used_at IS NOT NULL THEN FALSE
      WHEN dlt.expires_at < NOW() THEN FALSE
      ELSE TRUE
    END as success,
    dlt.registration_id,
    dlt.dimension,
    dlt.admin_email,
    dlt.notes,
    CASE 
      WHEN dlt.used_at IS NOT NULL THEN 'Token has already been used'
      WHEN dlt.expires_at < NOW() THEN 'Token has expired'
      ELSE 'Token is valid'
    END as message
  FROM deep_link_tokens dlt
  WHERE dlt.token_id = p_token_id;
  
  -- If no token found, return failure
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      FALSE as success,
      NULL::UUID as registration_id,
      NULL::TEXT as dimension,
      NULL::TEXT as admin_email,
      NULL::TEXT as notes,
      'Token not found' as message;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_deep_link_token_by_id"("p_token_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_review_checklist"("checklist" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if all required dimensions exist
  IF NOT (checklist ? 'payment' AND checklist ? 'profile' AND checklist ? 'tcc') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if each dimension has required fields
  IF NOT (
    checklist->'payment' ? 'status' AND
    checklist->'profile' ? 'status' AND
    checklist->'tcc' ? 'status'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if status values are valid
  IF NOT (
    checklist->'payment'->>'status' IN ('pending', 'needs_update', 'passed') AND
    checklist->'profile'->>'status' IN ('pending', 'needs_update', 'passed') AND
    checklist->'tcc'->>'status' IN ('pending', 'needs_update', 'passed')
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_review_checklist"("checklist" "jsonb") OWNER TO "postgres";

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
    "after" "jsonb",
    "before" "jsonb"
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "extensions"."citext" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "invited_by_admin_id" "uuid" NOT NULL,
    "accepted_admin_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "admin_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."admin_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_invitations" IS 'Admin invitation system for onboarding new administrators';



COMMENT ON COLUMN "public"."admin_invitations"."email" IS 'Email address of the invited admin (case-insensitive)';



COMMENT ON COLUMN "public"."admin_invitations"."token" IS 'Cryptographically secure token for invitation acceptance';



COMMENT ON COLUMN "public"."admin_invitations"."expires_at" IS 'Expiration timestamp (48 hours from creation)';



COMMENT ON COLUMN "public"."admin_invitations"."invited_by_admin_id" IS 'ID of the admin who sent the invitation';



COMMENT ON COLUMN "public"."admin_invitations"."accepted_admin_id" IS 'ID of the admin who accepted the invitation (set on acceptance)';



COMMENT ON COLUMN "public"."admin_invitations"."status" IS 'Current status of the invitation (pending, accepted, expired, revoked)';



COMMENT ON COLUMN "public"."admin_invitations"."metadata" IS 'Additional metadata for future extensibility';



COMMENT ON COLUMN "public"."admin_invitations"."roles" IS 'Array of role slugs assigned to the invitation';



CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "business_roles" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "admin_users_business_roles_check" CHECK (("business_roles" <@ ARRAY['user_profile'::"text", 'payment_slip'::"text", 'tcc_card'::"text"])),
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))),
    CONSTRAINT "admin_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_users" IS 'Admin users table - business_roles column removed on 2025-01-27';



COMMENT ON COLUMN "public"."admin_users"."status" IS 'Admin user status (active, suspended) for RBAC filtering';



CREATE TABLE IF NOT EXISTS "public"."deep_link_token_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_id" "uuid",
    "event_type" "text" NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "dimension" "text" NOT NULL,
    "admin_email" "text",
    "user_email" "text",
    "ip_address" "text",
    "user_agent" "text",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "deep_link_token_audit_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'used'::"text", 'expired'::"text", 'invalid_attempt'::"text"])))
);


ALTER TABLE "public"."deep_link_token_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deep_link_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_hash" "text" NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "dimension" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text" NOT NULL,
    "used_by" "text",
    "ip_address" "text",
    "user_agent" "text",
    "token_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_salt" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "deep_link_tokens_dimension_check" CHECK (("dimension" = ANY (ARRAY['payment'::"text", 'profile'::"text", 'tcc'::"text"])))
);


ALTER TABLE "public"."deep_link_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template" "text" NOT NULL,
    "to_email" "text" NOT NULL,
    "to_name" "text",
    "subject" "text",
    "payload" "jsonb" NOT NULL,
    "status" "public"."email_status" DEFAULT 'pending'::"public"."email_status" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 5 NOT NULL,
    "last_error" "text",
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_attempt" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "dedupe_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "idempotency_key" "text",
    "last_attempt_at" timestamp with time zone,
    "html_content" "text" NOT NULL,
    "text_content" "text" NOT NULL,
    "error_message" "text",
    CONSTRAINT "email_outbox_template_check" CHECK (("template" = ANY (ARRAY['tracking'::"text", 'tracking_code'::"text", 'update-payment'::"text", 'update-info'::"text", 'update-tcc'::"text", 'approval-badge'::"text", 'rejection'::"text", 'request_update'::"text", 'request_update_payment'::"text", 'admin_invite'::"text"])))
);


ALTER TABLE "public"."email_outbox" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_outbox" IS 'Email outbox for storing test emails sent by TestEmailProvider';



COMMENT ON COLUMN "public"."email_outbox"."id" IS 'Unique message ID generated by the email provider';



COMMENT ON COLUMN "public"."email_outbox"."template" IS 'Template identifier (e.g., admin.invitation)';



COMMENT ON COLUMN "public"."email_outbox"."to_email" IS 'Recipient email address';



COMMENT ON COLUMN "public"."email_outbox"."subject" IS 'Email subject line';



COMMENT ON COLUMN "public"."email_outbox"."payload" IS 'JSON payload with template variables';



COMMENT ON COLUMN "public"."email_outbox"."status" IS 'Email status (sent, failed, pending)';



COMMENT ON COLUMN "public"."email_outbox"."sent_at" IS 'Timestamp when email was sent (if different from created_at)';



COMMENT ON COLUMN "public"."email_outbox"."created_at" IS 'Timestamp when email was created';



COMMENT ON COLUMN "public"."email_outbox"."idempotency_key" IS 'Unique key for idempotent email processing to prevent duplicate sends';



COMMENT ON COLUMN "public"."email_outbox"."html_content" IS 'HTML content of the email';



COMMENT ON COLUMN "public"."email_outbox"."text_content" IS 'Plain text content of the email';



COMMENT ON COLUMN "public"."email_outbox"."error_message" IS 'Error message if email sending failed';



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


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" character varying(50) NOT NULL,
    "title" character varying(10) NOT NULL,
    "first_name" character varying(50) NOT NULL,
    "last_name" character varying(50) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(15) NOT NULL,
    "company_name" character varying(100) NOT NULL,
    "business_type" character varying(50) NOT NULL,
    "yec_province" character varying(50) NOT NULL,
    "status" "text",
    "update_reason" "text",
    "payment_review_status" "text" NOT NULL,
    "profile_review_status" "text" NOT NULL,
    "tcc_review_status" "text" NOT NULL,
    "price_applied" numeric(12,2),
    "currency" "text" DEFAULT 'THB'::"text",
    "selected_package_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "review_checklist" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "rejected_reason" "text",
    "form_data" "jsonb",
    "badge_url" "text",
    "business_type_other" character varying(50),
    "chamber_card_url" "text",
    "email_sent" boolean DEFAULT false,
    "email_sent_at" timestamp with time zone,
    "external_hotel_name" character varying(100),
    "hotel_choice" character varying(20) NOT NULL,
    "ip_address" "inet",
    "line_id" character varying(30) NOT NULL,
    "nickname" character varying(30) NOT NULL,
    "payment_slip_url" "text",
    "profile_image_url" "text",
    "room_type" character varying(20),
    "roommate_info" character varying(100),
    "roommate_phone" character varying(15),
    "travel_type" character varying(20) NOT NULL,
    "user_agent" "text",
    CONSTRAINT "chk_business_type" CHECK ((("business_type")::"text" = ANY ((ARRAY['technology'::character varying, 'finance'::character varying, 'healthcare'::character varying, 'education'::character varying, 'retail'::character varying, 'manufacturing'::character varying, 'construction'::character varying, 'real-estate'::character varying, 'tourism'::character varying, 'food-beverage'::character varying, 'fashion'::character varying, 'automotive'::character varying, 'energy'::character varying, 'logistics'::character varying, 'media'::character varying, 'consulting'::character varying, 'legal'::character varying, 'marketing'::character varying, 'agriculture'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "chk_email_format" CHECK ((("email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "chk_external_hotel_required_when_out_quota" CHECK (((("hotel_choice")::"text" = 'in-quota'::"text") OR ((("hotel_choice")::"text" = 'out-of-quota'::"text") AND ("external_hotel_name" IS NOT NULL) AND ("length"(("external_hotel_name")::"text") > 0)))),
    CONSTRAINT "chk_hotel_choice" CHECK ((("hotel_choice")::"text" = ANY ((ARRAY['in-quota'::character varying, 'out-of-quota'::character varying])::"text"[]))),
    CONSTRAINT "chk_line_id_format" CHECK ((("line_id")::"text" ~* '^[a-zA-Z0-9._-]+$'::"text")),
    CONSTRAINT "chk_payment_review_status" CHECK (("payment_review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "chk_phone_format" CHECK ((("phone")::"text" ~* '^[0-9+\-\s()]+$'::"text")),
    CONSTRAINT "chk_profile_review_status" CHECK (("profile_review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "chk_review_checklist_structure" CHECK (("jsonb_typeof"("review_checklist") = 'object'::"text")),
    CONSTRAINT "chk_room_type" CHECK ((("room_type")::"text" = ANY ((ARRAY['single'::character varying, 'double'::character varying, 'twin'::character varying])::"text"[]))),
    CONSTRAINT "chk_room_type_required_when_in_quota" CHECK (((("hotel_choice")::"text" = 'out-of-quota'::"text") OR ((("hotel_choice")::"text" = 'in-quota'::"text") AND ("room_type" IS NOT NULL)))),
    CONSTRAINT "chk_roommate_info_required_for_double" CHECK (((("room_type")::"text" <> 'double'::"text") OR ((("room_type")::"text" = 'double'::"text") AND ("roommate_info" IS NOT NULL) AND ("length"(("roommate_info")::"text") > 0)))),
    CONSTRAINT "chk_roommate_phone_required_for_double" CHECK (((("room_type")::"text" <> 'double'::"text") OR ((("room_type")::"text" = 'double'::"text") AND ("roommate_phone" IS NOT NULL) AND ("length"(("roommate_phone")::"text") > 0)))),
    CONSTRAINT "chk_status" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text", 'waiting_for_review'::"text", 'waiting_for_update_payment'::"text", 'waiting_for_update_info'::"text", 'waiting_for_update_tcc'::"text"]))),
    CONSTRAINT "chk_tcc_review_status" CHECK (("tcc_review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "chk_title" CHECK ((("title")::"text" = ANY ((ARRAY['นาย'::character varying, 'นาง'::character varying, 'นางสาว'::character varying, 'Mr.'::character varying, 'Mrs.'::character varying, 'Ms.'::character varying])::"text"[]))),
    CONSTRAINT "chk_travel_type" CHECK ((("travel_type")::"text" = ANY ((ARRAY['private-car'::character varying, 'van'::character varying])::"text"[]))),
    CONSTRAINT "chk_update_reason" CHECK ((("update_reason" IS NULL) OR ("length"("update_reason") > 0)))
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."admin_invitations"
    ADD CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_invitations"
    ADD CONSTRAINT "admin_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deep_link_token_audit"
    ADD CONSTRAINT "deep_link_token_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deep_link_tokens"
    ADD CONSTRAINT "deep_link_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deep_link_tokens"
    ADD CONSTRAINT "deep_link_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id");



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



CREATE UNIQUE INDEX "admin_inv_unique_pending" ON "public"."admin_invitations" USING "btree" ("email") WHERE ("status" = 'pending'::"text");



COMMENT ON INDEX "public"."admin_inv_unique_pending" IS 'Prevents duplicate pending invitations for the same email address';



CREATE UNIQUE INDEX "email_outbox_dedupe_key_uidx" ON "public"."email_outbox" USING "btree" ("dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE UNIQUE INDEX "email_outbox_idempotency_key_uidx" ON "public"."email_outbox" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_admin_audit_logs_admin_email" ON "public"."admin_audit_logs" USING "btree" ("admin_email");



CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_registration_id" ON "public"."admin_audit_logs" USING "btree" ("registration_id");



CREATE INDEX "idx_admin_inv_email" ON "public"."admin_invitations" USING "btree" ("email");



CREATE INDEX "idx_admin_inv_expires" ON "public"."admin_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_inv_status" ON "public"."admin_invitations" USING "btree" ("status");



CREATE INDEX "idx_admin_invitations_email" ON "public"."admin_invitations" USING "btree" ("email");



CREATE INDEX "idx_admin_invitations_expires_at" ON "public"."admin_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_invitations_status" ON "public"."admin_invitations" USING "btree" ("status");



CREATE INDEX "idx_admin_invitations_token" ON "public"."admin_invitations" USING "btree" ("token");



CREATE INDEX "idx_admin_users_business_roles" ON "public"."admin_users" USING "gin" ("business_roles");



CREATE UNIQUE INDEX "idx_admin_users_email_unique" ON "public"."admin_users" USING "btree" ("email");



CREATE INDEX "idx_admin_users_has_payment_slip" ON "public"."admin_users" USING "btree" ((("business_roles" @> ARRAY['payment_slip'::"text"])));



CREATE INDEX "idx_admin_users_has_tcc_card" ON "public"."admin_users" USING "btree" ((("business_roles" @> ARRAY['tcc_card'::"text"])));



CREATE INDEX "idx_admin_users_has_user_profile" ON "public"."admin_users" USING "btree" ((("business_roles" @> ARRAY['user_profile'::"text"])));



CREATE INDEX "idx_admin_users_role" ON "public"."admin_users" USING "btree" ("role");



CREATE INDEX "idx_admin_users_role_status" ON "public"."admin_users" USING "btree" ("role", "status");



CREATE INDEX "idx_admin_users_status" ON "public"."admin_users" USING "btree" ("status");



CREATE INDEX "idx_audit_admin_email" ON "public"."admin_audit_logs" USING "btree" ("admin_email");



CREATE INDEX "idx_audit_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_registration_id" ON "public"."admin_audit_logs" USING "btree" ("registration_id");



CREATE INDEX "idx_deep_link_token_audit_created_at" ON "public"."deep_link_token_audit" USING "btree" ("created_at");



CREATE INDEX "idx_deep_link_token_audit_event_type" ON "public"."deep_link_token_audit" USING "btree" ("event_type");



CREATE INDEX "idx_deep_link_token_audit_registration_id" ON "public"."deep_link_token_audit" USING "btree" ("registration_id");



CREATE INDEX "idx_deep_link_token_audit_token_id" ON "public"."deep_link_token_audit" USING "btree" ("token_id");



CREATE INDEX "idx_deep_link_tokens_expires_at" ON "public"."deep_link_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_deep_link_tokens_registration_id" ON "public"."deep_link_tokens" USING "btree" ("registration_id");



CREATE INDEX "idx_deep_link_tokens_token_hash" ON "public"."deep_link_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_deep_link_tokens_token_id" ON "public"."deep_link_tokens" USING "btree" ("token_id");



CREATE INDEX "idx_deep_link_tokens_used_at" ON "public"."deep_link_tokens" USING "btree" ("used_at");



CREATE INDEX "idx_email_outbox_created_at" ON "public"."email_outbox" USING "btree" ("created_at");



CREATE INDEX "idx_email_outbox_idempotency_key" ON "public"."email_outbox" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_email_outbox_next_attempt" ON "public"."email_outbox" USING "btree" ("next_attempt");



CREATE INDEX "idx_email_outbox_sent_at" ON "public"."email_outbox" USING "btree" ("sent_at");



CREATE INDEX "idx_email_outbox_status" ON "public"."email_outbox" USING "btree" ("status");



CREATE INDEX "idx_email_outbox_status_scheduled" ON "public"."email_outbox" USING "btree" ("status", "scheduled_at");



CREATE INDEX "idx_email_outbox_status_sent_at" ON "public"."email_outbox" USING "btree" ("status", "sent_at");



CREATE INDEX "idx_email_outbox_template" ON "public"."email_outbox" USING "btree" ("template");



CREATE INDEX "idx_email_outbox_template_to_email" ON "public"."email_outbox" USING "btree" ("template", "to_email");



CREATE INDEX "idx_email_outbox_to_email" ON "public"."email_outbox" USING "btree" ("to_email");



CREATE INDEX "idx_registrations_created_at" ON "public"."registrations" USING "btree" ("created_at");



CREATE INDEX "idx_registrations_email" ON "public"."registrations" USING "btree" ("email");



CREATE INDEX "idx_registrations_payment_review_status" ON "public"."registrations" USING "btree" ("payment_review_status");



CREATE INDEX "idx_registrations_phone" ON "public"."registrations" USING "btree" ("phone");



CREATE INDEX "idx_registrations_profile_review_status" ON "public"."registrations" USING "btree" ("profile_review_status");



CREATE INDEX "idx_registrations_registration_id" ON "public"."registrations" USING "btree" ("registration_id");



CREATE INDEX "idx_registrations_status" ON "public"."registrations" USING "btree" ("status");



CREATE INDEX "idx_registrations_tcc_review_status" ON "public"."registrations" USING "btree" ("tcc_review_status");



CREATE UNIQUE INDEX "ux_event_settings_singleton" ON "public"."event_settings" USING "btree" ((true));



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."email_outbox" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_admin_users_updated_at" BEFORE UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_admin_invitations_updated_at" BEFORE UPDATE ON "public"."admin_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_admin_invitations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_deep_link_token_creation" AFTER INSERT ON "public"."deep_link_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."log_deep_link_token_creation"();



CREATE OR REPLACE TRIGGER "trigger_log_deep_link_token_usage" AFTER UPDATE ON "public"."deep_link_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."log_deep_link_token_usage"();



CREATE OR REPLACE TRIGGER "trigger_try_approve_on_checklist_update" BEFORE UPDATE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_try_approve_on_checklist_update"();



CREATE OR REPLACE TRIGGER "trigger_update_registration_status" BEFORE UPDATE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_registration_status"();



CREATE OR REPLACE TRIGGER "update_admin_users_updated_at" BEFORE UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_deep_link_tokens_updated_at" BEFORE UPDATE ON "public"."deep_link_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_settings_updated_at" BEFORE UPDATE ON "public"."event_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_registrations_updated_at" BEFORE UPDATE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_invitations"
    ADD CONSTRAINT "admin_invitations_accepted_admin_id_fkey" FOREIGN KEY ("accepted_admin_id") REFERENCES "public"."admin_users"("id");



ALTER TABLE ONLY "public"."admin_invitations"
    ADD CONSTRAINT "admin_invitations_invited_by_admin_id_fkey" FOREIGN KEY ("invited_by_admin_id") REFERENCES "public"."admin_users"("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can access all audit logs" ON "audit"."access_log" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can access all audit logs" ON "audit"."event_log" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can access all audit logs" ON "audit"."access_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can access all audit logs" ON "audit"."event_log" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "audit"."access_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "audit"."event_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admin users can access all registrations" ON "public"."registrations" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."id" = "auth"."uid"()) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin users can insert event settings" ON "public"."event_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Admin users can update event settings" ON "public"."event_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Admin users can view admin users" ON "public"."admin_users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "admin_users_1"
  WHERE (("admin_users_1"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users_1"."is_active" = true)))));



CREATE POLICY "Admin users can view audit logs" ON "public"."admin_audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin users can view deep link token audit" ON "public"."deep_link_token_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin users can view deep link tokens" ON "public"."deep_link_tokens" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin users can view email outbox" ON "public"."email_outbox" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admin users can view event settings" ON "public"."event_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")))));



CREATE POLICY "Public can accept invitations by token" ON "public"."admin_invitations" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Service role can insert audit logs" ON "public"."admin_audit_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert deep link token audit" ON "public"."deep_link_token_audit" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage admin invitations" ON "public"."admin_invitations" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage admin users" ON "public"."admin_users" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage deep link tokens" ON "public"."deep_link_tokens" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage email outbox" ON "public"."email_outbox" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage event settings" ON "public"."event_settings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Super admins can delete admin users" ON "public"."admin_users" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can insert admin users" ON "public"."admin_users" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can manage admin invitations" ON "public"."admin_invitations" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true) AND ("au"."status" = 'active'::"text")))));



CREATE POLICY "Super admins can manage admin users" ON "public"."admin_users" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "admin_users_1"
  WHERE (("admin_users_1"."email" = (("current_setting"('request.jwt.claims'::"text", true))::json ->> 'email'::"text")) AND ("admin_users_1"."role" = 'super_admin'::"text") AND ("admin_users_1"."is_active" = true)))));



CREATE POLICY "Super admins can update admin users" ON "public"."admin_users" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can view all admin users" ON "public"."admin_users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true)))));



CREATE POLICY "Super admins can view email outbox" ON "public"."email_outbox" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "auth"."uid"()) AND ("au"."role" = 'super_admin'::"text") AND ("au"."is_active" = true) AND ("au"."status" = 'active'::"text")))));



CREATE POLICY "Users can access their own registrations" ON "public"."registrations" USING ((("email")::"text" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Users can view own admin record" ON "public"."admin_users" FOR SELECT USING ((("id" = "auth"."uid"()) AND ("is_active" = true)));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deep_link_token_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deep_link_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































































































































GRANT ALL ON FUNCTION "public"."accept_admin_invitation"("p_token" "text", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_admin_invitation"("p_token" "text", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_admin_invitation"("p_token" "text", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_has_business_role"("admin_email" "text", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_has_business_role"("admin_email" "text", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_has_business_role"("admin_email" "text", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_admin_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_admin_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_admin_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_deep_link_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_deep_link_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_deep_link_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_email_outbox"("older_than_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_outbox"("older_than_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_outbox"("older_than_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text", "p_ttl_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text", "p_ttl_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_deep_link_token"("p_registration_id" "uuid", "p_dimension" "text", "p_admin_email" "text", "p_notes" "text", "p_ttl_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."discover_fk_references"("target_table" "text", "target_column" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."discover_fk_references"("target_table" "text", "target_column" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."discover_fk_references"("target_table" "text", "target_column" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_cleanup_old_emails"("days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_cleanup_old_emails"("days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_cleanup_old_emails"("days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_dispatch_email_batch"("batch_size" integer, "dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_dispatch_email_batch"("batch_size" integer, "dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_dispatch_email_batch"("batch_size" integer, "dry_run" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_dispatch_single_email"("p_email_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_dispatch_single_email"("p_email_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_dispatch_single_email"("p_email_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_payload" "jsonb", "p_idempotency_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_payload" "jsonb", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_payload" "jsonb", "p_idempotency_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_subject" "text", "p_payload" "jsonb", "p_dedupe_key" "text", "p_scheduled_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_subject" "text", "p_payload" "jsonb", "p_dedupe_key" "text", "p_scheduled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_enqueue_email"("p_template" "text", "p_to_email" "text", "p_subject" "text", "p_payload" "jsonb", "p_dedupe_key" "text", "p_scheduled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_outbox_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_outbox_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_outbox_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_get_pending_emails"("p_batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_get_pending_emails"("p_batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_get_pending_emails"("p_batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_mark_email_failed"("p_id" "uuid", "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_mark_email_failed"("p_id" "uuid", "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_mark_email_failed"("p_id" "uuid", "p_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_mark_email_sent"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_mark_email_sent"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_mark_email_sent"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_render_email_template"("p_template" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_render_email_template"("p_template" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_render_email_template"("p_template" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_request_update"("reg_id" "uuid", "dimension" "text", "reviewer_id" "text", "notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_request_update"("reg_id" "uuid", "dimension" "text", "reviewer_id" "text", "notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_request_update"("reg_id" "uuid", "dimension" "text", "reviewer_id" "text", "notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_retry_failed_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_retry_failed_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_retry_failed_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_try_approve"("reg_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_try_approve"("reg_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_try_approve"("reg_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_user_resubmit"("reg_id" "uuid", "payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_user_resubmit"("reg_id" "uuid", "payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_user_resubmit"("reg_id" "uuid", "payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_admin_invitation_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_admin_invitation_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_admin_invitation_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_deep_link_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_deep_link_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_deep_link_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_secure_deep_link_token"("reg_id" "uuid", "dimension" "text", "admin_email" "text", "ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_secure_deep_link_token"("reg_id" "uuid", "dimension" "text", "admin_email" "text", "ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_secure_deep_link_token"("reg_id" "uuid", "dimension" "text", "admin_email" "text", "ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_simple_deep_link_token"("admin_email" "text", "dimension" "text", "reg_id" "uuid", "ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_simple_deep_link_token"("admin_email" "text", "dimension" "text", "reg_id" "uuid", "ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_simple_deep_link_token"("admin_email" "text", "dimension" "text", "reg_id" "uuid", "ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_business_roles"("admin_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_business_roles"("admin_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_business_roles"("admin_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_invitation_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_invitation_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_invitation_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_checklist_summary"("reg_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_checklist_summary"("reg_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_checklist_summary"("reg_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_deep_link_token_stats"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_deep_link_token_stats"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_deep_link_token_stats"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_outbox_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_outbox_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_outbox_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_price_packages"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_price_packages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_price_packages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_registration_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_registration_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_registration_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_registration_open"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_registration_open"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_registration_open"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("action_param" "text", "registration_id_param" "text", "before_data" "jsonb", "after_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("action_param" "text", "registration_id_param" "text", "before_data" "jsonb", "after_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("action_param" "text", "registration_id_param" "text", "before_data" "jsonb", "after_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_deep_link_token_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_deep_link_token_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_deep_link_token_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_deep_link_token_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_deep_link_token_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_deep_link_token_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_deep_link_token_used"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_deep_link_token_used"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_deep_link_token_used"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_deep_link_token_used_by_id"("p_token_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_deep_link_token_used_by_id"("p_token_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_deep_link_token_used_by_id"("p_token_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."revoke_admin_invitation"("p_invitation_id" "uuid", "p_revoked_by_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_admin_invitation"("p_invitation_id" "uuid", "p_revoked_by_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_admin_invitation"("p_invitation_id" "uuid", "p_revoked_by_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_try_approve_on_checklist_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_try_approve_on_checklist_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_try_approve_on_checklist_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_invitations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_invitations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_invitations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_last_login"("admin_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_last_login"("admin_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_last_login"("admin_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_registration_review_status"("registration_id_param" "text", "track_param" "text", "status_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_registration_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_registration_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_registration_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_admin_invitation_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_admin_invitation_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_admin_invitation_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_and_consume_deep_link_token"("token" "text", "reg_id" "uuid", "user_email" "text", "ip_address" "text", "user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_and_consume_deep_link_token"("token" "text", "reg_id" "uuid", "user_email" "text", "ip_address" "text", "user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_and_consume_deep_link_token"("token" "text", "reg_id" "uuid", "user_email" "text", "ip_address" "text", "user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_deep_link_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_deep_link_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_deep_link_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_deep_link_token_by_id"("p_token_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_deep_link_token_by_id"("p_token_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_deep_link_token_by_id"("p_token_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_review_checklist"("checklist" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_review_checklist"("checklist" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_review_checklist"("checklist" "jsonb") TO "service_role";
























GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_invitations" TO "anon";
GRANT ALL ON TABLE "public"."admin_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."deep_link_token_audit" TO "anon";
GRANT ALL ON TABLE "public"."deep_link_token_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."deep_link_token_audit" TO "service_role";



GRANT ALL ON TABLE "public"."deep_link_tokens" TO "anon";
GRANT ALL ON TABLE "public"."deep_link_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."deep_link_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."email_outbox" TO "anon";
GRANT ALL ON TABLE "public"."email_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."email_outbox" TO "service_role";



GRANT ALL ON TABLE "public"."event_settings" TO "anon";
GRANT ALL ON TABLE "public"."event_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."event_settings" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



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
