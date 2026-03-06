"""
Database connection helper.
Shared ThreadedConnectionPool — reuses connections across requests.
"""
import os
import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/steeves_capstone")

# Min/max sized to stay well within Azure PostgreSQL B1ms connection limit (~50).
_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=DATABASE_URL,
    connect_timeout=10,
)


def get_db():
    """Borrow a connection from the pool."""
    return _pool.getconn()


def _return(conn):
    """Return a connection to the pool."""
    _pool.putconn(conn)


def query(sql, params=None):
    """Execute a SELECT and return results as a list of dicts."""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        _return(conn)


def query_one(sql, params=None):
    """Execute a SELECT and return the first row, or None."""
    results = query(sql, params)
    return results[0] if results else None


def execute(sql, params=None):
    """Execute a write query (INSERT, UPDATE, DELETE)."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _return(conn)
