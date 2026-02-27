"""Client health score APIs."""

from flask import Blueprint, jsonify, request

from services.client_health import get_client_health_detail, score_clients, summarize_client_health

health_bp = Blueprint("client_health", __name__)


@health_bp.route("", methods=["GET"])
def list_client_health():
    """List scored client health records with optional risk filter."""
    risk = (request.args.get("risk") or "").strip().lower()
    limit = request.args.get("limit", type=int)

    scores = score_clients()

    if risk:
        normalized = {
            "healthy": "Healthy",
            "watch": "Watch",
            "at-risk": "At-Risk",
            "atrisk": "At-Risk",
        }.get(risk)
        if normalized:
            scores = [row for row in scores if row["risk_level"] == normalized]

    if limit is not None and limit > 0:
        scores = scores[: min(limit, 200)]

    return jsonify(scores)


@health_bp.route("/summary", methods=["GET"])
def client_health_summary():
    """Aggregate summary of client health risk distribution."""
    scores = score_clients()
    return jsonify(summarize_client_health(scores))


@health_bp.route("/<path:customer_name>", methods=["GET"])
def client_health_detail(customer_name):
    """Detailed health score for a specific client."""
    scores = score_clients()
    detail = get_client_health_detail(customer_name, scores)

    if detail is None:
        return jsonify({"error": "Client not found"}), 404

    return jsonify(detail)
