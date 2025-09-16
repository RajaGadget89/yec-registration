revoke delete on table "audit"."access_log" from "authenticated";

revoke insert on table "audit"."access_log" from "authenticated";

revoke references on table "audit"."access_log" from "authenticated";

revoke select on table "audit"."access_log" from "authenticated";

revoke trigger on table "audit"."access_log" from "authenticated";

revoke truncate on table "audit"."access_log" from "authenticated";

revoke update on table "audit"."access_log" from "authenticated";

revoke delete on table "audit"."access_log" from "service_role";

revoke insert on table "audit"."access_log" from "service_role";

revoke references on table "audit"."access_log" from "service_role";

revoke select on table "audit"."access_log" from "service_role";

revoke trigger on table "audit"."access_log" from "service_role";

revoke truncate on table "audit"."access_log" from "service_role";

revoke update on table "audit"."access_log" from "service_role";

revoke delete on table "audit"."event_log" from "authenticated";

revoke insert on table "audit"."event_log" from "authenticated";

revoke references on table "audit"."event_log" from "authenticated";

revoke select on table "audit"."event_log" from "authenticated";

revoke trigger on table "audit"."event_log" from "authenticated";

revoke truncate on table "audit"."event_log" from "authenticated";

revoke update on table "audit"."event_log" from "authenticated";

revoke delete on table "audit"."event_log" from "service_role";

revoke insert on table "audit"."event_log" from "service_role";

revoke references on table "audit"."event_log" from "service_role";

revoke select on table "audit"."event_log" from "service_role";

revoke trigger on table "audit"."event_log" from "service_role";

revoke truncate on table "audit"."event_log" from "service_role";

revoke update on table "audit"."event_log" from "service_role";

drop policy "Admin users can update registrations" on "public"."registrations";

drop policy "Admin users can view all registrations" on "public"."registrations";

drop policy "Allow Admin Read" on "public"."registrations";

drop policy "Allow Public Insert" on "public"."registrations";

drop policy "Service role can manage registrations" on "public"."registrations";

drop policy "Users can insert registrations" on "public"."registrations";

alter table "public"."registrations" drop constraint "check_review_checklist_structure";

alter table "public"."registrations" drop constraint "chk_review_statuses";

alter table "public"."registrations" drop constraint "external_hotel_required_when_out_quota";

alter table "public"."registrations" drop constraint "registrations_email_check";

alter table "public"."registrations" drop constraint "registrations_hotel_choice_check";

alter table "public"."registrations" drop constraint "registrations_line_id_check";

alter table "public"."registrations" drop constraint "registrations_phone_check";

alter table "public"."registrations" drop constraint "registrations_review_status_check";

alter table "public"."registrations" drop constraint "registrations_status_check";

alter table "public"."registrations" drop constraint "registrations_travel_type_check";

alter table "public"."registrations" drop constraint "room_type_required_when_in_quota";

alter table "public"."registrations" drop constraint "roommate_info_required_for_double";

alter table "public"."email_outbox" drop constraint "email_outbox_template_check";

alter table "public"."registrations" drop constraint "chk_status";

alter table "public"."registrations" drop constraint "chk_update_reason";

drop view if exists "public"."admin_registrations_view";

drop function if exists "public"."fn_enqueue_email"(p_template text, p_to_email text, p_subject text, p_payload jsonb, p_dedupe_key text, p_idempotency_key text, p_scheduled_at timestamp with time zone);

drop function if exists "public"."validate_admin_invitation_token"(p_token text);

drop index if exists "public"."idx_registrations_business_type";

drop index if exists "public"."idx_registrations_company_name";

drop index if exists "public"."idx_registrations_review_checklist";

drop index if exists "public"."idx_registrations_status_created_at";

drop index if exists "public"."idx_registrations_status_province";

drop index if exists "public"."idx_registrations_update_reason";

drop index if exists "public"."idx_registrations_yec_province";

drop extension if exists "pg_trgm";

CREATE INDEX idx_registrations_payment_review_status ON public.registrations USING btree (payment_review_status);

CREATE INDEX idx_registrations_phone ON public.registrations USING btree (phone);

CREATE INDEX idx_registrations_profile_review_status ON public.registrations USING btree (profile_review_status);

CREATE INDEX idx_registrations_registration_id ON public.registrations USING btree (registration_id);

CREATE INDEX idx_registrations_tcc_review_status ON public.registrations USING btree (tcc_review_status);

alter table "public"."registrations" add constraint "chk_business_type" CHECK (((business_type)::text = ANY ((ARRAY['technology'::character varying, 'finance'::character varying, 'healthcare'::character varying, 'education'::character varying, 'retail'::character varying, 'manufacturing'::character varying, 'construction'::character varying, 'real-estate'::character varying, 'tourism'::character varying, 'food-beverage'::character varying, 'fashion'::character varying, 'automotive'::character varying, 'energy'::character varying, 'logistics'::character varying, 'media'::character varying, 'consulting'::character varying, 'legal'::character varying, 'marketing'::character varying, 'agriculture'::character varying, 'other'::character varying])::text[]))) not valid;

alter table "public"."registrations" validate constraint "chk_business_type";

alter table "public"."registrations" add constraint "chk_email_format" CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)) not valid;

alter table "public"."registrations" validate constraint "chk_email_format";

alter table "public"."registrations" add constraint "chk_external_hotel_required_when_out_quota" CHECK ((((hotel_choice)::text = 'in-quota'::text) OR (((hotel_choice)::text = 'out-of-quota'::text) AND (external_hotel_name IS NOT NULL) AND (length((external_hotel_name)::text) > 0)))) not valid;

