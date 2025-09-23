type ReviewDimensionStatus =
  | "passed"
  | "needs_update"
  | "rejected"
  | "pending"
  | string;

interface ReviewChecklistDimension {
  status?: ReviewDimensionStatus;
  notes?: string | null;
}

interface ReviewChecklist {
  payment?: ReviewChecklistDimension;
  profile?: ReviewChecklistDimension;
  tcc?: ReviewChecklistDimension;
  [key: string]: unknown;
}

export interface ScalarReviewStatuses {
  payment_review_status: "approved" | "pending" | "rejected";
  profile_review_status: "approved" | "pending" | "rejected";
  tcc_review_status: "approved" | "pending" | "rejected";
}

function mapJsonToScalar(
  status?: ReviewDimensionStatus,
): "approved" | "pending" | "rejected" {
  const normalized = (status || "pending").toString().toLowerCase();
  if (normalized === "passed" || normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  // Treat needs_update and anything else as pending
  return "pending";
}

export function deriveScalarStatuses(
  checklist: ReviewChecklist | null | undefined,
): ScalarReviewStatuses {
  const payment = mapJsonToScalar(
    checklist?.payment?.status as ReviewDimensionStatus,
  );
  const profile = mapJsonToScalar(
    checklist?.profile?.status as ReviewDimensionStatus,
  );
  const tcc = mapJsonToScalar(checklist?.tcc?.status as ReviewDimensionStatus);
  return {
    payment_review_status: payment,
    profile_review_status: profile,
    tcc_review_status: tcc,
  };
}

export function areAllApproved(s: ScalarReviewStatuses): boolean {
  return (
    s.payment_review_status === "approved" &&
    s.profile_review_status === "approved" &&
    s.tcc_review_status === "approved"
  );
}
