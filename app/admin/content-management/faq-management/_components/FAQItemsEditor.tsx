"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import ClientOnlyRichTextEditor from "../../../../components/cms/ClientOnlyRichTextEditor";

interface FAQGroup {
  id: string;
  title: string;
  description?: string;
  language: string;
  is_active: boolean;
  display_config: {
    links: Array<{ text: string; url: string; icon?: string }>;
    hashtags: string[];
    share_enabled: boolean;
    share_title: string;
    share_text: string;
  };
  published_at?: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

interface FAQItem {
  id: string;
  group_id: string;
  question: string;
  answer: string;
  item_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQItemsEditorProps {
  group: FAQGroup;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FAQItemsEditor({
  group,
  onClose,
  onSuccess: _onSuccess,
}: FAQItemsEditorProps) {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [newItem, setNewItem] = useState({
    question: "",
    answer: "",
    is_active: true,
  });

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/cms/faq-groups/${group.id}/items`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch FAQ items");
      }
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error loading FAQ items:", error);
      alert("Failed to load FAQ items");
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => {
    loadItems();
  }, [group.id, loadItems]);

  const handleCreateItem = () => {
    setEditingItem(null);
    setNewItem({ question: "", answer: "", is_active: true });
    setShowItemEditor(true);
  };

  const handleEditItem = (item: FAQItem) => {
    setEditingItem(item);
    setNewItem({
      question: item.question,
      answer: item.answer,
      is_active: item.is_active,
    });
    setShowItemEditor(true);
  };

  const handleSaveItem = async () => {
    if (!newItem.question.trim() || !newItem.answer.trim()) {
      alert("Please fill in both question and answer");
      return;
    }

    try {
      setSaving(true);
      const url = editingItem
        ? `/api/admin/cms/faq-groups/${group.id}/items/${editingItem.id}`
        : `/api/admin/cms/faq-groups/${group.id}/items`;

      const method = editingItem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save FAQ item");
      }

      setShowItemEditor(false);
      setEditingItem(null);
      setNewItem({ question: "", answer: "", is_active: true });
      await loadItems();
    } catch (error) {
      console.error("Error saving FAQ item:", error);
      alert(error instanceof Error ? error.message : "Failed to save FAQ item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this FAQ item?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/cms/faq-groups/${group.id}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete FAQ item");
      }

      await loadItems();
    } catch (error) {
      console.error("Error deleting FAQ item:", error);
      alert("Failed to delete FAQ item");
    }
  };

  const handleReorderItems = async (newOrder: FAQItem[]) => {
    try {
      setSaving(true);
      const reorderData = newOrder.map((item, index) => ({
        id: item.id,
        item_order: index,
      }));

      const response = await fetch(
        `/api/admin/cms/faq-groups/${group.id}/items`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: reorderData }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reorder FAQ items");
      }

      setItems(newOrder);
    } catch (error) {
      console.error("Error reordering FAQ items:", error);
      alert("Failed to reorder FAQ items");
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newItems.length) return;

    [newItems[index], newItems[newIndex]] = [
      newItems[newIndex],
      newItems[index],
    ];
    handleReorderItems(newItems);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="text-gray-500">Loading FAQ items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {group.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage FAQ items ({items.length} items)
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateItem}
            className="flex items-center gap-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No FAQ items yet</div>
              <button
                onClick={handleCreateItem}
                className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
              >
                Create First Item
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          #{index + 1}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            item.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        {item.question}
                      </h3>
                      <div
                        className="text-sm text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-gray-500 hover:text-yec-primary hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item Editor Modal */}
        {showItemEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingItem ? "Edit FAQ Item" : "Create FAQ Item"}
                </h3>
                <button
                  onClick={() => setShowItemEditor(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Question *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.question}
                    onChange={(e) =>
                      setNewItem({ ...newItem, question: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                    placeholder="Enter the question"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Answer *
                  </label>
                  <ClientOnlyRichTextEditor
                    value={newItem.answer}
                    onChange={(value) =>
                      setNewItem({ ...newItem, answer: value })
                    }
                    placeholder="Enter the answer"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newItem.is_active}
                      onChange={(e) =>
                        setNewItem({ ...newItem, is_active: e.target.checked })
                      }
                      className="mr-2 rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowItemEditor(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={saving}
                  className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
