import { Suspense } from "react";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import FormApprovalReview from "./_components/FormApprovalReview";

interface FormApprovalPageProps {
  params: Promise<{
    formKey: string;
    id: string;
  }>;
}

export default async function FormApprovalPage({
  params,
}: FormApprovalPageProps) {
  const { formKey, id } = await params;

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Unauthorized
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to access the approval system.
            </p>
          </div>
        </div>
      );
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You don&apos;t have permission to access the approval system.
            </p>
          </div>
        </div>
      );
    }

    // Get form registration data
    const { data: registration, error: regError } = await supabase
      .from("form_registrations")
      .select("*")
      .eq("id", id)
      .eq("form_key", formKey)
      .single();

    if (regError || !registration) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Registration Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              The requested registration could not be found.
            </p>
          </div>
        </div>
      );
    }

    // Get form type configuration
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("name, config")
      .eq("form_key", formKey)
      .single();

    if (formError || !formType) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Form Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              The requested form could not be found.
            </p>
          </div>
        </div>
      );
    }

    // Log access
    await audit.logAccess({
      action: "view_registration",
      method: "GET",
      resource: `form_registration_${id}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        registration_id: id,
        registration_status: registration.status,
        actor: user.id,
      },
    });

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <FormApprovalReview
          registration={registration}
          formType={formType}
          formKey={formKey}
          approverId={user.id}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error in form approval page:", error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Error Loading Approval Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an error loading the approval page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
