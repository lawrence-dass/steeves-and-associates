"""LLM chat service with intent routing and NL-to-SQL execution."""

from __future__ import annotations

import json
import os
from typing import Sequence

import requests

from services.client_health import score_clients, summarize_client_health
from services.resource_allocator import (
    extract_customer_from_query,
    get_known_customers,
    get_allocation_inputs,
    recommend_resources,
)
from services.sql_generator import (
    execute_read_only_sql,
    generate_sql_from_question,
    infer_sources_from_sql,
)
from services.database import query

try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None

GEMINI_MODEL_NAME = "gemini-2.0-flash"

gemini_model = None
gemini_model_init_error = None

SOURCE_REFERENCE = {
    "operational": {
        "label": "Operational Data",
        "file": "database/Steeves_and_Associates_2020_2025.xlsx",
    },
    "competitive": {
        "label": "Competitive Data",
        "file": "backend/data/microsoft-azure-partners-canada__new_1.csv",
    },
    "powerbi": {
        "label": "Power BI Data",
        "file": "Power BI workspace semantic model",
    },
}

SYSTEM_PROMPT = """You are an AI analytics assistant for Steeves and Associates,
a Microsoft consulting firm in Canada.

You help answer questions about:
1) operational metrics from the PostgreSQL analytics database
2) competitive positioning vs Canadian Microsoft partners
3) Power BI reporting context

Rules:
- Be concise and direct.
- Use specific numbers whenever available.
- Format currency as $ with commas and 2 decimals when needed.
- If data is insufficient, say so clearly.
"""

GENERAL_ASSISTANT_PROMPT = """You are a helpful assistant for a consulting analytics app.
Answer briefly and clearly."""

INTENT_CLASSIFIER_PROMPT = """Classify this user message into exactly one category:
- data_query: asks for specific numbers, metrics, rankings, comparisons, or trends from database tables
- client_health: asks about client risk, churn, engagement health, at-risk clients, retention
- resource_recommend: asks who to assign, recommend, or allocate to a project/client
- document_qa: asks qualitative company/process/domain questions
- general: greeting, clarification, or small-talk

Respond with only the category name.

User message: {user_message}
"""

SQL_NARRATOR_PROMPT = """You are translating SQL results into a business answer.
Provide:
1) direct answer to the question with exact values
2) one notable pattern or outlier if present
Keep it concise."""

CLIENT_HEALTH_PROMPT = """You are analyzing client health scores.
Explain the risk situation clearly, prioritize at-risk clients, and include specific scores."""

RESOURCE_RECOMMEND_PROMPT = """You are presenting consultant assignment recommendations.
Explain the top recommendations and why they fit based on historical evidence."""


def format_source_references(source_keys: Sequence[str]) -> str:
    """Return a readable source reference block for chat responses."""
    lines = []
    seen = set()

    for key in source_keys:
        if key in seen:
            continue
        seen.add(key)
        details = SOURCE_REFERENCE.get(key)
        if details:
            lines.append(f"- {details['label']} ({details['file']})")

    if not lines:
        return ""

    return "Data source(s):\n" + "\n".join(lines)


def append_source_block(response_text: str, source_keys: Sequence[str]) -> str:
    """Append source references to a model response."""
    base = (response_text or "").strip()
    source_block = format_source_references(source_keys)

    if not source_block:
        return base

    if "Data source(s):" in base:
        return base

    return f"{base}\n\n{source_block}"


def get_llm_provider() -> str:
    """Resolve provider from env with local-safe default."""
    provider = (os.getenv("LLM_PROVIDER") or "ollama").strip().lower()
    return provider if provider in {"ollama", "gemini"} else "ollama"


def get_ollama_config() -> tuple[str, str, int]:
    """Return Ollama connection settings."""
    base_url = (os.getenv("OLLAMA_BASE_URL") or "http://127.0.0.1:11434").strip().rstrip("/")
    model_name = (os.getenv("OLLAMA_MODEL") or "llama3.1:8b").strip()
    timeout_sec = int((os.getenv("OLLAMA_TIMEOUT_SEC") or "120").strip())
    return base_url, model_name, timeout_sec


