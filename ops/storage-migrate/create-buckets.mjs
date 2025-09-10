import { createClient } from '@supabase/supabase-js'

// ตั้งค่า env เหล่านี้ก่อนรันจริง:
//   NEW_STAGING_URL      = https://<new-staging>.supabase.co
//   NEW_STAGING_SERVICE  = <service_role_key ของ staging ใหม่>

const NEW_URL = process.env.NEW_STAGING_URL
const NEW_KEY = process.env.NEW_STAGING_SERVICE

if (!NEW_URL || !NEW_KEY) {
  console.error('Please set NEW_STAGING_URL and NEW_STAGING_SERVICE env vars')
  process.exit(1)
}

const supa = createClient(NEW_URL, NEW_KEY)

// รายชื่อบักเก็ตจาก staging เก่า
const buckets = [
  { id: 'chamber-cards',  public: false },
  { id: 'payment-slips',  public: false },
  { id: 'profile-images', public: false },
  { id: 'yec-assets',     public: true  },
  { id: 'yec-badges',     public: true  },
]

for (const b of buckets) {
  const { error } = await supa.storage.createBucket(b.id, { public: b.public })
  if (error && !String(error.message || '').includes('already exists')) {
    console.error('createBucket error:', b.id, error.message || error)
    process.exit(1)
  }
  console.log('OK', b.id, 'public=', b.public)
}
