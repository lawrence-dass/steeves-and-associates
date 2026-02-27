"""Resource allocation recommendation APIs."""

from flask import Blueprint, jsonify, request

from services.resource_allocator import (
    get_allocation_inputs,
    get_known_customers,
    load_resource_rows,
    recommend_resources,
)

allocation_bp = Blueprint("allocation", __name__)


@allocation_bp.route("/inputs", methods=["GET"])
def allocation_inputs():
    """Get customers, resources, and category options for recommendation UI."""
    return jsonify(get_allocation_inputs())


@allocation_bp.route("/recommend", methods=["POST"])
def allocation_recommend():
    """Recommend resources for a project request."""
    data = request.get_json(silent=True) or {}

    customer_name = str(data.get("customer_name") or "").strip()
    category = str(data.get("category") or "").strip() or None
    existing_team = data.get("existing_team") or []
    top_n = data.get("top_n", 5)

    if not customer_name:
        return jsonify({"error": "customer_name is required"}), 400

    if not isinstance(existing_team, list):
        return jsonify({"error": "existing_team must be an array"}), 400

    try:
        top_n = int(top_n)
    except (TypeError, ValueError):
        top_n = 5

    known_customers = get_known_customers(load_resource_rows())
    if customer_name not in known_customers:
        return jsonify(
            {
                "error": "Unknown customer_name",
                "known_customers": known_customers,
            }
        ), 400

    recommendations = recommend_resources(
        customer_name=customer_name,
        category=category,
        existing_team=[str(name).strip() for name in existing_team if str(name).strip()],
        top_n=max(1, min(top_n, 10)),
    )

    return jsonify(recommendations)
