import type { Metadata } from "next";
import TopMenuBar from "../../components/TopMenuBar";
import Footer from "../../components/Footer";
import RegisterFormClient from "./RegisterFormClient";

type Props = {
  params: Promise<{ formKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { formKey } = await params;

    // Fetch form metadata
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const res = await fetch(`${baseUrl}/api/cms/form-types/${formKey}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { title: "Form not found" };
    }

    const formType = await res.json();

    return {
      title: formType.name || `Register - ${formKey}`,
      description: formType.description || `Registration form for ${formKey}`,
    };
  } catch {
    const { formKey } = await params;
    return { title: `Register - ${formKey}` };
  }
}

export default async function RegisterPage({ params }: Props) {
  const { formKey } = await params;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopMenuBar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <RegisterFormClient formKey={formKey} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