alter table "public"."registrations" validate constraint "chk_external_hotel_required_when_out_quota";

alter table "public"."registrations" add constraint "chk_hotel_choice" CHECK (((hotel_choice)::text = ANY ((ARRAY['in-quota'::character varying, 'out-of-quota'::character varying])::text[]))) not valid;

alter table "public"."registrations" validate constraint "chk_hotel_choice";

alter table "public"."registrations" add constraint "chk_line_id_format" CHECK (((line_id)::text ~* '^[a-zA-Z0-9._-]+$'::text)) not valid;

alter table "public"."registrations" validate constraint "chk_line_id_format";

alter table "public"."registrations" add constraint "chk_payment_review_status" CHECK ((payment_review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."registrations" validate constraint "chk_payment_review_status";

alter table "public"."registrations" add constraint "chk_phone_format" CHECK (((phone)::text ~* '^[0-9+\-\s()]+$'::text)) not valid;

alter table "public"."registrations" validate constraint "chk_phone_format";

alter table "public"."registrations" add constraint "chk_profile_review_status" CHECK ((profile_review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."registrations" validate constraint "chk_profile_review_status";

alter table "public"."registrations" add constraint "chk_review_checklist_structure" CHECK ((jsonb_typeof(review_checklist) = 'object'::text)) not valid;

alter table "public"."registrations" validate constraint "chk_review_checklist_structure";

alter table "public"."registrations" add constraint "chk_room_type" CHECK (((room_type)::text = ANY ((ARRAY['single'::character varying, 'double'::character varying, 'twin'::character varying])::text[]))) not valid;

alter table "public"."registrations" validate constraint "chk_room_type";

alter table "public"."registrations" add constraint "chk_room_type_required_when_in_quota" CHECK ((((hotel_choice)::text = 'out-of-quota'::text) OR (((hotel_choice)::text = 'in-quota'::text) AND (room_type IS NOT NULL)))) not valid;

alter table "public"."registrations" validate constraint "chk_room_type_required_when_in_quota";

alter table "public"."registrations" add constraint "chk_roommate_info_required_for_double" CHECK ((((room_type)::text <> 'double'::text) OR (((room_type)::text = 'double'::text) AND (roommate_info IS NOT NULL) AND (length((roommate_info)::text) > 0)))) not valid;

alter table "public"."registrations" validate constraint "chk_roommate_info_required_for_double";

alter table "public"."registrations" add constraint "chk_roommate_phone_required_for_double" CHECK ((((room_type)::text <> 'double'::text) OR (((room_type)::text = 'double'::text) AND (roommate_phone IS NOT NULL) AND (length((roommate_phone)::text) > 0)))) not valid;

alter table "public"."registrations" validate constraint "chk_roommate_phone_required_for_double";

alter table "public"."registrations" add constraint "chk_tcc_review_status" CHECK ((tcc_review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."registrations" validate constraint "chk_tcc_review_status";

alter table "public"."registrations" add constraint "chk_title" CHECK (((title)::text = ANY ((ARRAY['นาย'::character varying, 'นาง'::character varying, 'นางสาว'::character varying, 'Mr.'::character varying, 'Mrs.'::character varying, 'Ms.'::character varying])::text[]))) not valid;

alter table "public"."registrations" validate constraint "chk_title";

alter table "public"."registrations" add constraint "chk_travel_type" CHECK (((travel_type)::text = ANY ((ARRAY['private-car'::character varying, 'van'::character varying])::text[]))) not valid;

alter table "public"."registrations" validate constraint "chk_travel_type";

alter table "public"."email_outbox" add constraint "email_outbox_template_check" CHECK ((template = ANY (ARRAY['tracking'::text, 'tracking_code'::text, 'update-payment'::text, 'update-info'::text, 'update-tcc'::text, 'approval-badge'::text, 'rejection'::text, 'request_update'::text, 'request_update_payment'::text, 'admin_invite'::text]))) not valid;

alter table "public"."email_outbox" validate constraint "email_outbox_template_check";

alter table "public"."registrations" add constraint "chk_status" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'waiting_for_review'::text, 'waiting_for_update_payment'::text, 'waiting_for_update_info'::text, 'waiting_for_update_tcc'::text]))) not valid;

alter table "public"."registrations" validate constraint "chk_status";

alter table "public"."registrations" add constraint "chk_update_reason" CHECK (((update_reason IS NULL) OR (length(update_reason) > 0))) not valid;

alter table "public"."registrations" validate constraint "chk_update_reason";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_dispatch_email_batch(batch_size integer DEFAULT 50, dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fn_dispatch_single_email(p_email_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fn_enqueue_email(p_template text, p_to_email text, p_payload jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.fn_render_email_template(p_template text, p_payload jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_token text, p_admin_id uuid)
 RETURNS TABLE(success boolean, message text, admin_user_id uuid)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_registration_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validate_admin_invitation_token(p_token text)
 RETURNS TABLE(invitation_id uuid, email citext, status text, expires_at timestamp with time zone, invited_by_admin_id uuid)
 LANGUAGE plpgsql
AS $function$
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
$function$
;


  create policy "Admin users can access all registrations"
  on "public"."registrations"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));



  create policy "Users can access their own registrations"
  on "public"."registrations"
  as permissive
  for all
  to public
using (((email)::text = (auth.jwt() ->> 'email'::text)));