def get_gemini_model():
    """Lazily initialize Gemini client."""
    global gemini_model, gemini_model_init_error

    if gemini_model is not None:
        return gemini_model, None
    if gemini_model_init_error is not None:
        return None, gemini_model_init_error

    if genai is None:
        gemini_model_init_error = "Python package `google-generativeai` is not installed in the active runtime."
        return None, gemini_model_init_error

    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        gemini_model_init_error = "`GEMINI_API_KEY` is not set for the running backend process."
        return None, gemini_model_init_error

    try:
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        return gemini_model, None
    except Exception as exc:
        gemini_model_init_error = f"Gemini client initialization failed: {exc}"
        return None, gemini_model_init_error


def history_to_ollama_messages(conversation_history: Sequence[dict] | None) -> list[dict]:
    """Map frontend history format to Ollama chat messages."""
    mapped = []
    if not conversation_history:
        return mapped

    for msg in conversation_history[-6:]:
        role = msg.get("role")
        content = (msg.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            mapped.append({"role": role, "content": content})

    return mapped


def generate_with_ollama(
    system_prompt: str,
    user_prompt: str,
    conversation_history: Sequence[dict] | None = None,
) -> tuple[str | None, str | None]:
    """Call local Ollama chat endpoint."""
    base_url, model_name, timeout_sec = get_ollama_config()
    endpoint = f"{base_url}/api/chat"

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            *history_to_ollama_messages(conversation_history),
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {"temperature": 0.2},
    }

    try:
        response = requests.post(endpoint, json=payload, timeout=timeout_sec)
    except requests.RequestException as exc:
        return None, (
            f"Ollama request failed: {exc}. "
            f"Ensure Ollama is running (`ollama serve`) and model `{model_name}` is available "
            f"(`ollama pull {model_name}`)."
        )

    if not response.ok:
        return None, f"Ollama API error {response.status_code}: {response.text[:300]}"

    try:
        data = response.json()
    except ValueError:
        return None, f"Ollama returned invalid JSON: {response.text[:300]}"

    content = ((data.get("message") or {}).get("content") or "").strip()
    if not content:
        return None, "Ollama response did not include message content."

    return content, None


def generate_with_gemini(system_prompt: str, user_prompt: str) -> tuple[str | None, str | None]:
    """Call Gemini text generation."""
    active_model, init_error = get_gemini_model()
    if active_model is None:
        return None, init_error

    try:
        chat_session = active_model.start_chat(
            history=[
                {"role": "user", "parts": [system_prompt]},
                {"role": "model", "parts": ["Understood. I will follow these instructions."]},
            ]
        )
        response = chat_session.send_message(user_prompt)
        text = (response.text or "").strip()
        if not text:
            return None, "Gemini returned an empty response."
        return text, None
    except Exception as exc:
        return None, str(exc)


def llm_generate(
    system_prompt: str,
    user_prompt: str,
    conversation_history: Sequence[dict] | None = None,
) -> tuple[str | None, str | None]:
    """Provider-agnostic LLM generation helper."""
    provider = get_llm_provider()

    if provider == "ollama":
        return generate_with_ollama(system_prompt, user_prompt, conversation_history)

    return generate_with_gemini(system_prompt, user_prompt)


def detect_context_intents(message: str) -> list[str]:
    """Detect which data contexts should be loaded for contextual answers."""
    msg = message.lower()

    competitor_keywords = [
        "competitor",
        "compare",
        "market",
        "other firms",
        "partners",
        "industry",
        "positioning",
        "benchmark",
        "vs",
        "versus",
        "rates compare",
    ]
    operational_keywords = [
        "revenue",
        "hours",
        "billable",
        "client",
        "customer",
        "project",
        "resource",
        "consultant",
        "utilization",
        "kpi",
        "trend",
        "monthly",
        "quarterly",
    ]
    powerbi_keywords = ["power bi", "powerbi", "dashboard", "report", "embed"]

    intents = []
    if any(kw in msg for kw in competitor_keywords):
        intents.append("competitive")
    if any(kw in msg for kw in operational_keywords):
        intents.append("operational")
    if any(kw in msg for kw in powerbi_keywords):
        intents.append("powerbi")

    return intents if intents else ["operational"]


