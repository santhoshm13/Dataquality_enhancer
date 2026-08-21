"""
Knowledge-Graph Coverage View API

GET /api/coverage-graph

Returns taxonomy nodes, attribute nodes, LOV value nodes, and edges between them,
with per-category attribute fill rates computed from enriched products.
Used to drive the D3 force-directed graph in the frontend CoverageGraph component.
"""
from fastapi import APIRouter, Query
from typing import Optional
from app.database.repository import repository

router = APIRouter()


@router.get("/coverage-graph")
async def get_coverage_graph(dataset_id: Optional[int] = Query(None)):
    """
    Returns a graph structure for the Knowledge-Graph Coverage View:

    nodes: [{id, label, type, fill_rate?, product_count?}]
    edges: [{source, target, relation}]
    category_stats: [{category, attribute, fill_rate, total_products, filled_products}]
    """
    products = repository.get_all_products(dataset_id=dataset_id)

    # Collect all seen taxonomy nodes and attribute data
    dept_set = set()
    class_set = set()
    category_set = set()
    category_attrs: dict = {}     # category -> {attr_name -> [values]}
    category_products: dict = {}  # category -> total count

    for p in products:
        enrichment = p.get("enrichment") or {}
        dept = enrichment.get("department") or "Unknown"
        cls = enrichment.get("class") or "Unknown"
        cat = enrichment.get("category") or "Unknown"

        dept_set.add(dept)
        class_set.add(f"{dept}::{cls}")
        category_set.add(cat)

        if cat not in category_products:
            category_products[cat] = 0
            category_attrs[cat] = {}
        category_products[cat] += 1

        attrs = p.get("attributes") or []
        for attr in attrs:
            aname = attr.get("name") or attr.get("attribute_name") or ""
            aval = attr.get("value") or ""
            conf = float(attr.get("confidence") or 0)
            if aname and aval and conf >= 0.6:
                if aname not in category_attrs[cat]:
                    category_attrs[cat][aname] = []
                category_attrs[cat][aname].append(aval)

    # Build nodes
    nodes = []
    edges = []
    node_id_map = {}
    counter = [0]

    def make_id(prefix, label):
        key = f"{prefix}::{label}"
        if key not in node_id_map:
            node_id_map[key] = f"n{counter[0]}"
            counter[0] += 1
        return node_id_map[key]

    # Dept nodes
    for dept in sorted(dept_set):
        nid = make_id("dept", dept)
        nodes.append({"id": nid, "label": dept, "type": "department",
                      "product_count": sum(
                          category_products.get(c, 0)
                          for c in category_set
                          if any((p.get("enrichment") or {}).get("department") == dept
                                 for p in products
                                 if (p.get("enrichment") or {}).get("category") == c)
                      )})

    # Class nodes (dept::class pairs)
    seen_classes = {}
    for p in products:
        e = p.get("enrichment") or {}
        dept = e.get("department") or "Unknown"
        cls = e.get("class") or "Unknown"
        cat = e.get("category") or "Unknown"
        key = f"{dept}::{cls}"
        if key not in seen_classes:
            seen_classes[key] = {"dept": dept, "class": cls}
            cnid = make_id("class", key)
            dnid = make_id("dept", dept)
            nodes.append({"id": cnid, "label": cls, "type": "class"})
            edges.append({"source": dnid, "target": cnid, "relation": "has_class"})

    # Category nodes
    for cat in sorted(category_set):
        cat_products_count = category_products.get(cat, 0)
        # Find parent class
        parent_class_key = None
        for p in products:
            e = p.get("enrichment") or {}
            if (e.get("category") or "Unknown") == cat:
                parent_class_key = f"{e.get('department','Unknown')}::{e.get('class','Unknown')}"
                break
        cat_nid = make_id("cat", cat)
        nodes.append({"id": cat_nid, "label": cat, "type": "category",
                      "product_count": cat_products_count})
        if parent_class_key:
            cnid = make_id("class", parent_class_key)
            edges.append({"source": cnid, "target": cat_nid, "relation": "has_category"})

    # Attribute nodes + coverage stats
    category_stats = []
    for cat, attrs in category_attrs.items():
        cat_total = category_products.get(cat, 0)
        cat_nid = make_id("cat", cat)
        for aname, avals in attrs.items():
            fill_count = len(avals)
            fill_rate = round(fill_count / cat_total, 3) if cat_total > 0 else 0.0
            attr_nid = make_id("attr", f"{cat}::{aname}")
            if not any(n["id"] == attr_nid for n in nodes):
                nodes.append({
                    "id": attr_nid,
                    "label": aname,
                    "type": "attribute",
                    "fill_rate": fill_rate,
                    "filled_products": fill_count,
                    "total_products": cat_total
                })
                edges.append({"source": cat_nid, "target": attr_nid, "relation": "has_attribute"})
            category_stats.append({
                "category": cat,
                "attribute": aname,
                "fill_rate": fill_rate,
                "filled_products": fill_count,
                "total_products": cat_total
            })

            # Top LOV value nodes (max 5 per attribute)
            from collections import Counter
            top_vals = Counter(avals).most_common(5)
            for val, freq in top_vals:
                val_nid = make_id("lov", f"{aname}::{val}")
                if not any(n["id"] == val_nid for n in nodes):
                    nodes.append({"id": val_nid, "label": val, "type": "lov_value",
                                  "frequency": freq})
                    edges.append({"source": attr_nid, "target": val_nid, "relation": "has_value"})

    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": nodes,
        "edges": edges,
        "category_stats": sorted(category_stats, key=lambda x: x["fill_rate"], reverse=True),
        "summary": {
            "departments": len(dept_set),
            "classes": len(seen_classes),
            "categories": len(category_set),
            "total_products": len(products)
        }
    }
