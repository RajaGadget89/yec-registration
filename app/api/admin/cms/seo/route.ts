/**
 * CMS SEO API - SEO Optimization Tools
 * Handles SEO analysis and optimization with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withSEOOptimizationGuard } from "../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { maybeServiceClient } from "../../../../lib/supabase/server";
import { z } from "zod";

// Validation schemas
const SEOAnalysisSchema = z.object({
  page_id: z.string().uuid().optional(),
  page_slug: z.string().optional(),
  content: z.string().min(1),
  title: z.string().min(1),
  meta_description: z.string().optional(),
  language: z.enum(["th", "en"]).default("th"),
});

const SEOOptimizationSchema = z.object({
  page_id: z.string().uuid(),
  title: z.string().min(1).max(60),
  meta_description: z.string().min(1).max(160),
  keywords: z.array(z.string()).optional(),
  focus_keyword: z.string().optional(),
  readability_score: z.number().min(0).max(100).optional(),
  seo_score: z.number().min(0).max(100).optional(),
});

/**
 * POST /api/admin/cms/seo/analyze
 * Analyze content for SEO optimization
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withSEOOptimizationGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SEOAnalysisSchema.parse(body);

    // Basic SEO analysis
    const analysis = {
      title: {
        length: validatedData.title.length,
        score:
          validatedData.title.length >= 30 && validatedData.title.length <= 60
            ? 100
            : validatedData.title.length < 30
              ? (validatedData.title.length / 30) * 100
              : Math.max(0, 100 - (validatedData.title.length - 60) * 2),
        issues: [] as string[],
      },
      metaDescription: {
        length: validatedData.meta_description?.length || 0,
        score: validatedData.meta_description
          ? validatedData.meta_description.length >= 120 &&
            validatedData.meta_description.length <= 160
            ? 100
            : validatedData.meta_description.length < 120
              ? (validatedData.meta_description.length / 120) * 100
              : Math.max(
                  0,
                  100 - (validatedData.meta_description.length - 160) * 2,
                )
          : 0,
        issues: [] as string[],
      },
      content: {
        wordCount: validatedData.content.split(/\s+/).length,
        readability: calculateReadabilityScore(validatedData.content),
        keywordDensity: calculateKeywordDensity(validatedData.content),
        issues: [] as string[],
      },
      overall: {
        score: 0,
        recommendations: [] as string[],
      },
    };

    // Add issues and recommendations
    if (analysis.title.length < 30) {
      analysis.title.issues.push(
        "Title is too short (recommended: 30-60 characters)",
      );
    }
    if (analysis.title.length > 60) {
      analysis.title.issues.push(
        "Title is too long (recommended: 30-60 characters)",
      );
    }

    if (!validatedData.meta_description) {
      analysis.metaDescription.issues.push("Meta description is missing");
    } else if (analysis.metaDescription.length < 120) {
      analysis.metaDescription.issues.push(
        "Meta description is too short (recommended: 120-160 characters)",
      );
    } else if (analysis.metaDescription.length > 160) {
      analysis.metaDescription.issues.push(
        "Meta description is too long (recommended: 120-160 characters)",
      );
    }

    if (analysis.content.wordCount < 300) {
      analysis.content.issues.push(
        "Content is too short (recommended: 300+ words)",
      );
    }
    if (analysis.content.readability < 60) {
      analysis.content.issues.push("Content readability could be improved");
    }

    // Calculate overall score
    analysis.overall.score = Math.round(
      (analysis.title.score +
        analysis.metaDescription.score +
        analysis.content.readability) /
        3,
    );

    // Generate recommendations
    if (analysis.title.score < 80) {
      analysis.overall.recommendations.push(
        "Optimize title length and keywords",
      );
    }
    if (analysis.metaDescription.score < 80) {
      analysis.overall.recommendations.push("Improve meta description");
    }
    if (analysis.content.readability < 60) {
      analysis.overall.recommendations.push("Improve content readability");
    }
    if (analysis.content.wordCount < 300) {
      analysis.overall.recommendations.push("Add more content for better SEO");
    }

    return NextResponse.json({
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("SEO Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cms/seo/optimize
 * Apply SEO optimizations to content
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withSEOOptimizationGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SEOOptimizationSchema.parse(body);

    const supabase = await maybeServiceClient(request);

    // Update page with SEO optimizations
    const { data: updatedPage, error } = await supabase
      .from("cms_pages")
      .update({
        title: validatedData.title,
        meta_description: validatedData.meta_description,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validatedData.page_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating SEO optimizations:", error);
      return NextResponse.json(
        { error: "Failed to update SEO optimizations" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      page: updatedPage,
      optimizations: {
        title: validatedData.title,
        meta_description: validatedData.meta_description,
        keywords: validatedData.keywords,
        focus_keyword: validatedData.focus_keyword,
        readability_score: validatedData.readability_score,
        seo_score: validatedData.seo_score,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("SEO Optimization error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper functions
function calculateReadabilityScore(content: string): number {
  const words = content.split(/\s+/).length;
  const sentences = content.split(/[.!?]+/).length;
  const syllables = content
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .split("").length;

  if (sentences === 0 || words === 0) return 0;

  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  // Simplified Flesch Reading Ease Score
  const score =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, score));
}

function calculateKeywordDensity(content: string): Record<string, number> {
  const words = content
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const wordCount: Record<string, number> = {};

  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  const totalWords = words.length;
  const density: Record<string, number> = {};

  Object.entries(wordCount).forEach(([word, count]) => {
    density[word] = (count / totalWords) * 100;
  });

  return density;
}
