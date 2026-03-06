"""
Chat routes — AI-powered Q&A across all data sources.
"""
from flask import Blueprint, jsonify, request
from services.gemini_chat import chat
from services.database import execute, query

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/message", methods=["POST"])
def send_message():
    """Send a message to the AI chat assistant."""
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "default")
    conversation_history = data.get("history", [])

    if not message:
        return jsonify({"error": "Message is required"}), 400
    if len(message) > 2000:
        return jsonify({"error": "Message too long (max 2000 characters)"}), 400
    
    # Get AI response
    result = chat(message, conversation_history)
    
    # Save to chat history (for future reference)
    try:
        execute("""
            INSERT INTO chat_history (session_id, role, content, data_source)
            VALUES (%s, %s, %s, %s)
        """, (session_id, "user", message, None))
        
        execute("""
            INSERT INTO chat_history (session_id, role, content, data_source)
            VALUES (%s, %s, %s, %s)
        """, (session_id, "assistant", result["response"], 
              ",".join(result.get("sources_used", []))))
    except Exception:
        pass  # Don't fail the response if history save fails
    
    return jsonify(result)


@chat_bp.route("/history/<session_id>")
def get_history(session_id):
    """Get chat history for a session. Rejects trivially guessable IDs."""
    if len(session_id) < 8:
        return jsonify({"error": "Invalid session ID"}), 400
    result = query("""
        SELECT role, content, data_source, created_at
        FROM chat_history
        WHERE session_id = %s
        ORDER BY created_at ASC
        LIMIT 50
    """, (session_id,))
    return jsonify(result)


@chat_bp.route("/suggestions")
def get_suggestions():
    """Return suggested questions for the chat UI."""
    return jsonify([
        {"text": "What is our total revenue and who are our top 5 clients?", "category": "operational"},
        {"text": "How do our billing rates compare to other Microsoft partners in Vancouver?", "category": "competitive"},
        {"text": "Which resources generate the most revenue per hour?", "category": "operational"},
        {"text": "Which clients are currently At-Risk and why?", "category": "client_health"},
        {"text": "Recommend consultants for a new London Drugs project", "category": "resource_recommend"},
        {"text": "What certifications make Steeves unique vs. competitors?", "category": "competitive"},
        {"text": "Show me the monthly revenue trend", "category": "operational"},
        {"text": "How does our team size compare to the market?", "category": "competitive"},
    ])
