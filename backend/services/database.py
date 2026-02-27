"""
Database connection helper.
Simple connection pool that all routes share.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/steeves_capstone")

def get_db():
    """Get a database connection with dict cursor."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def query(sql, params=None):
    """Execute a query and return results as list of dicts."""
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        conn.close()

def query_one(sql, params=None):
    """Execute a query and return single result."""
    results = query(sql, params)
    return results[0] if results else None

def execute(sql, params=None):
    """Execute a write query (INSERT, UPDATE, DELETE)."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
    finally:
        conn.close()
