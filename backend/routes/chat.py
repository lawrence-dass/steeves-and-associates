"""
Chat routes — AI-powered Q&A across all data sources.
"""
from flask import Blueprint, jsonify, request, Response, stream_with_context
from services.gemini_chat import chat, chat_stream
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


@chat_bp.route("/stream", methods=["POST"])
def stream_message():
    """Stream an AI chat response using Server-Sent Events."""
    import json as _json

    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "default")
    conversation_history = data.get("history", [])

    if not message:
        return jsonify({"error": "Message is required"}), 400
    if len(message) > 2000:
        return jsonify({"error": "Message too long (max 2000 characters)"}), 400

    # Accumulate outside the generator so call_on_close can read final values
    accumulated_text: list[str] = []
    sources_used: list[str] = []

    def generate():
        for sse_line in chat_stream(message, conversation_history):
            yield sse_line
            # Track accumulation for history (no DB writes here — done in call_on_close)
            try:
                if sse_line.startswith("data: "):
                    event = _json.loads(sse_line[6:])
                    if event.get("type") == "chunk":
                        accumulated_text.append(event.get("text", ""))
                    elif event.get("type") == "meta":
                        sources_used[:] = event.get("sources_used", [])
            except Exception:
                pass

    response = Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

    @response.call_on_close
    def _save_history():
        """Write to chat_history after the stream is fully sent to the client."""
        try:
            execute("""
                INSERT INTO chat_history (session_id, role, content, data_source)
                VALUES (%s, %s, %s, %s)
            """, (session_id, "user", message, None))
            full_response = "".join(accumulated_text)
            execute("""
                INSERT INTO chat_history (session_id, role, content, data_source)
                VALUES (%s, %s, %s, %s)
            """, (session_id, "assistant", full_response, ",".join(sources_used)))
        except Exception:
            pass

    return response


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
