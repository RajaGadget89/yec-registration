export const dynamic = "force-dynamic";

export default function ApprovedStatusPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id;

  return (
    <main className="p-6">
      <h1>Registration Status (Test-Only)</h1>
      <div
        aria-label="Status Badge"
        className="mt-4 inline-block rounded px-3 py-1 border bg-green-100 text-green-800"
      >
        approved
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Registration ID: {id || "N/A"}
      </p>
    </main>
  );
}
