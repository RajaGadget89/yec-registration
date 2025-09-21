import { useState, useEffect } from "react";
import { formSchema, FormField } from "./FormSchema";

interface AvailableOptions {
  hotelChoices: string[];
  roomTypes: string[];
}

interface DynamicFormSchemaHook {
  dynamicFormSchema: FormField[];
  isLoading: boolean;
  error: string | null;
  availableOptions: AvailableOptions | null;
}

/**
 * Custom hook to manage dynamic form schema based on available pricing options
 * This ensures hotel choices are filtered based on early bird status and admin configuration
 */
export function useDynamicFormSchema(): DynamicFormSchemaHook {
  const [availableOptions, setAvailableOptions] =
    useState<AvailableOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available options on component mount
  useEffect(() => {
    const fetchAvailableOptions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/pricing/options");

        if (!response.ok) {
          throw new Error(`Failed to fetch options: ${response.status}`);
        }

        const options = await response.json();
        setAvailableOptions(options);
      } catch (err) {
        console.error("Error fetching available options:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch available options",
        );

        // Fallback to showing all options if API fails
        setAvailableOptions({
          hotelChoices: ["in-quota", "out-of-quota", "no-accommodation"],
          roomTypes: ["single", "double"],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableOptions();
  }, []);

  // Create dynamic form schema based on available options
  const dynamicFormSchema = formSchema.map((field) => {
    if (field.id === "hotelChoice" && availableOptions) {
      // Filter hotel choice options based on available options
      const filteredOptions =
        field.options?.filter((option) =>
          availableOptions.hotelChoices.includes(option.value),
        ) || [];

      return {
        ...field,
        options: filteredOptions,
      };
    }

    if (field.id === "roomType" && availableOptions) {
      // Filter room type options based on available options
      const filteredOptions =
        field.options?.filter((option) =>
          availableOptions.roomTypes.includes(option.value),
        ) || [];

      return {
        ...field,
        options: filteredOptions,
      };
    }

    return field;
  });

  return {
    dynamicFormSchema,
    isLoading,
    error,
    availableOptions,
  };
}