def classify_chat_intent(message: str, conversation_history: Sequence[dict] | None = None) -> str:
    """Classify top-level chat route intent with keyword-first strategy."""
    text = (message or "").strip().lower()

    if not text:
        return "general"

    health_keywords = ["health", "churn", "at-risk", "atrisk", "retention", "risk level", "engagement decline"]
    allocation_keywords = ["recommend", "assign", "allocation", "allocate", "staff", "who should work", "team for"]
    data_keywords = [
        "revenue",
        "hours",
        "top",
        "bottom",
        "trend",
        "compare",
        "vs",
        "monthly",
        "quarter",
        "q1",
        "q2",
        "q3",
        "q4",
        "how many",
        "total",
        "average",
        "highest",
        "lowest",
    ]
    doc_keywords = ["service", "offer", "about", "history", "founded", "who are", "process"]

    if any(keyword in text for keyword in health_keywords):
        return "client_health"

    if any(keyword in text for keyword in allocation_keywords):
        return "resource_recommend"

    if any(keyword in text for keyword in data_keywords):
        return "data_query"

    greeting_phrases = {"hi", "hello", "hey", "thanks", "thank you", "good morning", "good afternoon"}
    if text in greeting_phrases or (len(text.split()) <= 4 and any(p in text for p in greeting_phrases)):
        return "general"

    if any(keyword in text for keyword in doc_keywords):
        return "document_qa"

    classifier_response, err = llm_generate(
        GENERAL_ASSISTANT_PROMPT,
        INTENT_CLASSIFIER_PROMPT.format(user_message=message),
        conversation_history,
    )

    if err or not classifier_response:
        return "document_qa"

    intent = classifier_response.strip().lower()
    if intent in {"data_query", "client_health", "resource_recommend", "document_qa", "general"}:
        return intent

    return "document_qa"


def build_operational_context() -> str:
    """Pull summary operational metrics from PostgreSQL for contextual QA."""
    context_parts = []

    kpis = query(
        """
        SELECT
            COUNT(*) as total_entries,
            COUNT(DISTINCT customer_name) as unique_customers,
            COUNT(DISTINCT resource_name) as unique_resources,
            COUNT(DISTINCT project) as unique_projects,
            ROUND(SUM(extended_price)::numeric, 2) as total_revenue,
            ROUND(SUM(billable_hours)::numeric, 2) as total_hours,
            ROUND(AVG(hourly_billing_rate)::numeric, 2) as avg_rate,
            MIN(worked_date) as date_from,
            MAX(worked_date) as date_to
        FROM time_entries
        """
    )
    if kpis:
        context_parts.append(f"OPERATIONAL SUMMARY: {json.dumps(kpis[0], default=str)}")

    top_customers = query(
        """
        SELECT customer_name,
               ROUND(SUM(extended_price)::numeric, 2) as revenue,
               ROUND(SUM(billable_hours)::numeric, 2) as hours,
               COUNT(DISTINCT project) as projects
        FROM time_entries
        GROUP BY customer_name
        ORDER BY revenue DESC
        LIMIT 10
        """
    )
    context_parts.append(f"TOP 10 CUSTOMERS BY REVENUE: {json.dumps(top_customers, default=str)}")

    monthly = query(
        """
        SELECT TO_CHAR(worked_date, 'YYYY-MM') as month,
               ROUND(SUM(extended_price)::numeric, 2) as revenue,
               ROUND(SUM(billable_hours)::numeric, 2) as hours
        FROM time_entries
        GROUP BY month
        ORDER BY month
        """
    )
    context_parts.append(f"MONTHLY REVENUE TREND: {json.dumps(monthly, default=str)}")

    return "\n\n".join(context_parts)


def build_competitive_context() -> str:
    """Pull competitor records for contextual QA."""
    competitors = query(
        """
        SELECT company_name, hourly_rate, num_employees, founding_year,
               location, cloud_focus_pct, gold_certified, fasttrack_partner,
               elite_ems_partner, azure_circle_partner, leading_system_centre
        FROM competitors
        ORDER BY company_name
        """
    )

    steeves = [c for c in competitors if c["company_name"] == "Steeves and Associates"]
    others = [c for c in competitors if c["company_name"] != "Steeves and Associates"]

    context = f"STEEVES PROFILE: {json.dumps(steeves, default=str)}\n\n"
    context += f"COMPETITOR PROFILES ({len(others)} companies): {json.dumps(others, default=str)}"

    return context


def build_powerbi_context() -> str:
    """Provide static Power BI context."""
    return """POWER BI INFORMATION:
Steeves and Associates uses Power BI dashboards for operational reporting.
Dashboards cover revenue, billable hours, utilization, and project performance.
The Power BI workspace is connected to the same operational data source."""


