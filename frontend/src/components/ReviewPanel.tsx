import React, { useState, useEffect } from 'react';

const API_BASE = "http://127.0.0.1:8000/api";

interface ReviewProduct {
  id: number;
  mfg_part_num: string;
  raw_description: string;
  manufacturer?: string;
  brand?: string;
  category?: string;
  review_status?: string;
  review_reason?: string;
  status: string;
  confidence_score: number;
  found?: boolean;
}

interface ReviewPanelProps {
  datasetId: number | null;
  onReEnrich: (id: number) => void;
}

const REVIEW_CATEGORIES = [
  { key: "all", label: "All", icon: "📋" },
  { key: "url_lookup", label: "URL Not Found", icon: "🔍" },
  { key: "url_validation", label: "URL Invalid", icon: "🔗" },
  { key: "scrape", label: "Scrape Failed", icon: "🕷️" },
  { key: "spec_extraction", label: "Spec Extraction", icon: "📊" },
  { key: "exception", label: "Exception", icon: "⚠️" },
];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ datasetId, onReEnrich }) => {
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const limit = 10;

  const fetchReviewProducts = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/products`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());
      url.searchParams.append("review_status", "NEEDS_HUMAN_REVIEW");
      if (datasetId) url.searchParams.append("dataset_id", datasetId.toString());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        let items = data.items || [];

        // Client-side filter by review category
        if (activeCategory !== "all") {
          items = items.filter((p: ReviewProduct) => {
            const reason = (p.review_reason || "").toLowerCase();
            if (activeCategory === "url_lookup") return reason.includes("url lookup");
            if (activeCategory === "url_validation") return reason.includes("url validation");
            if (activeCategory === "scrape") return reason.includes("scrape");
            if (activeCategory === "spec_extraction") return reason.includes("spec extraction");
            if (activeCategory === "exception") return reason.includes("exception");
            return true;
          });
        }

        setProducts(items);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch review products", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewProducts();
  }, [page, datasetId, activeCategory]);

  const totalPages = Math.ceil(total / limit);

  const getReasonBadge = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes("url lookup")) return { color: "#ef4444", label: "URL Not Found" };
    if (r.includes("url validation")) return { color: "#f59e0b", label: "URL Invalid" };
    if (r.includes("scrape")) return { color: "#8b5cf6", label: "Scrape Failed" };
    if (r.includes("spec extraction")) return { color: "#3b82f6", label: "Spec Extraction" };
    if (r.includes("exception")) return { color: "#dc2626", label: "Exception" };
    return { color: "#6b7280", label: "Unknown" };
  };

  if (total === 0 && !loading) {
    return (
      <div style={{
        background: "rgba(16, 185, 129, 0.05)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        borderRadius: "16px",
        padding: "32px",
        textAlign: "center",
        marginBottom: "32px"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
        <h3 style={{ color: "#10b981", margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>
          No Items Pending Review
        </h3>
        <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>
          All products have been enriched successfully or haven't been processed yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(239, 68, 68, 0.03)",
      border: "1px solid rgba(239, 68, 68, 0.15)",
      borderRadius: "16px",
      padding: "24px",
      marginBottom: "32px"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px"
          }}>
            🔎
          </div>
          <div>
            <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: "18px", fontWeight: "700" }}>
              Needs Human Review
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
              {total} product{total !== 1 ? "s" : ""} requiring manual review
            </p>
          </div>
        </div>
        <button
          onClick={fetchReviewProducts}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "8px 16px",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "13px",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "16px",
        flexWrap: "wrap"
      }}>
        {REVIEW_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => { setActiveCategory(cat.key); setPage(1); }}
            style={{
              background: activeCategory === cat.key
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeCategory === cat.key
                ? "rgba(239, 68, 68, 0.3)"
                : "rgba(255,255,255,0.08)"}`,
              borderRadius: "8px",
              padding: "6px 14px",
              color: activeCategory === cat.key ? "#fca5a5" : "#94a3b8",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: activeCategory === cat.key ? "600" : "400",
              transition: "all 0.2s"
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          Loading review items...
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 4px"
            }}>
              <thead>
                <tr>
                  {["MPN", "Manufacturer", "Description", "Review Reason", "Actions"].map((h) => (
                    <th key={h} style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: "#64748b",
                      fontSize: "11px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const badge = getReasonBadge(p.review_reason || "");
                  return (
                    <tr key={p.id} style={{
                      background: "rgba(255,255,255,0.02)",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    >
                      <td style={{
                        padding: "10px 12px",
                        color: "#e2e8f0",
                        fontSize: "13px",
                        fontFamily: "monospace",
                        fontWeight: "600",
                        borderRadius: "8px 0 0 8px"
                      }}>
                        {p.mfg_part_num || "—"}
                      </td>
                      <td style={{
                        padding: "10px 12px",
                        color: "#cbd5e1",
                        fontSize: "13px"
                      }}>
                        {p.manufacturer || "—"}
                      </td>
                      <td style={{
                        padding: "10px 12px",
                        color: "#94a3b8",
                        fontSize: "12px",
                        maxWidth: "260px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {p.raw_description || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background: `${badge.color}20`,
                          color: badge.color,
                          border: `1px solid ${badge.color}30`
                        }}>
                          {badge.label}
                        </span>
                        <div style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {p.review_reason || "—"}
                        </div>
                      </td>
                      <td style={{
                        padding: "10px 12px",
                        borderRadius: "0 8px 8px 0"
                      }}>
                        <button
                          onClick={() => onReEnrich(p.id)}
                          style={{
                            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                            border: "none",
                            borderRadius: "6px",
                            padding: "5px 12px",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.3)";
                          }}
                        >
                          🔄 Re-enrich
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "16px"
            }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: page <= 1 ? "#475569" : "#94a3b8",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                ← Prev
              </button>
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: page >= totalPages ? "#475569" : "#94a3b8",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
