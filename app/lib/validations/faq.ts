import { z } from "zod";

// FAQ Group Validation Schemas
export const CreateFAQGroupSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  language: z.enum(["th", "en"]).default("th"),
  is_active: z.boolean().default(true),
  display_config: z
    .object({
      links: z
        .array(
          z.object({
            text: z.string().min(1, "Link text is required"),
            url: z.string().url("Invalid URL"),
            icon: z.string().optional(),
          }),
        )
        .default([]),
      hashtags: z
        .array(
          z
            .string()
            .regex(
              /^#?[a-zA-Z0-9_]+$/,
              "Hashtags can only contain letters, numbers, and underscores. No spaces allowed.",
            ),
        )
        .default([]),
      share_enabled: z.boolean().default(false),
      share_title: z.string().default(""),
      share_text: z.string().default(""),
    })
    .default({
      links: [],
      hashtags: [],
      share_enabled: false,
      share_title: "",
      share_text: "",
    }),
});

export const UpdateFAQGroupSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  language: z.enum(["th", "en"]).optional(),
  is_active: z.boolean().optional(),
  display_config: z
    .object({
      links: z
        .array(
          z.object({
            text: z.string().min(1, "Link text is required"),
            url: z.string().url("Invalid URL"),
            icon: z.string().optional(),
          }),
        )
        .optional(),
      hashtags: z
        .array(
          z
            .string()
            .regex(
              /^#?[a-zA-Z0-9_]+$/,
              "Hashtags can only contain letters, numbers, and underscores. No spaces allowed.",
            ),
        )
        .optional(),
      share_enabled: z.boolean().optional(),
      share_title: z.string().optional(),
      share_text: z.string().optional(),
    })
    .optional(),
});

// FAQ Item Validation Schemas
export const CreateFAQItemSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(500, "Question too long"),
  answer: z.string().min(1, "Answer is required"),
  item_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const UpdateFAQItemSchema = CreateFAQItemSchema.partial();

// Bulk reorder schema
export const ReorderFAQItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid("Invalid item ID"),
        item_order: z.number().int().min(0),
      }),
    )
    .min(1, "At least one item required"),
});

// FAQ Group with Items (for API responses)
export const FAQGroupWithItemsSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  language: z.enum(["th", "en"]),
  is_active: z.boolean(),
  display_config: z.object({
    links: z.array(
      z.object({
        text: z.string(),
        url: z.string(),
        icon: z.string().optional(),
      }),
    ),
    hashtags: z.array(z.string()),
    share_enabled: z.boolean(),
    share_title: z.string(),
    share_text: z.string(),
  }),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        question: z.string(),
        answer: z.string(),
        item_order: z.number(),
        is_active: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
      }),
    )
    .optional(),
});

// FAQ Item schema
export const FAQItemSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  question: z.string(),
  answer: z.string(),
  item_order: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Type exports
export type CreateFAQGroupInput = z.infer<typeof CreateFAQGroupSchema>;
export type UpdateFAQGroupInput = z.infer<typeof UpdateFAQGroupSchema>;
export type CreateFAQItemInput = z.infer<typeof CreateFAQItemSchema>;
export type UpdateFAQItemInput = z.infer<typeof UpdateFAQItemSchema>;
export type ReorderFAQItemsInput = z.infer<typeof ReorderFAQItemsSchema>;
export type FAQGroupWithItems = z.infer<typeof FAQGroupWithItemsSchema>;
export type FAQItem = z.infer<typeof FAQItemSchema>;
