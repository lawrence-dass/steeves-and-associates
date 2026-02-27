"""Predictive resource recommendation engine."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from services.database import query


class ResourceAllocator:
    """Recommend consultant assignments from historical delivery patterns."""

    WEIGHTS = {
        "experience": 0.35,
        "performance": 0.30,
        "availability": 0.20,
        "collaboration": 0.15,
    }

    def __init__(self, rows: list[dict]):
        self.rows = [self._normalize_row(row) for row in rows]
        self.rows = [row for row in self.rows if row]

        self.latest_date = max((row["worked_date"] for row in self.rows), default=None)
        self.customer_project_resources = self._build_customer_project_index()
        self.profiles = self._build_profiles()

    @staticmethod
    def _normalize_row(row: dict) -> dict | None:
        resource_name = str(row.get("resource_name") or "").strip()
        customer_name = str(row.get("customer_name") or "").strip()
        project_name = str(row.get("project") or "").strip()
        worked_date = row.get("worked_date")

        if not resource_name or not customer_name or not project_name or worked_date is None:
            return None

        return {
            "resource_name": resource_name,
            "customer_name": customer_name,
            "project": project_name,
            "worked_date": worked_date,
            "billable_hours": float(row.get("billable_hours") or 0),
            "hourly_billing_rate": float(row.get("hourly_billing_rate") or 0),
            "extended_price": float(row.get("extended_price") or 0),
        }

    def _build_customer_project_index(self) -> dict[tuple[str, str], set[str]]:
        index: dict[tuple[str, str], set[str]] = defaultdict(set)

        for row in self.rows:
            resource = row["resource_name"]
            if resource.lower() == "contractor":
                continue
            key = (row["customer_name"], row["project"])
            index[key].add(resource)

        return index

    def _build_profiles(self) -> dict[str, dict]:
        grouped: dict[str, list[dict]] = defaultdict(list)

        for row in self.rows:
            resource = row["resource_name"]
            if resource.lower() == "contractor":
                continue
            grouped[resource].append(row)

        profiles: dict[str, dict] = {}

        for resource, records in grouped.items():
            customer_hours: dict[str, float] = defaultdict(float)
            project_hours: dict[str, float] = defaultdict(float)
            monthly_hours: dict[tuple[int, int], float] = defaultdict(float)

            total_hours = 0.0
            total_revenue = 0.0
            rate_sum = 0.0
            rate_count = 0

            recent_cutoff = self.latest_date - timedelta(days=30) if self.latest_date else None
            recent_hours = 0.0

            for row in records:
                total_hours += row["billable_hours"]
                total_revenue += row["extended_price"]

                if row["hourly_billing_rate"] > 0:
                    rate_sum += row["hourly_billing_rate"]
                    rate_count += 1

                customer_hours[row["customer_name"]] += row["billable_hours"]
                project_hours[row["project"]] += row["billable_hours"]

                ym = (row["worked_date"].year, row["worked_date"].month)
                monthly_hours[ym] += row["billable_hours"]

                if recent_cutoff and row["worked_date"] >= recent_cutoff:
                    recent_hours += row["billable_hours"]

            avg_monthly_hours = (
                sum(monthly_hours.values()) / len(monthly_hours)
                if monthly_hours
                else 0.0
            )

            coworkers = self._get_coworkers(resource, records)

            profiles[resource] = {
                "total_hours": total_hours,
                "total_revenue": total_revenue,
                "avg_rate": (rate_sum / rate_count) if rate_count else 0.0,
                "customers": dict(customer_hours),
                "projects": dict(project_hours),
                "recent_hours": recent_hours,
                "avg_monthly_hours": avg_monthly_hours,
                "co_workers": coworkers,
            }

        return profiles

    def _get_coworkers(self, resource: str, records: list[dict]) -> dict[str, int]:
        coworkers: dict[str, int] = defaultdict(int)
        visited_pairs = set()

        for row in records:
            pair = (row["customer_name"], row["project"])
            if pair in visited_pairs:
                continue
            visited_pairs.add(pair)

            peers = self.customer_project_resources.get(pair, set())
            for peer in peers:
                if peer != resource:
                    coworkers[peer] += 1

        return dict(coworkers)

    def _experience_score(self, profile: dict, customer_name: str, category: str | None) -> float:
        total_hours = profile["total_hours"]
        if total_hours <= 0:
            return 0.0

        customer_hours = profile["customers"].get(customer_name, 0.0)
        customer_component = min((customer_hours / total_hours) * 200, 60)

        category_component = 0.0
        if category:
            needle = category.lower().strip()
            matched = sum(
                hours
                for project_name, hours in profile["projects"].items()
                if needle in project_name.lower()
            )
            category_component = min((matched / total_hours) * 100, 40)

        return max(0.0, min(100.0, customer_component + category_component))

    def _performance_score(self, profile: dict) -> float:
        if profile["total_hours"] <= 0:
            return 0.0

        efficiency = profile["total_revenue"] / profile["total_hours"]
        return max(0.0, min(100.0, efficiency / 2.5))

    def _availability_score(self, profile: dict) -> float:
        avg_monthly = profile["avg_monthly_hours"]
        if avg_monthly <= 0:
            return 100.0

        load_ratio = profile["recent_hours"] / avg_monthly
        return max(0.0, min(100.0, (2 - load_ratio) * 50))

    def _collaboration_score(self, profile: dict, team: list[str]) -> float:
        if not team:
            return 50.0

        co_workers = profile["co_workers"]
        total_shared_projects = sum(co_workers.get(member, 0) for member in team)
        return max(0.0, min(100.0, total_shared_projects * 20))

    def _generate_rationale(self, profile: dict, customer_name: str) -> str:
        snippets = []

        prior_hours = profile["customers"].get(customer_name, 0.0)
        if prior_hours > 0:
            snippets.append(f"{prior_hours:.0f} historical hours with {customer_name}")

        avg_rate = profile["avg_rate"]
        if avg_rate > 0:
            snippets.append(f"avg billing rate ${avg_rate:.0f}/hr")

        if not snippets:
            return "General availability and cross-client delivery experience"

        return "; ".join(snippets)

    def recommend(
        self,
        customer_name: str,
        category: str | None = None,
        team: list[str] | None = None,
        top_n: int = 5,
    ) -> list[dict]:
        team = team or []
        top_n = max(1, min(int(top_n or 5), 10))

        scores = []

        for resource, profile in self.profiles.items():
            experience = self._experience_score(profile, customer_name, category)
            performance = self._performance_score(profile)
            availability = self._availability_score(profile)
            collaboration = self._collaboration_score(profile, team)

            composite = (
                experience * self.WEIGHTS["experience"]
                + performance * self.WEIGHTS["performance"]
                + availability * self.WEIGHTS["availability"]
                + collaboration * self.WEIGHTS["collaboration"]
            )

            scores.append(
                {
                    "resource": resource,
                    "score": round(composite, 1),
                    "experience": round(experience, 1),
                    "performance": round(performance, 1),
                    "availability": round(availability, 1),
                    "collaboration": round(collaboration, 1),
                    "rationale": self._generate_rationale(profile, customer_name),
                }
            )

        scores.sort(key=lambda item: item["score"], reverse=True)
        return scores[:top_n]


def load_resource_rows() -> list[dict]:
    """Load operational rows required for recommendations."""
    return query(
        """
        SELECT
            customer_name,
            project,
            worked_date,
            resource_name,
            billable_hours,
            hourly_billing_rate,
            extended_price
        FROM time_entries
        WHERE worked_date IS NOT NULL
          AND resource_name IS NOT NULL
        """
    )


def get_known_customers(rows: list[dict] | None = None) -> list[str]:
    """Distinct customer names sorted alphabetically."""
    source_rows = rows if rows is not None else load_resource_rows()
    names = sorted(
        {
            str(row.get("customer_name") or "").strip()
            for row in source_rows
            if str(row.get("customer_name") or "").strip()
        }
    )
    return names


def extract_customer_from_query(message: str, known_customers: list[str]) -> str | None:
    """Best-effort customer extraction from free-text question."""
    normalized_message = f" {message.lower()} "

    best_match = None
    best_len = 0

    for customer in known_customers:
        needle = customer.lower().strip()
        if not needle:
            continue
        if f" {needle} " in normalized_message and len(needle) > best_len:
            best_match = customer
            best_len = len(needle)

    return best_match


def recommend_resources(
    customer_name: str,
    category: str | None = None,
    existing_team: list[str] | None = None,
    top_n: int = 5,
) -> list[dict]:
    """Convenience wrapper for API routes/chat integration."""
    rows = load_resource_rows()
    allocator = ResourceAllocator(rows)
    return allocator.recommend(
        customer_name=customer_name,
        category=category,
        team=existing_team or [],
        top_n=top_n,
    )


def get_allocation_inputs() -> dict:
    """Return frontend form options for resource recommendation UI."""
    rows = load_resource_rows()
    customers = get_known_customers(rows)
    resources = sorted(
        {
            str(row.get("resource_name") or "").strip()
            for row in rows
            if str(row.get("resource_name") or "").strip()
            and str(row.get("resource_name") or "").strip().lower() != "contractor"
        }
    )

    return {
        "customers": customers,
        "resources": resources,
        "categories": [
            "Security",
            "Cloud Migration",
            "Data Analytics",
            "Modern Workplace",
            "Infrastructure",
            "Other",
        ],
    }
