"""
Power BI routes — iframe embed config and future DAX query execution.

v1: Returns embed URL for iframe embedding (simplest approach).
v2: Add Execute Queries API for live DAX queries from the chatbot.
"""
import os
import requests
from flask import Blueprint, jsonify, request

powerbi_bp = Blueprint("powerbi", __name__)

# Azure AD / Entra ID config
TENANT_ID = os.getenv("POWERBI_TENANT_ID", "")
CLIENT_ID = os.getenv("POWERBI_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("POWERBI_CLIENT_SECRET", "")
WORKSPACE_ID = os.getenv("POWERBI_WORKSPACE_ID", "")
DATASET_ID = os.getenv("POWERBI_DATASET_ID", "")


def get_access_token():
    """Get Azure AD access token for Power BI API."""
    if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET]):
        return None
    
    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": "https://analysis.windows.net/powerbi/api/.default"
    }
    
    try:
        response = requests.post(url, data=payload, timeout=10)
        response.raise_for_status()
        return response.json().get("access_token")
    except Exception as e:
        print(f"Power BI auth error: {e}")
        return None


@powerbi_bp.route("/embed-config")
def embed_config():
    """
    Return Power BI embed configuration.
    v1: Just the embed URL for iframe.
    v2: Full embed token for JavaScript SDK.
    """
    embed_url = os.getenv("POWERBI_EMBED_URL", "")
    
    if not embed_url:
        return jsonify({
            "configured": False,
            "message": "Power BI embed URL not configured. Set POWERBI_EMBED_URL in .env"
        })
    
    return jsonify({
        "configured": True,
        "embed_url": embed_url,
        "workspace_id": WORKSPACE_ID
    })


@powerbi_bp.route("/reports")
def list_reports():
    """List available Power BI reports in the workspace."""
    token = get_access_token()
    if not token:
        return jsonify({"error": "Power BI not configured or auth failed"}), 503
    
    try:
        url = f"https://api.powerbi.com/v1.0/myorg/groups/{WORKSPACE_ID}/reports"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return jsonify(response.json().get("value", []))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@powerbi_bp.route("/execute-query", methods=["POST"])
def execute_dax_query():
    """
    v2: Execute a DAX query against the Power BI dataset.
    This is the foundation for chatbot → Power BI integration.
    
    Example request body:
    {"query": "EVALUATE SUMMARIZE(TimeEntries, TimeEntries[CustomerName], \"Revenue\", SUM(TimeEntries[ExtendedPrice]))"}
    """
    token = get_access_token()
    if not token:
        return jsonify({"error": "Power BI not configured"}), 503
    
    dax_query = request.get_json().get("query", "")
    if not dax_query:
        return jsonify({"error": "DAX query is required"}), 400
    
    try:
        url = f"https://api.powerbi.com/v1.0/myorg/groups/{WORKSPACE_ID}/datasets/{DATASET_ID}/executeQueries"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "queries": [{"query": dax_query}],
            "serializerSettings": {"includeNulls": True}
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
