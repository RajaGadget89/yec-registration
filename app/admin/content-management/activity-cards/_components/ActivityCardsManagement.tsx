"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Eye, ArrowUp, ArrowDown, Layout } from "lucide-react";

interface ActivityCard {
  id: string;
  page_id: string;
  card_slug: string;
  title: string;
  description: string;
  icon_emoji?: string;
  image_url?: string;
  detail_page_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ActivityCardsManagement() {
  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCards();
  }, [currentPage, searchTerm, filterStatus]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && { is_active: filterStatus === "active" ? "true" : "false" }),
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
      const card = cards.find(c => c.id === cardId);
      if (!card) return;

      const newOrder = direction === "up" ? card.display_order - 1 : card.display_order + 1;
      
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
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Create Button */}
        <button
          onClick={() => {
            // TODO: Implement create activity card modal
            alert("Create activity card functionality coming soon!");
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Card</span>
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
                <img
                  src={card.image_url}
                  alt={card.title}
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
                    className="p-1 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                    title="Move Up"
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
                    onClick={() => {
                      // TODO: Implement view card
                      alert("View card functionality coming soon!");
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="View Card"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement edit card
                      alert("Edit card functionality coming soon!");
                    }}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {cards.length === 0 && !loading && (
        <div className="text-center py-12">
          <Layout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No activity cards found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first activity card.
          </p>
        </div>
      )}
    </div>
  );
}
