import Link from "next/link";
import { cookies } from "next/headers";

export default async function ForbiddenPage() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("admin-email")?.value;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            403
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Forbidden
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Sorry, you don&apos;t have permission to access this page.
          </p>

          {userEmail && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Signed in as:</strong> {userEmail}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This email is not in the admin allowlist.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yec-primary hover:bg-yec-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yec-primary transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
