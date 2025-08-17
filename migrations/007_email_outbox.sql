-- migrations/004_email_outbox.sql
-- Email Outbox (staging & production)

begin;

-- ใช้ gen_random_uuid()
create extension if not exists pgcrypto;

-- สถานะหลักของอีเมลในคิว
do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type email_status as enum ('pending','processing','sent','failed','blocked');
  end if;
end$$;

-- ตารางคิวอีเมล
create table if not exists public.email_outbox (
  id               uuid primary key default gen_random_uuid(),
  template         text,                    -- ชื่อเทมเพลต/ประเภท
  to_email         text      not null,      -- ผู้รับ
  to_name          text,
  subject          text,
  payload          jsonb     not null default '{}'::jsonb,  -- ข้อมูลสำหรับเทมเพลต
  status           email_status not null default 'pending',  -- สถานะคิว
  attempts         int       not null default 0,             -- ส่งไปแล้วกี่ครั้ง
  max_attempts     int       not null default 5,             -- เพดานรีทราย
  last_error       text,                                     
  scheduled_at     timestamptz not null default now(),       -- เวลา earliest ที่อนุญาตให้ส่ง
  next_attempt_at  timestamptz,                               -- ใช้ทำ backoff
  sent_at          timestamptz,                              
  dedupe_key       text,                                      -- ใช้ป้องกันซ้ำ (idempotency)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ดัชนีที่จำเป็น
create unique index if not exists email_outbox_dedupe_key_uidx
  on public.email_outbox (dedupe_key) where dedupe_key is not null;

create index if not exists email_outbox_status_idx
  on public.email_outbox (status);

create index if not exists email_outbox_sched_idx
  on public.email_outbox (scheduled_at);

create index if not exists email_outbox_next_attempt_idx
  on public.email_outbox (next_attempt_at);

-- อัปเดต updated_at อัตโนมัติ
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists set_updated_at on public.email_outbox;
create trigger set_updated_at
before update on public.email_outbox
for each row execute function public.tg_set_updated_at();

-- ฟังก์ชัน enqueue ที่โค้ดสามารถเรียกใช้ได้ทันที
create or replace function public.fn_enqueue_email(
  p_template     text,
  p_to_email     text,
  p_subject      text,
  p_payload      jsonb default '{}'::jsonb,
  p_dedupe_key   text  default null,
  p_scheduled_at timestamptz default now()
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  -- ป้องกันรายการซ้ำตาม dedupe_key (ถ้าระบุ)
  if p_dedupe_key is not null then
    select id into v_id from public.email_outbox where dedupe_key = p_dedupe_key;
    if found then
      return v_id;
    end if;
  end if;

  insert into public.email_outbox(template, to_email, subject, payload, dedupe_key, scheduled_at)
  values (p_template, p_to_email, p_subject, coalesce(p_payload, '{}'), p_dedupe_key, p_scheduled_at)
  returning id into v_id;

  return v_id;
end$$;

-- เปิด RLS และ “ไม่ออก policy” เพื่อให้เฉพาะ service role เข้าถึง (bypass RLS)
alter table public.email_outbox enable row level security;

commit;

