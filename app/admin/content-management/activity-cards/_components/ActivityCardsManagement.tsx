"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Layout,
  X,
} from "lucide-react";

interface ActivityCard {
  id: string;
  page_id: string;
  card_slug: string;
  title: string;
  description: string; // legacy field used as summary fallback
  summary?: string;
  content?: string;
  icon_emoji?: string;
  image_url?: string;
  detail_page_id?: string;
  display_order: number;
  is_active: boolean;
  external_links?: { title: string; url: string; description?: string }[];
  hashtags?: string[];
  language?: "th" | "en";
  published_at?: string | null;
  scheduled_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export default function ActivityCardsManagement() {
  const router = useRouter();
  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [landingPageId, setLandingPageId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCard, setNewCard] = useState({
    title: "",
    summary: "",
    content: "",
    icon_emoji: "",
    image_url: "",
    card_slug: "",
    display_order: 1,
    is_active: true,
    detail_page_id: "",
    external_links: [] as {
      title: string;
      url: string;
      description?: string;
    }[],
    hashtags: [] as string[],
    language: "en" as "th" | "en",
    published_at: "",
    scheduled_at: "",
    ends_at: "",
  });

  useEffect(() => {
    // Load landing page id once
    const loadLandingPage = async () => {
      try {
        const res = await fetch(`/api/admin/cms/pages?limit=100`);
        if (!res.ok) throw new Error("Failed to load pages");
        const data = await res.json();
        let landing = (data.pages || []).find(
          (p: any) => p.slug === "landing-page",
        );
        if (!landing) {
          // Auto-create landing page if missing
          const create = await fetch("/api/admin/cms/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: "landing-page",
              title: "Landing Page",
              language: "en",
              is_active: true,
            }),
          });
          if (create.ok) {
            landing = await create.json();
          }
        }
        if (landing?.id) setLandingPageId(landing.id);
      } catch (e) {
        console.error("Failed to resolve landing page id", e);
      }
    };
    loadLandingPage();
  }, []);

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && {
          is_active: filterStatus === "active" ? "true" : "false",
        }),
        ...(landingPageId ? { page_id: landingPageId } : {}),
      });

      const response = await fetch(`/api/admin/cms/activity-cards?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch activity cards");
      }

      const data = await response.json();
      setCards(data.cards || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching activity cards:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, landingPageId, itemsPerPage]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSeedDefaults = async () => {
    if (!landingPageId) {
      alert("Landing page not ready yet.");
      return;
    }
    // Load existing slugs to avoid duplicate creation
    const existingSlugs = new Set<string>();
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        page_id: landingPageId,
      });
      const res = await fetch(
        `/api/admin/cms/activity-cards?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        (data.cards || []).forEach((c: any) =>
          existingSlugs.add(String(c.card_slug)),
        );
      }
    } catch (_e) {
      // ignore prefetch errors; proceed with best effort
    }
    const defaults = [
      {
        title: "🎭 Culture",
        description:
          "Immerse yourself in rich cultural heritage and traditions while building meaningful relationships.",
        card_slug: "culture",
        display_order: 1,
      },
      {
        title: "🔗 Connection",
        description:
          "Build strong professional connections with like‑minded entrepreneurs to share vision and passion.",
        card_slug: "connection",
        display_order: 2,
      },
      {
        title: "🤝 Collaboration",
        description:
          "Work together with fellow entrepreneurs to create innovative solutions and partnerships.",
        card_slug: "collaboration",
        display_order: 3,
      },
    ];

    try {
      setCreating(true);
      for (const d of defaults) {
        if (existingSlugs.has(d.card_slug)) {
          continue; // skip duplicates
        }
        const res = await fetch("/api/admin/cms/activity-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_id: landingPageId,
            title: d.title,
            description: d.description,
            card_slug: d.card_slug,
            display_order: d.display_order,
            is_active: true,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const message = (err?.error as string) || "";
          if (message.includes("already exists")) {
            continue; // safe to ignore and continue
          }
          throw new Error(message || "Failed to seed cards");
        }
      }
      fetchCards();
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleCreate = async () => {
    if (!landingPageId) {
      alert("Landing page not found. Please create the landing page first.");
      return;
    }
    try {
      setCreating(true);
      const body: any = {
        page_id: landingPageId,
        title: newCard.title.trim(),
        summary: (newCard.summary || "").trim(),
        content: (newCard.content || "").trim(),
        card_slug: (newCard.card_slug || slugify(newCard.title)).slice(0, 100),
        icon_emoji: newCard.icon_emoji || undefined,
        image_url: newCard.image_url || undefined,
        detail_page_id: newCard.detail_page_id || undefined,
        display_order: Number(newCard.display_order) || 1,
        is_active: !!newCard.is_active,
        external_links: newCard.external_links,
        hashtags: newCard.hashtags,
        language: newCard.language,
        published_at: newCard.published_at || undefined,
        scheduled_at: newCard.scheduled_at || undefined,
        ends_at: newCard.ends_at || undefined,
      };

      const res = await fetch("/api/admin/cms/activity-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create card");
      }
      setShowCreate(false);
      setNewCard({
        title: "",
        summary: "",
        content: "",
        icon_emoji: "",
        image_url: "",
        card_slug: "",
        display_order: 1,
        is_active: true,
        detail_page_id: "",
        external_links: [],
        hashtags: [],
        language: "en",
        published_at: "",
        scheduled_at: "",
        ends_at: "",
      });
      fetchCards();
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (card: ActivityCard) => {
    router.push(`/admin/content-management/activity-cards/${card.id}`);
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this activity card?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cms/activity-cards/${cardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete activity card");
      }

      // Refresh the cards list
      fetchCards();
    } catch (error) {
      console.error("Error deleting activity card:", error);
      alert("Failed to delete activity card");
    }
  };

  const handleToggleStatus = async (cardId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/cms/activity-cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update card status");
      }

      // Refresh the cards list
      fetchCards();
    } catch (error) {
      console.error("Error updating card status:", error);
      alert("Failed to update card status");
    }
  };

  const handleReorder = async (cardId: string, direction: "up" | "down") => {
    try {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      const newOrder =
        direction === "up" ? card.display_order - 1 : card.display_order + 1;

      // Validate minimum display_order of 1
      if (newOrder < 1) {
        alert("Display order cannot be less than 1");
        return;
      }

      const response = await fetch(`/api/admin/cms/activity-cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_order: newOrder,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder card");
      }

      // Refresh the cards list
      fetchCards();
    } catch (error) {
      console.error("Error reordering card:", error);
      alert("Failed to reorder card");
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
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search activity cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Page Size */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="5">5 per page</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Card</span>
        </button>
        <button
          onClick={handleSeedDefaults}
          className="ml-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Quick Seed 3 Cards
        </button>
      </div>

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            <div className="aspect-video bg-gradient-to-br from-yec-primary/10 to-yec-accent/10 flex items-center justify-center">
              {card.image_url ? (
                <Image
                  src={card.image_url}
                  alt={card.title}
                  width={400}
                  height={225}
                  priority
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  {card.icon_emoji ? (
                    <div className="text-4xl mb-2">{card.icon_emoji}</div>
                  ) : (
                    <Layout className="h-12 w-12 text-gray-400 mx-auto" />
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {card.title}
                </h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleReorder(card.id, "up")}
                    disabled={card.display_order <= 1}
                    className={`p-1 transition-colors duration-200 ${
                      card.display_order <= 1
                        ? "text-gray-200 cursor-not-allowed"
                        : "text-gray-400 hover:text-yec-primary"
                    }`}
                    title={
                      card.display_order <= 1
                        ? "Already at minimum order"
                        : "Move Up"
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleReorder(card.id, "down")}
                    className="p-1 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                    title="Move Down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {card.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Order: {card.display_order}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(card.id, card.is_active)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                      card.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                    }`}
                  >
                    {card.is_active ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() =>
                      window.open(`/activities/${card.card_slug}`, "_blank")
                    }
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="View Card"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(card)}
                    className="p-1 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                    title="Edit Card"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Delete Card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Results Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, cards.length)} of{" "}
            {cards.length} activity cards
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {cards.length === 0 && !loading && (
        <div className="text-center py-12">
          <Layout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No activity cards found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This list shows cards for the landing page. Click &quot;Create
            Card&quot; to add one.
          </p>
          <div className="mt-3">
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2 bg-yec-primary text-white rounded-lg"
            >
              Seed 3 Default Cards
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Activity Card
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  value={newCard.title}
                  onChange={(e) =>
                    setNewCard((v) => ({ ...v, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Summary
                </label>
                <textarea
                  value={newCard.summary}
                  onChange={(e) =>
                    setNewCard((v) => ({ ...v, summary: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                ></textarea>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Content
                </label>
                <textarea
                  value={newCard.content}
                  onChange={(e) =>
                    setNewCard((v) => ({ ...v, content: e.target.value }))
                  }
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  value={newCard.card_slug}
                  onChange={(e) =>
                    setNewCard((v) => ({
                      ...v,
                      card_slug: e.target.value
                        .replace(/\s+/g, "-")
                        .toLowerCase(),
                    }))
                  }
                  placeholder="auto from title"
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={newCard.display_order}
                  onChange={(e) =>
                    setNewCard((v) => ({
                      ...v,
                      display_order: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Icon Emoji (optional)
                </label>
                <input
                  value={newCard.icon_emoji}
                  onChange={(e) =>
                    setNewCard((v) => ({ ...v, icon_emoji: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Image URL (optional)
                </label>
                <input
                  value={newCard.image_url}
                  onChange={(e) =>
                    setNewCard((v) => ({ ...v, image_url: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={newCard.is_active}
                  onChange={(e) =>
                    setNewCard((v) => ({ ...v, is_active: e.target.checked }))
                  }
                />
                <label htmlFor="is_active" className="text-sm">
                  Active
                </label>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newCard.title || !newCard.summary}
                className="px-4 py-2 rounded-lg bg-yec-primary text-white disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
