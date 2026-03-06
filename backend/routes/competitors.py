"""
Competitors routes — market positioning, comparisons, benchmarks.
"""
import re
from collections import defaultdict
from flask import Blueprint, jsonify, request
from services.database import query

competitors_bp = Blueprint("competitors", __name__)

RATE_RANGE_RE = re.compile(r"\$?\s*(\d+)\s*-\s*\$?\s*(\d+)")
NUMBER_RE = re.compile(r"(\d+)")

CERT_KEYS = [
    "gold_certified",
    "fasttrack_partner",
    "elite_ems_partner",
    "azure_circle_partner",
    "leading_system_centre",
]


def parse_hourly_rate(value):
    """Parse '$90-120/hr' style strings into low/high/midpoint numbers."""
    text = str(value or "")
    match = RATE_RANGE_RE.search(text)
    if match:
        low = float(match.group(1))
        high = float(match.group(2))
        return low, high, round((low + high) / 2, 2)

    numbers = NUMBER_RE.findall(text)
    if numbers:
        val = float(numbers[0])
        return val, val, val

    return None, None, None


def parse_numeric_percent(value):
    """Parse '85%' style strings into numeric values."""
    match = NUMBER_RE.search(str(value or ""))
    return float(match.group(1)) if match else None


def parse_employee_midpoint(value):
    """Parse employee range strings to an approximate midpoint."""
    text = str(value or "").strip()
    range_match = re.search(r"(\d+)\s*-\s*(\d+)", text)
    if range_match:
        low = float(range_match.group(1))
        high = float(range_match.group(2))
        return round((low + high) / 2, 2)

    plus_match = re.search(r"(\d+)\s*\+", text)
    if plus_match:
        return float(plus_match.group(1))

    single_match = NUMBER_RE.search(text)
    if single_match:
        return float(single_match.group(1))

    return None


def cert_count(row):
    """Total number of key certifications/partner statuses."""
    return sum(1 for key in CERT_KEYS if row.get(key))


def enrich_company(row):
    """Add derived numeric fields used by filtering and charts."""
    rate_low, rate_high, rate_mid = parse_hourly_rate(row.get("hourly_rate"))
    cloud_focus_num = parse_numeric_percent(row.get("cloud_focus_pct"))

    return {
        **row,
        "hourly_rate_low": rate_low,
        "hourly_rate_high": rate_high,
        "hourly_rate_mid": rate_mid,
        "cloud_focus_pct_num": cloud_focus_num,
        "employee_size_num": parse_employee_midpoint(row.get("num_employees")),
        "cert_count": cert_count(row),
        "is_steeves": row.get("company_name") == "Steeves and Associates",
    }


def load_competitors():
    """Load all competitors and attach derived fields."""
    result = query(
        """
        SELECT company_name, hourly_rate, num_employees, founding_year,
               location, cloud_focus_pct, gold_certified, fasttrack_partner,
               elite_ems_partner, azure_circle_partner, leading_system_centre,
               website
        FROM competitors
        ORDER BY company_name
    """
    )
    return [enrich_company(row) for row in result]


def parse_filters():
    """Parse and normalize filter query params."""
    location = (request.args.get("location") or "").strip()
    min_certs = request.args.get("min_certs", 0, type=int) or 0
    min_certs = max(0, min(min_certs, 5))

    min_cloud = request.args.get("min_cloud", 0, type=float)
    max_cloud = request.args.get("max_cloud", 100, type=float)

    min_rate = request.args.get("min_rate", type=float)
    max_rate = request.args.get("max_rate", type=float)

    include_steeves = request.args.get("include_steeves", "true").lower() != "false"

    if min_rate is not None and max_rate is not None and min_rate > max_rate:
        min_rate, max_rate = max_rate, min_rate

    return {
        "location": location,
        "min_certs": min_certs,
        "min_cloud": min_cloud,
        "max_cloud": max_cloud,
        "min_rate": min_rate,
        "max_rate": max_rate,
        "include_steeves": include_steeves,
    }


def apply_filters(rows, filters):
    """Apply optional filters to enriched competitor rows."""
    filtered = []

    has_cloud_filter = (
        (filters["min_cloud"] is not None and filters["min_cloud"] > 0)
        or (filters["max_cloud"] is not None and filters["max_cloud"] < 100)
    )
    has_rate_filter = filters["min_rate"] is not None or filters["max_rate"] is not None

    for row in rows:
        if not filters["include_steeves"] and row.get("is_steeves"):
            continue

        if filters["location"] and filters["location"].lower() != "all":
            if (row.get("location") or "") != filters["location"]:
                continue

        if row.get("cert_count", 0) < filters["min_certs"]:
            continue

        if has_cloud_filter:
            cloud = row.get("cloud_focus_pct_num")
            if cloud is None:
                continue
            if filters["min_cloud"] is not None and cloud < filters["min_cloud"]:
                continue
            if filters["max_cloud"] is not None and cloud > filters["max_cloud"]:
                continue

        if has_rate_filter:
            rate_mid = row.get("hourly_rate_mid")
            if rate_mid is None:
                continue
            if filters["min_rate"] is not None and rate_mid < filters["min_rate"]:
                continue
            if filters["max_rate"] is not None and rate_mid > filters["max_rate"]:
                continue

        filtered.append(row)

    return filtered


