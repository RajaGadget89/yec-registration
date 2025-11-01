"use client";

import { useEffect, useState } from "react";
import AdminHeader from "../../../_components/AdminHeader";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { LandingPageSection } from "../../../../types/database";

export default function LandingPageSectionsManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<LandingPageSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/cms/landing-page/sections");

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load sections");
      }

      const data = await res.json();
      // Ensure registration_cta is always at the end (order 6)
      const sectionsList = (data.sections || []) as LandingPageSection[];
      const sortedSections = sectionsList.sort((a, b) => {
        // registration_cta always goes last
        if (a.section_key === "registration_cta") return 1;
        if (b.section_key === "registration_cta") return -1;
        // Other sections sorted by section_order
        return a.section_order - b.section_order;
      });
      setSections(sortedSections);
    } catch (err) {
      console.error("Error loading sections:", err);
      setError(err instanceof Error ? err.message : "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = async (
    sectionKey: LandingPageSection["section_key"],
    currentStatus: boolean,
  ) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Optimistic update
      setSections((prev) =>
        prev.map((s) =>
          s.section_key === sectionKey
            ? { ...s, is_active: !currentStatus }
            : s,
        ),
      );

      const res = await fetch("/api/admin/cms/landing-page/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_key: sectionKey,
          is_active: !currentStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update section");
      }

      const data = await res.json();
      setSections((prev) =>
        prev.map((s) => (s.section_key === sectionKey ? data.section : s)),
      );

      setSuccessMessage(
        `${data.section.section_name} visibility updated successfully`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating section:", err);
      setError(err instanceof Error ? err.message : "Failed to update section");
      // Revert optimistic update
      setSections((prev) =>
        prev.map((s) =>
          s.section_key === sectionKey ? { ...s, is_active: currentStatus } : s,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Get the indices of Banner and Activity Cards sections
   */
  const getBannerAndActivityCardsIndices = (): {
    bannerIndex: number;
    activityCardsIndex: number;
  } => {
    const bannerIndex = sections.findIndex((s) => s.section_key === "banner");
    const activityCardsIndex = sections.findIndex(
      (s) => s.section_key === "activity_cards",
    );
    return { bannerIndex, activityCardsIndex };
  };

  /**
   * Check if a move would separate Banner and Activity Cards
   * Only returns true if the pair is currently adjacent AND the move would insert between them
   */
  const wouldMoveSeparatePair = (
    currentIndex: number,
    targetIndex: number,
  ): boolean => {
    const { bannerIndex, activityCardsIndex } =
      getBannerAndActivityCardsIndices();

    // If either Banner or Activity Cards is missing, no constraint
    if (bannerIndex === -1 || activityCardsIndex === -1) return false;

    // Check if pair is currently adjacent
    const [minPairIdx, maxPairIdx] = [
      Math.min(bannerIndex, activityCardsIndex),
      Math.max(bannerIndex, activityCardsIndex),
    ];
    const isPairAdjacent = maxPairIdx - minPairIdx === 1;

    // Only prevent moves if pair is adjacent AND move would insert between them
    if (
      isPairAdjacent &&
      currentIndex !== bannerIndex &&
      currentIndex !== activityCardsIndex
    ) {
      // Check if target position would be between the adjacent pair
      return targetIndex > minPairIdx && targetIndex <= maxPairIdx;
    }

    return false;
  };

  const handleReorder = async (
    sectionKey: LandingPageSection["section_key"],
    direction: "up" | "down",
  ) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Prevent reordering registration_cta (must always be last)
      if (sectionKey === "registration_cta") {
        setError("Registration CTA must always remain at the last position");
        setSaving(false);
        return;
      }

      const currentSection = sections.find((s) => s.section_key === sectionKey);
      if (!currentSection) return;

      const currentIndex = sections.findIndex(
        (s) => s.section_key === sectionKey,
      );
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      // Validate bounds
      if (targetIndex < 0 || targetIndex >= sections.length) {
        return;
      }

      // Prevent moving any section to the position of registration_cta (must be last)
      const targetSection = sections[targetIndex];
      if (targetSection?.section_key === "registration_cta") {
        setError(
          "Cannot move sections after Registration CTA (it must be last)",
        );
        setSaving(false);
        return;
      }

      const isBanner = sectionKey === "banner";
      const isActivityCards = sectionKey === "activity_cards";

      // If moving Banner or Activity Cards, move both together as a pair
      if (isBanner || isActivityCards) {
        const { bannerIndex, activityCardsIndex } =
          getBannerAndActivityCardsIndices();

        if (bannerIndex === -1 || activityCardsIndex === -1) {
          // One of the pair is missing, proceed with normal swap
          // targetSection is already declared above at line 210, reuse it

          const updatedSections = [...sections];
          const tempOrder = currentSection.section_order;
          updatedSections[currentIndex] = {
            ...currentSection,
            section_order: targetSection.section_order,
          };
          updatedSections[targetIndex] = {
            ...targetSection,
            section_order: tempOrder,
          };

          setSections(updatedSections);

          const res = await fetch(
            "/api/admin/cms/landing-page/sections/reorder",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sections: [
                  {
                    section_key: currentSection.section_key,
                    section_order: targetSection.section_order,
                  },
                  {
                    section_key: targetSection.section_key,
                    section_order: currentSection.section_order,
                  },
                ],
              }),
            },
          );

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to reorder sections");
          }

          await loadSections();
          setSuccessMessage("Section order updated successfully");
          setTimeout(() => setSuccessMessage(null), 3000);
          return;
        }

        // Both exist - move the pair together
        const [firstPairIndex, secondPairIndex] = [
          Math.min(bannerIndex, activityCardsIndex),
          Math.max(bannerIndex, activityCardsIndex),
        ];

        // Determine if pair is currently adjacent
        const isPairAdjacent = secondPairIndex - firstPairIndex === 1;

        // If not adjacent, first make them adjacent
        if (!isPairAdjacent) {
          // Rebuild section order: keep sections before Banner, then Banner + Activity Cards together, then remaining sections
          const bannerSection = sections[bannerIndex];
          const activityCardsSection = sections[activityCardsIndex];

          // Build new order: sections before Banner, then Banner, then Activity Cards, then sections between them, then sections after Activity Cards
          const sectionsBefore = sections.slice(0, firstPairIndex);
          const sectionsBetween = sections.slice(
            firstPairIndex + 1,
            secondPairIndex,
          );
          const sectionsAfter = sections.slice(secondPairIndex + 1);

          // Reconstruct in new order
          const reorderedSections = [
            ...sectionsBefore,
            bannerSection,
            activityCardsSection,
            ...sectionsBetween,
            ...sectionsAfter,
          ];

          // Assign sequential orders starting from 1
          const finalUpdates: Array<{
            section_key: LandingPageSection["section_key"];
            section_order: number;
          }> = reorderedSections.map((section, idx) => ({
            section_key: section.section_key,
            section_order: idx + 1,
          }));

          // Optimistic update
          const updatedSections = reorderedSections.map((section, idx) => ({
            ...section,
            section_order: idx + 1,
          }));
          setSections(updatedSections);

          // Call API
          const res = await fetch(
            "/api/admin/cms/landing-page/sections/reorder",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sections: finalUpdates }),
            },
          );

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to reorder sections");
          }

          await loadSections();
          setSuccessMessage(
            "Banner Section and Activity Cards are now adjacent. Move them together using the arrow buttons.",
          );
          setTimeout(() => setSuccessMessage(null), 4000);
          return;
        }

        // Pair is adjacent - move both together
        // Determine which edge to move (leading edge in the direction of movement)
        const leadingEdgeIndex =
          direction === "up" ? firstPairIndex : secondPairIndex;
        const newLeadingEdgeIndex =
          direction === "up" ? leadingEdgeIndex - 1 : leadingEdgeIndex + 1;

        // Validate bounds
        if (
          newLeadingEdgeIndex < 0 ||
          (direction === "down" && newLeadingEdgeIndex >= sections.length)
        ) {
          return;
        }

        // Calculate which sections will swap positions with the pair
        // When moving up, swap with section(s) above
        // When moving down, swap with section(s) below
        const updates: Array<{
          section_key: LandingPageSection["section_key"];
          section_order: number;
        }> = [];

        const bannerSection = sections[bannerIndex];
        const activityCardsSection = sections[activityCardsIndex];

        if (direction === "up") {
          // Moving pair up: swap with section above
          const sectionAbove = sections[firstPairIndex - 1];

          updates.push({
            section_key: bannerSection.section_key,
            section_order: sectionAbove.section_order,
          });
          updates.push({
            section_key: activityCardsSection.section_key,
            section_order: bannerSection.section_order,
          });
          updates.push({
            section_key: sectionAbove.section_key,
            section_order: activityCardsSection.section_order,
          });
        } else {
          // Moving pair down: swap with section below
          const sectionBelow = sections[secondPairIndex + 1];

          updates.push({
            section_key: sectionBelow.section_key,
            section_order: bannerSection.section_order,
          });
          updates.push({
            section_key: bannerSection.section_key,
            section_order: activityCardsSection.section_order,
          });
          updates.push({
            section_key: activityCardsSection.section_key,
            section_order: sectionBelow.section_order,
          });
        }

        // Optimistic update
        const updatedSections = [...sections];
        updates.forEach((update) => {
          const idx = updatedSections.findIndex(
            (s) => s.section_key === update.section_key,
          );
          if (idx !== -1) {
            updatedSections[idx] = {
              ...updatedSections[idx],
              section_order: update.section_order,
            };
          }
        });
        updatedSections.sort((a, b) => a.section_order - b.section_order);
        setSections(updatedSections);

        // Call API
        const res = await fetch(
          "/api/admin/cms/landing-page/sections/reorder",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sections: updates }),
          },
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to reorder sections");
        }

        await loadSections();
        setSuccessMessage(
          "Banner Section and Activity Cards moved together successfully",
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }

      // For non-pair sections, check if move would separate the pair
      if (wouldMoveSeparatePair(currentIndex, targetIndex)) {
        setError(
          "Cannot move this section between Banner Section and Activity Cards. They must stay together.",
        );
        setTimeout(() => setError(null), 4000);
        return;
      }

      // Normal swap for non-pair sections
      // targetSection is already declared above at line 210, reuse it

      const updatedSections = [...sections];
      const tempOrder = currentSection.section_order;
      updatedSections[currentIndex] = {
        ...currentSection,
        section_order: targetSection.section_order,
      };
      updatedSections[targetIndex] = {
        ...targetSection,
        section_order: tempOrder,
      };

      // Sort by section_order
      updatedSections.sort((a, b) => a.section_order - b.section_order);
      setSections(updatedSections);

      const res = await fetch("/api/admin/cms/landing-page/sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [
            {
              section_key: currentSection.section_key,
              section_order: targetSection.section_order,
            },
            {
              section_key: targetSection.section_key,
              section_order: currentSection.section_order,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to reorder sections");
      }

      await loadSections();
      setSuccessMessage("Section order updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error reordering sections:", err);
      setError(
        err instanceof Error ? err.message : "Failed to reorder sections",
      );
      await loadSections();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        compact
        backHref="/admin/content-management"
        title="Landing Page Sections"
        subtitle="Manage visibility of sections on the landing page"
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            {successMessage}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Banner Section and Activity Cards must stay
            together and will move as a pair. They are automatically kept
            adjacent to ensure proper display on the landing page.
          </p>
        </div>
        <div className="space-y-4">
          {sections.map((section) => {
            const currentIndex = sections.findIndex(
              (s) => s.section_key === section.section_key,
            );
            const isRegistrationCTA =
              section.section_key === "registration_cta";
            const wouldSeparateUp = wouldMoveSeparatePair(
              currentIndex,
              currentIndex - 1,
            );
            const wouldSeparateDown = wouldMoveSeparatePair(
              currentIndex,
              currentIndex + 1,
            );
            const isTop = currentIndex === 0;
            const isBottom = currentIndex === sections.length - 1;
            // registration_cta is always at the bottom and cannot be reordered
            const canReorder = !isRegistrationCTA;

            return (
              <div
                key={section.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(section.section_key, "up")}
                        disabled={
                          saving || isTop || wouldSeparateUp || !canReorder
                        }
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move up"
                        title={
                          !canReorder
                            ? "Registration CTA must always be last"
                            : wouldSeparateUp
                              ? "Cannot move between Banner and Activity Cards"
                              : "Move up"
                        }
                      >
                        <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={() =>
                          handleReorder(section.section_key, "down")
                        }
                        disabled={
                          saving || isBottom || wouldSeparateDown || !canReorder
                        }
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move down"
                        title={
                          !canReorder
                            ? "Registration CTA must always be last"
                            : wouldSeparateDown
                              ? "Cannot move between Banner and Activity Cards"
                              : "Move down"
                        }
                      >
                        <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {section.section_name}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      Order: {section.section_order}
                    </span>
                    {(section.section_key === "banner" ||
                      section.section_key === "activity_cards") && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        Paired
                      </span>
                    )}
                  </div>
                  {section.section_key === "registration_form" && (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                      Note: Registration Form will remain accessible via token
                      links and navigation even when hidden
                    </p>
                  )}
                  {isRegistrationCTA && (
                    <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                      Note: Controls visibility of Register link in Top Menu Bar
                      and CTA buttons on landing page
                    </p>
                  )}
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={section.is_active}
                    onChange={() =>
                      toggleSection(section.section_key, section.is_active)
                    }
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yec-primary/20 dark:peer-focus:ring-yec-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yec-primary"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {section.is_active ? "Visible" : "Hidden"}
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No sections found. Please run the database migration first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
