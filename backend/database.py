"""
THE SOUL VASTRA - Database Engine
SQLite with WAL mode, foreign keys, and connection pooling.
"""

import sqlite3
import os
import json
from datetime import datetime
from pathlib import Path

def get_db_path() -> Path:
    if os.environ.get("VERCEL"):
        import shutil
        tmp_db = Path("/tmp/soul_vastra.db")
        orig_db = Path(__file__).resolve().parent.parent / "soul_vastra.db"
        if not tmp_db.exists() and orig_db.exists():
            shutil.copyfile(orig_db, tmp_db)
        return tmp_db
    return Path(__file__).resolve().parent.parent / "soul_vastra.db"

def get_db_connection():
    """Returns a SQLite connection with dict-like row access and enforced foreign keys."""
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path), timeout=20.0)
    conn.row_factory = sqlite3.Row
    if not os.environ.get("VERCEL"):
        conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes tables and indexes if they do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table (strictly role-based: 'owner', 'customer')
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at TEXT NOT NULL,
        last_login TEXT
    );
    """)

    # 2. Sessions table (server-side session storage with TTL)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT
    );
    """)

    # 3. Rate limiting and failed login attempts log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL COLLATE NOCASE,
        ip_address TEXT NOT NULL,
        attempt_time TEXT NOT NULL,
        success INTEGER NOT NULL
    );
    """)

    # 4. Categories
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
    );
    """)

    # 5. Collections
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        subtitle TEXT,
        description TEXT,
        image TEXT NOT NULL,
        badge TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
    );
    """)

    # 6. Products
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        subtitle TEXT,
        category TEXT NOT NULL,
        category_label TEXT,
        collection TEXT,
        price REAL NOT NULL,
        original_price REAL,
        currency TEXT DEFAULT 'INR',
        rating REAL DEFAULT 5.0,
        reviews_count INTEGER DEFAULT 0,
        badge TEXT,
        is_featured INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 100,
        image TEXT NOT NULL,
        gallery_json TEXT,
        description TEXT,
        story TEXT,
        fabric TEXT,
        fit TEXT,
        sizes_json TEXT,
        colors_json TEXT,
        tags_json TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 7. Homepage Dynamic Content Configuration
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS homepage_config (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT
    );
    """)

    # 8. Audit Logs (immutable record of all admin mutations)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_email TEXT,
        action TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id TEXT,
        old_value_json TEXT,
        new_value_json TEXT,
        ip_address TEXT
    );
    """)

    # 9. Media Uploads
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS media_uploads (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        url TEXT NOT NULL,
        size_bytes INTEGER,
        mime_type TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # Indexes for lightning-fast reads
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
