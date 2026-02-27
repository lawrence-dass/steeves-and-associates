"""Client health scoring engine and helpers."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Iterable

from services.database import query

WEIGHTS = {
    "recency": 0.30,
    "frequency": 0.25,
    "monetary": 0.25,
    "trend": 0.20,
}


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _clip(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _quarter_key(day: date) -> tuple[int, int]:
    quarter = ((day.month - 1) // 3) + 1
    return day.year, quarter


def _linear_slope(values: Iterable[float]) -> float:
    series = list(values)
    n = len(series)
    if n < 2:
        return 0.0

    x_mean = (n - 1) / 2
    y_mean = sum(series) / n

    numerator = 0.0
    denominator = 0.0
    for idx, y_val in enumerate(series):
        dx = idx - x_mean
        numerator += dx * (y_val - y_mean)
        denominator += dx * dx

    if denominator == 0:
        return 0.0

    return numerator / denominator


def load_client_health_rows() -> list[dict]:
    """Load minimal operational fields required for client health scoring."""
    return query(
        """
        SELECT customer_name, worked_date, extended_price
        FROM time_entries
        WHERE customer_name IS NOT NULL
          AND worked_date IS NOT NULL
        ORDER BY worked_date
        """
    )


def score_clients(rows: list[dict] | None = None, reference_date: date | None = None) -> list[dict]:
    """Compute health score per client (0-100) with risk bands."""
    source_rows = rows if rows is not None else load_client_health_rows()

    by_customer: dict[str, list[tuple[date, float]]] = defaultdict(list)
    latest_date: date | None = reference_date

    for row in source_rows:
        customer_name = str(row.get("customer_name") or "").strip()
        worked_day = row.get("worked_date")
        if not customer_name or worked_day is None:
            continue

        revenue = _to_float(row.get("extended_price"))
        by_customer[customer_name].append((worked_day, revenue))

        if latest_date is None or worked_day > latest_date:
            latest_date = worked_day

    if latest_date is None:
        return []

    results = []

    for customer_name, entries in by_customer.items():
        entries.sort(key=lambda item: item[0])

        last_activity = entries[-1][0]
        days_since = (latest_date - last_activity).days

        if days_since <= 14:
            recency_score = 100.0
        elif days_since <= 30:
            recency_score = 80.0
        elif days_since <= 60:
            recency_score = 50.0
        elif days_since <= 90:
            recency_score = 25.0
        else:
            recency_score = _clip(10 - ((days_since - 90) / 30), 0.0, 25.0)

        trailing_cutoff = latest_date - timedelta(days=365)
        active_months = {
            (worked_day.year, worked_day.month)
            for worked_day, _ in entries
            if worked_day >= trailing_cutoff
        }
        frequency_score = min(100.0, (len(active_months) / 12) * 100)

        quarter_revenue: dict[tuple[int, int], float] = defaultdict(float)
        for worked_day, revenue in entries:
            quarter_revenue[_quarter_key(worked_day)] += revenue

        ordered_quarter_keys = sorted(quarter_revenue)
        quarterly_values = [quarter_revenue[key] for key in ordered_quarter_keys]

        if len(quarterly_values) < 2:
            monetary_score = 50.0
        else:
            recent = quarterly_values[-1]
            prior = quarterly_values[-2]
            if prior == 0:
                monetary_score = 75.0 if recent > 0 else 25.0
            else:
                growth = (recent - prior) / prior
                monetary_score = _clip(50 + (growth * 100))

        trend_values = quarterly_values[-4:]
        if len(trend_values) < 3:
            trend_score = 50.0
        else:
            slope = _linear_slope(trend_values)
            mean_value = sum(trend_values) / len(trend_values)
            normalized_slope = 0.0 if mean_value == 0 else (slope / mean_value) * 100
            trend_score = _clip(50 + normalized_slope)

        health_score = (
            recency_score * WEIGHTS["recency"]
            + frequency_score * WEIGHTS["frequency"]
            + monetary_score * WEIGHTS["monetary"]
            + trend_score * WEIGHTS["trend"]
        )

        if health_score >= 70:
            risk_level = "Healthy"
        elif health_score >= 40:
            risk_level = "Watch"
        else:
            risk_level = "At-Risk"

        total_revenue = round(sum(value for _, value in entries), 2)

        results.append(
            {
                "customer_name": customer_name,
                "recency_score": round(recency_score, 1),
                "frequency_score": round(frequency_score, 1),
                "monetary_score": round(monetary_score, 1),
                "trend_score": round(trend_score, 1),
                "health_score": round(health_score, 1),
                "risk_level": risk_level,
                "total_revenue": total_revenue,
                "last_activity": last_activity.isoformat(),
            }
        )

    results.sort(key=lambda item: (item["health_score"], -item["total_revenue"]))
    return results


def summarize_client_health(scores: list[dict]) -> dict:
    """Return aggregate counts and top-risk subsets for UI/chat."""
    summary = {
        "total_clients": len(scores),
        "healthy_count": 0,
        "watch_count": 0,
        "at_risk_count": 0,
        "avg_health_score": 0.0,
        "top_at_risk": [],
        "top_watch": [],
        "top_healthy": [],
    }

    if not scores:
        return summary

    for row in scores:
        if row["risk_level"] == "Healthy":
            summary["healthy_count"] += 1
        elif row["risk_level"] == "Watch":
            summary["watch_count"] += 1
        else:
            summary["at_risk_count"] += 1

    summary["avg_health_score"] = round(
        sum(row["health_score"] for row in scores) / len(scores),
        1,
    )

    summary["top_at_risk"] = [
        {"customer_name": row["customer_name"], "health_score": row["health_score"]}
        for row in scores
        if row["risk_level"] == "At-Risk"
    ][:10]

    summary["top_watch"] = [
        {"customer_name": row["customer_name"], "health_score": row["health_score"]}
        for row in scores
        if row["risk_level"] == "Watch"
    ][:10]

    summary["top_healthy"] = [
        {"customer_name": row["customer_name"], "health_score": row["health_score"]}
        for row in sorted(scores, key=lambda item: item["health_score"], reverse=True)
    ][:10]

    return summary


def get_client_health_detail(customer_name: str, scores: list[dict] | None = None) -> dict | None:
    """Lookup one client health record by exact name (case-insensitive)."""
    if not customer_name:
        return None

    rows = scores if scores is not None else score_clients()
    needle = customer_name.strip().lower()

    for row in rows:
        if str(row.get("customer_name", "")).strip().lower() == needle:
            return row

    return None
