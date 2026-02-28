"""
Steeves & Associates Capstone — Flask API
Route groups: overview, competitors, chat, client-health, allocation
"""
import os
from pathlib import Path
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()


def get_cors_origins():
    """
    Allow local frontend origins in development.
    Override with CORS_ORIGINS (comma-separated exact origins) if needed.
    """
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    # Default for local development: allow all origins.
    return "*"

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": get_cors_origins()}})
    
    # Register route blueprints
    from routes.overview import overview_bp
    from routes.competitors import competitors_bp
    from routes.chat import chat_bp
    from routes.health import health_bp
    from routes.allocation import allocation_bp

    app.register_blueprint(overview_bp, url_prefix="/api/overview")
    app.register_blueprint(competitors_bp, url_prefix="/api/competitors")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(health_bp, url_prefix="/api/client-health")
    app.register_blueprint(allocation_bp, url_prefix="/api/allocation")
    
    @app.route("/api/health")
    def health():
        return {"status": "ok", "version": "1.0.0"}
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