def build_user_prompt(full_context: str, message: str) -> str:
    """Construct contextual user prompt."""
    return f"""DATA CONTEXT:
{full_context}

USER QUESTION: {message}

Respond based on the data context above."""


def fallback_tabular_summary(rows: list[dict]) -> str:
    """Simple deterministic fallback if narration LLM call fails."""
    if not rows:
        return "No matching records were found for your query."

    first = rows[0]
    parts = []
    for key, value in first.items():
        parts.append(f"{key}={value}")

    return "Here is the top row from the query results: " + ", ".join(parts)


def answer_data_query(message: str, conversation_history: Sequence[dict] | None = None) -> dict:
    """Generate SQL, execute it, and narrate results."""
    sql = generate_sql_from_question(message, llm_generate, conversation_history)
    rows = execute_read_only_sql(sql)

    if not rows:
        response = "No rows matched your query filters. Try a broader date range or fewer constraints."
    else:
        narration_user_prompt = (
            f"User question: {message}\n\n"
            f"Executed SQL:\n{sql}\n\n"
            f"Result rows (JSON):\n{json.dumps(rows, default=str)}"
        )
        response, narration_err = llm_generate(SQL_NARRATOR_PROMPT, narration_user_prompt, conversation_history)
        if narration_err:
            response = fallback_tabular_summary(rows)

    source_keys = infer_sources_from_sql(sql)

    return {
        "response": append_source_block(response, source_keys),
        "source": "database",
        "sql": sql,
        "intents": ["data_query"],
        "sources_used": source_keys,
    }


def answer_contextual_query(message: str, conversation_history: Sequence[dict] | None = None) -> dict:
    """Answer with context-pack prompt (document_qa fallback path)."""
    context_intents = detect_context_intents(message)

    context_parts = []
    if "operational" in context_intents:
        context_parts.append(build_operational_context())
    if "competitive" in context_intents:
        context_parts.append(build_competitive_context())
    if "powerbi" in context_intents:
        context_parts.append(build_powerbi_context())

    full_context = "\n\n---\n\n".join(context_parts)
    user_prompt = build_user_prompt(full_context, message)

    response_text, provider_error = llm_generate(SYSTEM_PROMPT, user_prompt, conversation_history)
    if provider_error:
        return {
            "response": f"I encountered an error processing your question: {provider_error}",
            "source": "knowledge_base",
            "intents": ["document_qa"],
            "sources_used": [],
        }

    return {
        "response": append_source_block(response_text, context_intents),
        "source": "knowledge_base",
        "intents": ["document_qa"],
        "sources_used": context_intents,
    }


def answer_general(message: str, conversation_history: Sequence[dict] | None = None) -> dict:
    """Answer greetings/meta prompts without DB context."""
    response_text, provider_error = llm_generate(
        GENERAL_ASSISTANT_PROMPT,
        message,
        conversation_history,
    )

    if provider_error:
        return {
            "response": f"I encountered an error processing your question: {provider_error}",
            "source": "direct",
            "intents": ["general"],
            "sources_used": [],
        }

    return {
        "response": response_text.strip(),
        "source": "direct",
        "intents": ["general"],
        "sources_used": [],
    }


def answer_client_health(message: str, conversation_history: Sequence[dict] | None = None) -> dict:
    """Answer health/churn intent using computed client health scores."""
    scores = score_clients()
    summary = summarize_client_health(scores)

    if not scores:
        response_text = "No client health data is available yet."
        return {
            "response": append_source_block(response_text, ["operational"]),
            "source": "database",
            "intents": ["client_health"],
            "sources_used": ["operational"],
        }

    lower_message = message.lower()
    matched_client = next(
        (row for row in scores if str(row.get("customer_name", "")).lower() in lower_message),
        None,
    )

    if matched_client:
        context_payload = {
            "matched_client": matched_client,
            "summary": {
                "total_clients": summary["total_clients"],
                "at_risk_count": summary["at_risk_count"],
                "watch_count": summary["watch_count"],
                "healthy_count": summary["healthy_count"],
            },
        }
    else:
        context_payload = {
            "summary": summary,
            "lowest_scores": scores[:10],
            "highest_scores": sorted(scores, key=lambda item: item["health_score"], reverse=True)[:5],
        }

    response_text, provider_error = llm_generate(
        CLIENT_HEALTH_PROMPT,
        f"User question: {message}\n\nClient health context:\n{json.dumps(context_payload, default=str)}",
        conversation_history,
    )

    if provider_error:
        if matched_client:
            response_text = (
                f"{matched_client['customer_name']} has a health score of {matched_client['health_score']} "
                f"({matched_client['risk_level']}). Last activity: {matched_client['last_activity']}."
            )
        else:
            top = ", ".join(
                f"{row['customer_name']} ({row['health_score']})"
                for row in summary["top_at_risk"][:5]
            )
            response_text = (
                f"There are {summary['at_risk_count']} at-risk clients and {summary['watch_count']} watch clients. "
                f"Most at-risk: {top or 'none'}"
            )

    return {
        "response": append_source_block(response_text, ["operational"]),
        "source": "database",
        "intents": ["client_health"],
        "sources_used": ["operational"],
    }


