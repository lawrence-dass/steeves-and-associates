"""
Overview routes — KPIs, revenue trends, top clients, top resources.
"""
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from services.database import query

overview_bp = Blueprint("overview", __name__)


def parse_month(value):
    """Parse a YYYY-MM month string to first day of month."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m").date().replace(day=1)
    except ValueError:
        return None


def next_month_start(month_start):
    """Return first day of month following month_start."""
    return (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)


def get_time_window_filter():
    """Build SQL WHERE clause and params for optional month window."""
    start_month = parse_month(request.args.get("start_month"))
    end_month = parse_month(request.args.get("end_month"))

    clauses = []
    params = []

    if start_month:
        clauses.append("worked_date >= %s")
        params.append(start_month)

    if end_month:
        clauses.append("worked_date < %s")
        params.append(next_month_start(end_month))

    if not clauses:
        return "", []

    return f"WHERE {' AND '.join(clauses)}", params


def get_limit(default_value=10, min_value=1, max_value=25):
    """Read and clamp a numeric limit query param."""
    value = request.args.get("limit", default_value, type=int) or default_value
    return max(min_value, min(value, max_value))


@overview_bp.route("/filter-options")
def filter_options():
    """Available month bounds and month list for frontend filter controls."""
    bounds = query("""
        SELECT
            TO_CHAR(MIN(worked_date), 'YYYY-MM') as min_month,
            TO_CHAR(MAX(worked_date), 'YYYY-MM') as max_month
        FROM time_entries
    """)
    months = query("""
        SELECT TO_CHAR(worked_date, 'YYYY-MM') as month
        FROM time_entries
        GROUP BY month
        ORDER BY month
    """)

    payload = bounds[0] if bounds else {"min_month": None, "max_month": None}
    payload["available_months"] = [row["month"] for row in months if row.get("month")]
    return jsonify(payload)


@overview_bp.route("/kpis")
def get_kpis():
    """Core KPI cards for the overview page."""
    where_sql, params = get_time_window_filter()
    result = query(f"""
        SELECT 
            ROUND(SUM(extended_price)::numeric, 2) as total_revenue,
            ROUND(SUM(billable_hours)::numeric, 2) as total_hours,
            COUNT(DISTINCT customer_name) as total_customers,
            COUNT(DISTINCT resource_name) as total_resources,
            COUNT(DISTINCT project) as total_projects,
            ROUND(AVG(hourly_billing_rate)::numeric, 2) as avg_rate
        FROM time_entries
        {where_sql}
    """, tuple(params))
    return jsonify(result[0] if result else {})


@overview_bp.route("/revenue-trend")
def revenue_trend():
    """Monthly revenue and hours for trend chart."""
    where_sql, params = get_time_window_filter()
    result = query(f"""
        SELECT 
            TO_CHAR(worked_date, 'YYYY-MM') as month,
            ROUND(SUM(extended_price)::numeric, 2) as revenue,
            ROUND(SUM(billable_hours)::numeric, 2) as hours,
            COUNT(DISTINCT customer_name) as active_customers
        FROM time_entries
        {where_sql}
        GROUP BY month
        ORDER BY month
    """, tuple(params))
    return jsonify(result)


@overview_bp.route("/top-customers")
def top_customers():
    """Top customers by revenue."""
    where_sql, params = get_time_window_filter()
    limit = get_limit(default_value=10, min_value=1, max_value=30)
    result = query(f"""
        SELECT 
            customer_name,
            ROUND(SUM(extended_price)::numeric, 2) as revenue,
            ROUND(SUM(billable_hours)::numeric, 2) as hours,
            COUNT(DISTINCT project) as projects,
            COUNT(DISTINCT resource_name) as resources_used,
            ROUND(AVG(hourly_billing_rate)::numeric, 2) as avg_rate
        FROM time_entries
        {where_sql}
        GROUP BY customer_name
        ORDER BY revenue DESC
        LIMIT %s
    """, tuple(params + [limit]))
    return jsonify(result)


@overview_bp.route("/top-resources")
def top_resources():
    """Top resources by revenue."""
    where_sql, params = get_time_window_filter()
    limit = get_limit(default_value=10, min_value=1, max_value=30)
    result = query(f"""
        SELECT 
            resource_name,
            ROUND(SUM(extended_price)::numeric, 2) as revenue,
            ROUND(SUM(billable_hours)::numeric, 2) as hours,
            COUNT(DISTINCT customer_name) as clients,
            COUNT(DISTINCT project) as projects,
            ROUND(AVG(hourly_billing_rate)::numeric, 2) as avg_rate
        FROM time_entries
        {where_sql}
        GROUP BY resource_name
        ORDER BY revenue DESC
        LIMIT %s
    """, tuple(params + [limit]))
    return jsonify(result)


@overview_bp.route("/revenue-by-customer")
def revenue_by_customer():
    """Revenue breakdown by customer for pie/bar chart."""
    where_sql, params = get_time_window_filter()
    limit = get_limit(default_value=10, min_value=3, max_value=30)
    result = query(f"""
        SELECT 
            customer_name,
            ROUND(SUM(extended_price)::numeric, 2) as revenue,
            ROUND(SUM(extended_price) * 100.0 / SUM(SUM(extended_price)) OVER(), 2) as pct
        FROM time_entries
        {where_sql}
        GROUP BY customer_name
        ORDER BY revenue DESC
        LIMIT %s
    """, tuple(params + [limit]))
    return jsonify(result)
