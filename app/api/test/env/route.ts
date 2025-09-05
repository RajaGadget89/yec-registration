import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.SUPABASE_URL?.substring(0, 50) + "...",
    nextPublicSupabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
    features: {
      adminJobAssignment: process.env.FEATURES_ADMIN_JOB_ASSIGNMENT,
      adminManagement: process.env.FEATURES_ADMIN_MANAGEMENT,
    },
    nodeEnv: process.env.NODE_ENV,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}
