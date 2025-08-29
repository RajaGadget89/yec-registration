import { NextRequest, NextResponse } from "next/server";
import {
  getRolesForEmail,
  getUsersWithRole,
  getRoleStats,
} from "../../../lib/rbac";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      {
        error: "Email parameter required",
        usage: "/api/test/rbac-debug?email=user@example.com",
      },
      { status: 400 },
    );
  }

  const roles = getRolesForEmail(email);
  const roleStats = getRoleStats();

  return NextResponse.json({
    email,
    roles: Array.from(roles),
    roleStats,
    superAdmins: getUsersWithRole("super_admin"),
    paymentAdmins: getUsersWithRole("admin_payment"),
    profileAdmins: getUsersWithRole("admin_profile"),
    tccAdmins: getUsersWithRole("admin_tcc"),
    envVars: {
      ADMIN_SUPER_EMAILS: process.env.ADMIN_SUPER_EMAILS,
      ADMIN_PAYMENT_EMAILS: process.env.ADMIN_PAYMENT_EMAILS,
      ADMIN_PROFILE_EMAILS: process.env.ADMIN_PROFILE_EMAILS,
      ADMIN_TCC_EMAILS: process.env.ADMIN_TCC_EMAILS,
    },
  });
}