def average_metric(rows, key):
    """Average helper for numeric row keys."""
    values = [row.get(key) for row in rows if row.get(key) is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def rank_company(rows, company_name, key):
    """1-based rank for company by key (descending), or None if unavailable."""
    ranked = [row for row in rows if row.get(key) is not None]
    ranked.sort(key=lambda row: row.get(key), reverse=True)

    for index, row in enumerate(ranked, start=1):
        if row.get("company_name") == company_name:
            return index
    return None


def get_rows_with_filters():
    """Load all rows once and return both full and filtered lists."""
    all_rows = load_competitors()
    filters = parse_filters()
    filtered_rows = apply_filters(all_rows, filters)
    return all_rows, filtered_rows


@competitors_bp.route("/filter-options")
def filter_options():
    """Return available filter values and numeric bounds."""
    all_rows = load_competitors()

    locations = sorted({row.get("location") or "Unknown" for row in all_rows})

    rate_values = [row.get("hourly_rate_mid") for row in all_rows if row.get("hourly_rate_mid") is not None]
    cloud_values = [row.get("cloud_focus_pct_num") for row in all_rows if row.get("cloud_focus_pct_num") is not None]

    return jsonify(
        {
            "locations": locations,
            "rate_min": min(rate_values) if rate_values else None,
            "rate_max": max(rate_values) if rate_values else None,
            "cloud_min": min(cloud_values) if cloud_values else None,
            "cloud_max": max(cloud_values) if cloud_values else None,
            "max_certs": 5,
            "total_companies": len(all_rows),
        }
    )


@competitors_bp.route("/all")
def get_all():
    """All competitors after optional filtering."""
    _, filtered_rows = get_rows_with_filters()
    return jsonify(filtered_rows)


@competitors_bp.route("/summary")
def summary():
    """Market summary stats plus Steeves ranking in current filtered set."""
    all_rows, filtered_rows = get_rows_with_filters()
    steeves = next((row for row in filtered_rows if row.get("is_steeves")), None)

    payload = {
        "total_companies": len(filtered_rows),
        "total_dataset_companies": len(all_rows),
        "gold_certified_count": sum(1 for row in filtered_rows if row.get("gold_certified")),
        "fasttrack_count": sum(1 for row in filtered_rows if row.get("fasttrack_partner")),
        "avg_rate_mid": average_metric(filtered_rows, "hourly_rate_mid"),
        "avg_cloud_focus": average_metric(filtered_rows, "cloud_focus_pct_num"),
        "avg_cert_count": average_metric(filtered_rows, "cert_count"),
        "steeves": None,
    }

    if steeves:
        payload["steeves"] = {
            "company_name": steeves.get("company_name"),
            "hourly_rate_mid": steeves.get("hourly_rate_mid"),
            "cloud_focus_pct_num": steeves.get("cloud_focus_pct_num"),
            "cert_count": steeves.get("cert_count"),
            "rate_rank": rank_company(filtered_rows, steeves.get("company_name"), "hourly_rate_mid"),
            "cloud_rank": rank_company(filtered_rows, steeves.get("company_name"), "cloud_focus_pct_num"),
            "cert_rank": rank_company(filtered_rows, steeves.get("company_name"), "cert_count"),
        }

    return jsonify(payload)


@competitors_bp.route("/by-location")
def by_location():
    """Companies grouped by location for the current filtered set."""
    _, filtered_rows = get_rows_with_filters()

    groups = defaultdict(list)
    for row in filtered_rows:
        groups[row.get("location") or "Unknown"].append(row.get("company_name"))

    result = [
        {
            "location": location,
            "count": len(companies),
            "companies": sorted(companies),
        }
        for location, companies in groups.items()
    ]

    result.sort(key=lambda item: (-item["count"], item["location"]))
    return jsonify(result)


EMPLOYEE_BANDS = [
    (0,   10,  "1–10"),
    (10,  20,  "11–20"),
    (20,  30,  "21–30"),
    (30,  40,  "31–40"),
    (40,  50,  "41–50"),
    (50,  60,  "51–60"),
    (60,  70,  "61–70"),
    (70,  80,  "71–80"),
    (80,  90,  "81–90"),
    (90,  100, "91–100"),
    (100, float("inf"), "100+"),
]


def normalize_employee_band(midpoint):
    """Map a numeric employee midpoint to a standardised band label."""
    if midpoint is None:
        return "Unknown"
    for low, high, label in EMPLOYEE_BANDS:
        if low < midpoint <= high:
            return label
    if midpoint == 0:
        return EMPLOYEE_BANDS[0][2]
    return "Unknown"


@competitors_bp.route("/by-size")
def by_size():
    """Companies grouped by normalised employee band for the current filtered set."""
    _, filtered_rows = get_rows_with_filters()

    groups = defaultdict(list)
    for row in filtered_rows:
        band = normalize_employee_band(row.get("employee_size_num"))
        groups[band].append(row.get("company_name"))

    band_order = [label for _, _, label in EMPLOYEE_BANDS] + ["Unknown"]
    result = [
        {
            "num_employees": band,
            "count": len(groups[band]),
            "companies": sorted(groups[band]),
        }
        for band in band_order
        if band in groups
    ]

    return jsonify(result)


@competitors_bp.route("/steeves-position")
def steeves_position():
    """Steeves profile and certification leaderboard in current filtered set."""
    _, filtered_rows = get_rows_with_filters()

    steeves = next((row for row in filtered_rows if row.get("is_steeves")), None)

    cert_counts = sorted(
        [
            {
                "company_name": row.get("company_name"),
                "cert_count": row.get("cert_count", 0),
            }
            for row in filtered_rows
        ],
        key=lambda item: item["cert_count"],
        reverse=True,
    )

    return jsonify(
        {
            "steeves": steeves,
            "certification_ranking": cert_counts[:10],
            "total_companies": len(filtered_rows),
        }
    )