def answer_resource_recommend(message: str, conversation_history: Sequence[dict] | None = None) -> dict:
    """Answer staffing/recommend intent using resource allocation engine."""
    inputs = get_allocation_inputs()
    known_customers = inputs.get("customers") or []
    known_resources = inputs.get("resources") or []
    categories = inputs.get("categories") or []

    customer_name = extract_customer_from_query(message, known_customers)

    if not customer_name:
        sample_customers = ", ".join(known_customers[:6])
        response_text = (
            "I can generate staffing recommendations, but I need a customer name. "
            f"Try one of: {sample_customers}."
        )
        return {
            "response": append_source_block(response_text, ["operational"]),
            "source": "database",
            "intents": ["resource_recommend"],
            "sources_used": ["operational"],
        }

    lower_message = message.lower()
    category = next((item for item in categories if item.lower() in lower_message), None)
    existing_team = [resource for resource in known_resources if resource.lower() in lower_message]

    recommendations = recommend_resources(
        customer_name=customer_name,
        category=category,
        existing_team=existing_team,
        top_n=5,
    )

    if not recommendations:
        response_text = f"No recommendation data was found for {customer_name}."
        return {
            "response": append_source_block(response_text, ["operational"]),
            "source": "database",
            "intents": ["resource_recommend"],
            "sources_used": ["operational"],
        }

    response_text, provider_error = llm_generate(
        RESOURCE_RECOMMEND_PROMPT,
        (
            f"User question: {message}\n\n"
            f"Customer: {customer_name}\n"
            f"Category: {category or 'not provided'}\n"
            f"Existing team: {existing_team}\n"
            f"Recommendations:\n{json.dumps(recommendations, default=str)}"
        ),
        conversation_history,
    )

    if provider_error:
        preview = ", ".join(
            f"{row['resource']} ({row['score']})" for row in recommendations[:3]
        )
        response_text = f"Top recommendations for {customer_name}: {preview}."

    return {
        "response": append_source_block(response_text, ["operational"]),
        "source": "database",
        "intents": ["resource_recommend"],
        "sources_used": ["operational"],
    }


def chat(message: str, conversation_history: Sequence[dict] | None = None) -> dict:
    """Main chat entrypoint with dual-path intent routing."""
    primary_intent = classify_chat_intent(message, conversation_history)

    if primary_intent == "data_query":
        try:
            return answer_data_query(message, conversation_history)
        except Exception as exc:
            fallback = answer_contextual_query(message, conversation_history)
            fallback["response"] = (
                f"I could not run a live SQL query for this request ({exc}). "
                f"I answered using contextual data instead.\n\n{fallback['response']}"
            )
            return fallback

    if primary_intent == "client_health":
        try:
            return answer_client_health(message, conversation_history)
        except Exception as exc:
            return {
                "response": f"I could not compute client health right now: {exc}",
                "source": "database",
                "intents": ["client_health"],
                "sources_used": [],
            }

    if primary_intent == "resource_recommend":
        try:
            return answer_resource_recommend(message, conversation_history)
        except Exception as exc:
            return {
                "response": f"I could not generate resource recommendations right now: {exc}",
                "source": "database",
                "intents": ["resource_recommend"],
                "sources_used": [],
            }

    if primary_intent == "general":
        return answer_general(message, conversation_history)

    return answer_contextual_query(message, conversation_history)
