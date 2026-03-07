"""Utilities for NL-to-SQL generation, validation, and execution."""

from __future__ import annotations

import re
from typing import Callable, Sequence

from services.database import query

SQL_SYSTEM_PROMPT = """You are a SQL query generator for Steeves and Associates analytics data.

Database tables:
1) time_entries
- customer_name (text)
- project (text)
- worked_date (date)
- task_or_ticket_title (text)
- resource_name (text)
- billable_hours (numeric)
- hourly_billing_rate (numeric)
- extended_price (numeric)

2) competitors
- company_name (text)
- hourly_rate (text range, e.g. '$150-200/hr')
- num_employees (text)
- founding_year (text)
- location (text)
- cloud_focus_pct (text like '80%')
- gold_certified (boolean)
- fasttrack_partner (boolean)
- elite_ems_partner (boolean)
- azure_circle_partner (boolean)
- leading_system_centre (boolean)

Rules:
1. Generate only one read-only SQL statement.
2. Allowed statement type: SELECT (CTE WITH ... SELECT is allowed).
3. Never generate INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, TRUNCATE, GRANT, REVOKE.
4. Include LIMIT <= 50.
5. Use SUM(extended_price) for revenue and SUM(billable_hours) for utilization questions.
6. For quarter logic, use EXTRACT(QUARTER FROM worked_date).
7. Return only SQL text, no explanations or markdown fences.
8. NEVER use UNION or UNION ALL between time_entries and competitors — their column types are
   incompatible (time_entries has numeric columns; competitors has text columns). To compare
   data across both tables use two separate CTEs or subqueries joined with a cross join or
   written as independent SELECT statements in a single CTE block.
9. When querying competitors.hourly_rate (stored as text like "$150-200/hr"), do not cast or
   compare it as a number — return it as-is or filter with LIKE/ILIKE.
"""

FORBIDDEN_KEYWORDS = {
    # DML / DDL
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    # PostgreSQL system / file-access functions
    "PG_READ_FILE",
    "PG_LS_DIR",
    "PG_READ_BINARY_FILE",
    "PG_STAT_FILE",
    "CURRENT_SETTING",
    "SET_CONFIG",
    "PG_SLEEP",
    "COPY",
    "EXECUTE",
}


def sanitize_sql_text(text: str) -> str:
    """Strip markdown fences and normalize whitespace."""
    sql = (text or "").strip()
    sql = re.sub(r"^```(?:sql)?", "", sql, flags=re.IGNORECASE).strip()
    sql = re.sub(r"```$", "", sql).strip()
    if "```" in sql:
        sql = sql.replace("```", " ")
    return sql.strip().rstrip(";")


def _reject_multiple_statements(sql: str) -> None:
    if ";" in sql:
        raise ValueError("Only a single SQL statement is allowed.")


def _validate_read_only(sql: str) -> None:
    sql_upper = sql.upper().strip()
    if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
        raise ValueError("Only SELECT statements are allowed.")

    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", sql_upper):
            raise ValueError(f"Forbidden SQL keyword detected: {keyword}")


def _enforce_limit(sql: str, max_limit: int = 50) -> str:
    limit_match = re.search(r"\bLIMIT\s+(\d+)\b", sql, flags=re.IGNORECASE)
    if not limit_match:
        return f"{sql} LIMIT {max_limit}"

    value = int(limit_match.group(1))
    if value <= max_limit:
        return sql

    return re.sub(
        r"\bLIMIT\s+\d+\b",
        f"LIMIT {max_limit}",
        sql,
        count=1,
        flags=re.IGNORECASE,
    )


def validate_and_finalize_sql(sql: str) -> str:
    """Validate generated SQL and enforce guardrails."""
    cleaned = sanitize_sql_text(sql)
    if not cleaned:
        raise ValueError("No SQL was generated.")

    _reject_multiple_statements(cleaned)
    _validate_read_only(cleaned)
    return _enforce_limit(cleaned, max_limit=50)


def generate_sql_from_question(
    question: str,
    llm_generate: Callable[[str, str, Sequence[dict] | None], tuple[str | None, str | None]],
    conversation_history: Sequence[dict] | None = None,
) -> str:
    """Generate and validate SQL for a natural language question."""
    user_prompt = f"Generate SQL for this user question:\n{question}"
    sql_text, err = llm_generate(SQL_SYSTEM_PROMPT, user_prompt, conversation_history)
    if err:
        raise ValueError(err)
    return validate_and_finalize_sql(sql_text or "")


def execute_read_only_sql(sql: str):
    """Execute validated SQL and return rows."""
    finalized = validate_and_finalize_sql(sql)
    return query(finalized)


def infer_sources_from_sql(sql: str) -> list[str]:
    """Infer data source labels from SQL text for UI/source metadata."""
    lower = sql.lower()
    sources: list[str] = []

    if "time_entries" in lower:
        sources.append("operational")
    if "competitors" in lower:
        sources.append("competitive")

    if not sources:
        sources.append("operational")

    return sources
