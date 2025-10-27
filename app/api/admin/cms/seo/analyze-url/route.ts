/**
 * CMS SEO API - URL Analysis
 * Analyzes SEO for a given URL by fetching its content
 */

import { NextRequest, NextResponse } from "next/server";
import { withSEOOptimizationGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { z } from "zod";

// Validation schema for URL analysis
const URLAnalysisSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

interface SEOAnalysisResult {
  page_title: string;
  meta_description: string;
  keywords: string[];
  readability_score: number;
  seo_score: number;
  issues: Array<{
    type: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>;
  recommendations: string[];
  url: string;
  analyzed_at: string;
}

/**
 * POST /api/admin/cms/seo/analyze-url
 * Analyze SEO for a given URL
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
    const validatedData = URLAnalysisSchema.parse(body);

    // Fetch content from URL
    const urlResponse = await fetch(validatedData.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEO-Analyzer/1.0)",
      },
    });

    if (!urlResponse.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${urlResponse.status} ${urlResponse.statusText}`,
        },
        { status: 400 },
      );
    }

    const html = await urlResponse.text();

    // Extract SEO data from HTML
    const seoData = extractSEOData(html, validatedData.url);

    // Perform SEO analysis
    const analysis = performSEOAnalysis(seoData);

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("URL SEO Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function extractSEOData(html: string, url: string) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract meta description
  const metaDescMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  );
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : "";

  // Extract meta keywords
  const metaKeywordsMatch = html.match(
    /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["'][^>]*>/i,
  );
  const keywords = metaKeywordsMatch
    ? metaKeywordsMatch[1].split(",").map((k) => k.trim())
    : [];

  // Extract content (remove HTML tags)
  const contentMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = contentMatch ? contentMatch[1] : html;
  const textContent = bodyContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title,
    metaDescription,
    keywords,
    content: textContent,
    url,
  };
}

function performSEOAnalysis(seoData: any): SEOAnalysisResult {
  const { title, metaDescription, content, url } = seoData;

  const issues: Array<{
    type: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }> = [];

  const recommendations: string[] = [];

  // Analyze title
  if (!title) {
    issues.push({
      type: "error",
      message: "Missing page title",
      suggestion: "Add a <title> tag to your page",
    });
  } else if (title.length < 30) {
    issues.push({
      type: "warning",
      message: "Title is too short",
      suggestion: "Make title 30-60 characters for better SEO",
    });
  } else if (title.length > 60) {
    issues.push({
      type: "warning",
      message: "Title is too long",
      suggestion: "Keep title under 60 characters to avoid truncation",
    });
  }

  // Analyze meta description
  if (!metaDescription) {
    issues.push({
      type: "error",
      message: "Missing meta description",
      suggestion: "Add a meta description tag",
    });
  } else if (metaDescription.length < 120) {
    issues.push({
      type: "warning",
      message: "Meta description is too short",
      suggestion: "Make meta description 120-160 characters",
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      type: "warning",
      message: "Meta description is too long",
      suggestion: "Keep meta description under 160 characters",
    });
  }

  // Analyze content
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 300) {
    issues.push({
      type: "warning",
      message: "Content is too short",
      suggestion: "Add more content (300+ words recommended)",
    });
  }

  // Calculate readability score
  const readabilityScore = calculateReadabilityScore(content);
  if (readabilityScore < 60) {
    issues.push({
      type: "info",
      message: "Content readability could be improved",
      suggestion: "Use shorter sentences and simpler words",
    });
  }

  // Calculate keyword density
  const keywordDensity = calculateKeywordDensity(content);
  const topKeywords = Object.entries(keywordDensity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  // Calculate overall SEO score with improved weighting
  let seoScore = 0;

  // Title scoring (25 points max)
  if (title) {
    if (title.length >= 30 && title.length <= 60) {
      seoScore += 25; // Perfect length
    } else if (title.length >= 20 && title.length < 30) {
      seoScore += 20; // Good but could be longer
    } else if (title.length > 60 && title.length <= 70) {
      seoScore += 20; // Good but could be shorter
    } else if (title.length > 0) {
      seoScore += 15; // Has title but needs optimization
    }
  }

  // Meta description scoring (25 points max)
  if (metaDescription) {
    if (metaDescription.length >= 120 && metaDescription.length <= 160) {
      seoScore += 25; // Perfect length
    } else if (metaDescription.length >= 100 && metaDescription.length < 120) {
      seoScore += 20; // Good but could be longer
    } else if (metaDescription.length > 160 && metaDescription.length <= 180) {
      seoScore += 20; // Good but could be shorter
    } else if (metaDescription.length > 0) {
      seoScore += 15; // Has description but needs optimization
    }
  }

  // Content length scoring (25 points max)
  if (wordCount >= 300) {
    seoScore += 25; // Excellent content length
  } else if (wordCount >= 200) {
    seoScore += 20; // Good content length
  } else if (wordCount >= 100) {
    seoScore += 15; // Adequate content length
  } else if (wordCount > 0) {
    seoScore += 10; // Some content but needs more
  }

  // Readability scoring (25 points max) - now properly weighted
  seoScore += Math.round(readabilityScore * 0.25);

  // Keyword bonus (up to 10 extra points)
  const keywordBonus = Math.min(10, topKeywords.length * 2);
  seoScore += keywordBonus;

  const finalScore = Math.min(100, Math.round(seoScore));

  // Generate specific recommendations based on actual scores
  if (finalScore < 80) {
    recommendations.push("Focus on the areas below to improve your SEO score");
  }

  // Title recommendations
  if (!title) {
    recommendations.push("Add a page title");
  } else if (title.length < 20) {
    recommendations.push(
      "Make your title longer (20-60 characters recommended)",
    );
  } else if (title.length < 30) {
    recommendations.push(
      "Consider extending your title to 30-60 characters for better SEO",
    );
  } else if (title.length > 60) {
    recommendations.push(
      "Shorten your title to under 60 characters to avoid truncation",
    );
  }

  // Meta description recommendations
  if (!metaDescription) {
    recommendations.push("Add a meta description");
  } else if (metaDescription.length < 100) {
    recommendations.push(
      "Make your meta description longer (120-160 characters recommended)",
    );
  } else if (metaDescription.length < 120) {
    recommendations.push(
      "Consider extending your meta description to 120-160 characters",
    );
  } else if (metaDescription.length > 160) {
    recommendations.push(
      "Shorten your meta description to under 160 characters",
    );
  }

  // Content recommendations
  if (wordCount < 100) {
    recommendations.push(
      "Add more content to your page (300+ words recommended)",
    );
  } else if (wordCount < 200) {
    recommendations.push(
      "Consider adding more content (200+ words recommended)",
    );
  } else if (wordCount < 300) {
    recommendations.push(
      "Great content length! Consider adding a bit more for optimal SEO",
    );
  }

  // Readability recommendations
  if (readabilityScore < 60) {
    recommendations.push(
      "Improve content readability with shorter sentences and simpler words",
    );
  } else if (readabilityScore < 80) {
    recommendations.push(
      "Good readability! Consider making it even more accessible",
    );
  }

  // Keyword recommendations
  if (topKeywords.length === 0) {
    recommendations.push("Add relevant keywords to your content");
  } else if (topKeywords.length < 5) {
    recommendations.push(
      "Consider adding more relevant keywords to your content",
    );
  } else {
    recommendations.push(
      "Great keyword usage! Keep using relevant terms naturally",
    );
  }

  return {
    page_title: title || "No title found",
    meta_description: metaDescription || "No meta description found",
    keywords: topKeywords,
    readability_score: Math.round(readabilityScore),
    seo_score: finalScore,
    issues,
    recommendations,
    url,
    analyzed_at: new Date().toISOString(),
  };
}

function calculateReadabilityScore(content: string): number {
  // Detect if content is primarily Thai
  const thaiCharCount = (content.match(/[\u0E00-\u0E7F]/g) || []).length;
  const totalCharCount = content.replace(/\s/g, "").length;
  const isThai = thaiCharCount / totalCharCount > 0.3;

  if (isThai) {
    // For Thai content, use a simplified scoring based on content length and structure
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;

    if (sentences === 0 || words === 0) return 0;

    const avgWordsPerSentence = words / sentences;

    // Thai-specific readability scoring
    let score = 100;

    // Penalize very long sentences (more than 20 words)
    if (avgWordsPerSentence > 20) {
      score -= (avgWordsPerSentence - 20) * 2;
    }

    // Penalize very short content
    if (words < 50) {
      score -= 30;
    }

    // Bonus for good content length
    if (words >= 200 && words <= 500) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  } else {
    // Original English readability calculation
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
}

function calculateKeywordDensity(content: string): Record<string, number> {
  // Detect if content is primarily Thai
  const thaiCharCount = (content.match(/[\u0E00-\u0E7F]/g) || []).length;
  const totalCharCount = content.replace(/\s/g, "").length;
  const isThai = thaiCharCount / totalCharCount > 0.3;

  if (isThai) {
    // For Thai content, use character-based word splitting
    const words = content
      .split(/\s+/)
      .filter((word) => word.length > 2) // Lower threshold for Thai
      .filter((word) => /[\u0E00-\u0E7F]/.test(word)); // Only Thai words

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
  } else {
    // Original English keyword extraction
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
}
