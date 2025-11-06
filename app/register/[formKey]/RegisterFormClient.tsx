"use client";

import { useRouter } from "next/navigation";
import DynamicFormRenderer from "../../components/FormRenderer/DynamicFormRenderer";

interface RegisterFormClientProps {
  formKey: string;
}

export default function RegisterFormClient({
  formKey,
}: RegisterFormClientProps) {
  const router = useRouter();

  const handleSubmit = (result: any) => {
    // Redirect to success page after submission
    const registrationId = result.registration_id || result.id || "";
    router.push(`/success?form=${formKey}&registration_id=${registrationId}`);
  };

  const handleError = (error: string) => {
    console.error("Form error:", error);
    // You could show a toast notification here
  };

  return (
    <DynamicFormRenderer
      formKey={formKey}
      onSubmit={handleSubmit}
      onError={handleError}
    />
  );
}
