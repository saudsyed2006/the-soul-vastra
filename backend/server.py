"""
THE SOUL VASTRA - Production Backend Server
Built with Starlette & Uvicorn.
Features:
- Pure server-side session authentication with HTTP-only cookies
- Strict role-based authorization (Owner-only for mutations)
- Database-backed REST API for public catalog and admin dashboard
- Immutable audit logging on all mutations
- Secure file upload processing with image validation
- Zero client-side security leaks
"""

import os
import json
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from io import BytesIO

from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, RedirectResponse, FileResponse
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from PIL import Image

from backend.database import init_db, get_db_connection
from backend.auth import (
    hash_password, verify_password, check_rate_limit,
    record_login_attempt, create_session, get_current_user_from_token,
    destroy_session, require_owner, record_audit_log
)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = Path("/tmp/uploads") if os.environ.get("VERCEL") else BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# Custom Middleware for Server-side Authentication & Security
# -------------------------------------------------------------
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract token from HTTP-only cookie 'soul_session' or Authorization header
        token = request.cookies.get("soul_session")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1].strip()

        user = None
        if token:
            user = get_current_user_from_token(token)

        request.state.user = user
        request.state.session_token = token

        response = await call_next(request)
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def json_ok(data=None, **kwargs):
    payload = {"success": True}
    if data is not None:
        payload["data"] = data
    payload.update(kwargs)
    return JSONResponse(payload)

def json_err(message: str, status_code: int = 400, **kwargs):
    payload = {"success": False, "error": message}
    payload.update(kwargs)
    return JSONResponse(payload, status_code=status_code)

def parse_product_row(row) -> dict:
    d = dict(row)
    for field in ("gallery_json", "sizes_json", "colors_json", "tags_json"):
        if field in d:
            clean_name = field.replace("_json", "")
            try:
                d[clean_name] = json.loads(d[field]) if d[field] else []
            except Exception:
                d[clean_name] = []
            del d[field]
    d["is_active"] = bool(d.get("is_active", 1))
    d["is_featured"] = bool(d.get("is_featured", 0))
    return d

# -------------------------------------------------------------
# Public Catalog Endpoints (Read-Only)
# -------------------------------------------------------------
async def public_get_products(request: Request):
    """
    Public catalog retrieval. Only returns active/published products.
    Supports filtering by category, collection, and search.
    """
    category = request.query_params.get("category")
    collection = request.query_params.get("collection")
    search = request.query_params.get("q")
    tag = request.query_params.get("tag")

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM products WHERE is_active = 1"
    params = []

    if category and category.upper() != "ALL":
        query += " AND UPPER(category) = ?"
        params.append(category.upper())

    if collection and collection.upper() != "ALL":
        query += " AND UPPER(collection) = ?"
        params.append(collection.upper())

    if search:
        query += " AND (name LIKE ? OR subtitle LIKE ? OR description LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY display_order ASC, created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    products = [parse_product_row(r) for r in rows]

    if tag:
        tag_upper = tag.upper()
        products = [p for p in products if tag_upper in [t.upper() for t in p.get("tags", [])]]

    return json_ok(products=products, count=len(products))

async def public_get_product_by_id(request: Request):
    product_id = request.path_params["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE (id = ? OR slug = ?) AND is_active = 1", (product_id, product_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return json_err("Product not found", status_code=404)

    return json_ok(product=parse_product_row(row))

async def public_get_collections(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM collections WHERE is_active = 1 ORDER BY display_order ASC")
    rows = cursor.fetchall()
    conn.close()
    return json_ok(collections=[dict(r) for r in rows])

async def public_get_categories(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC")
    rows = cursor.fetchall()
    conn.close()
    return json_ok(categories=[dict(r) for r in rows])

async def public_get_homepage(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value_json FROM homepage_config WHERE key = 'main'")
    row = cursor.fetchone()
    conn.close()

    if not row:
        return json_err("Homepage config not initialized", status_code=404)

    return json_ok(config=json.loads(row["value_json"]))

# -------------------------------------------------------------
# Authentication Endpoints
# -------------------------------------------------------------
async def auth_login(request: Request):
    """
    Authenticates the owner or user with rate limiting and secure session cookie issuance.
    Protected against account enumeration.
    """
    ip = get_client_ip(request)
    try:
        data = await request.json()
    except Exception:
        return json_err("Invalid JSON request body", status_code=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return json_err("Email and password are required.", status_code=400)

    # Check rate limit
    if not check_rate_limit(ip, email):
        return json_err("Too many failed login attempts. Please wait 15 minutes before trying again.", status_code=429)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    # Generic error to prevent account enumeration
    auth_failed_msg = "Invalid email or password."

    if not user:
        record_login_attempt(email, ip, False)
        return json_err(auth_failed_msg, status_code=401)

    if not verify_password(password, user["password_hash"], user["salt"]):
        record_login_attempt(email, ip, False)
        return json_err(auth_failed_msg, status_code=401)

    # Success: record attempt and create session
    record_login_attempt(email, ip, True)
    user_agent = request.headers.get("User-Agent", "")
    token = create_session(user["id"], ip_address=ip, user_agent=user_agent)

    # Record login audit
    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="USER_LOGIN",
        object_type="user",
        object_id=user["id"],
        new_value={"ip": ip, "role": user["role"]},
        ip_address=ip
    )

    response = JSONResponse({
        "success": True,
        "message": "Authentication successful.",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        },
        "token": token
    })

    # Set secure HTTP-only cookie
    response.set_cookie(
        key="soul_session",
        value=token,
        max_age=86400,
        httponly=True,
        samesite="lax",
        path="/"
    )
    return response

async def auth_logout(request: Request):
    token = request.state.session_token
    if token:
        destroy_session(token)

    response = JSONResponse({"success": True, "message": "Successfully logged out."})
    response.delete_cookie("soul_session", path="/")
    return response

async def auth_get_me(request: Request):
    user = request.state.user
    if not user:
        return JSONResponse({"authenticated": False, "user": None})
    return JSONResponse({
        "authenticated": True,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "last_login": user["last_login"]
        }
    })

async def auth_forgot_password(request: Request):
    # Always returns a generic success message to prevent account enumeration
    return json_ok(message="If this email is registered, password reset instructions have been dispatched.")

async def auth_change_password(request: Request):
    user = request.state.user
    if not user:
        return json_err("Authentication required", status_code=401)

    try:
        data = await request.json()
    except Exception:
        return json_err("Invalid JSON request body", status_code=400)

    current_pwd = data.get("current_password")
    new_pwd = data.get("new_password")

    if not current_pwd or not new_pwd:
        return json_err("Current and new passwords are required.", status_code=400)

    if len(new_pwd) < 8:
        return json_err("New password must be at least 8 characters long.", status_code=400)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash, salt FROM users WHERE id = ?", (user["id"],))
    u = cursor.fetchone()

    if not u or not verify_password(current_pwd, u["password_hash"], u["salt"]):
        conn.close()
        return json_err("Incorrect current password.", status_code=400)

    new_hash, new_salt = hash_password(new_pwd)
    with conn:
        conn.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (new_hash, new_salt, user["id"]))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="PASSWORD_CHANGED",
        object_type="user",
        object_id=user["id"],
        ip_address=get_client_ip(request)
    )

    return json_ok(message="Password successfully updated.")

# -------------------------------------------------------------
# Admin Protected Endpoints (Strict Owner-Only Enforcement)
# -------------------------------------------------------------
def enforce_owner_permission(request: Request):
    """
    Validates user authentication and verifies the 'owner' role.
    Returns None if authorized; returns JSONResponse error if rejected.
    """
    user = request.state.user
    if not user:
        return json_err("Authentication required. Please log in as the owner.", status_code=401)
    if not require_owner(user):
        return json_err("Access denied: Owner privileges required to modify catalogue records.", status_code=403)
    return None

async def admin_get_dashboard_stats(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active, SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock, SUM(price * stock_quantity) as total_val FROM products")
    prod_stats = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) as col_count FROM collections WHERE is_active = 1")
    col_stats = cursor.fetchone()

    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10")
    recent_logs = cursor.fetchall()
    conn.close()

    return json_ok(stats={
        "total_products": prod_stats["total"] or 0,
        "active_products": prod_stats["active"] or 0,
        "out_of_stock": prod_stats["out_of_stock"] or 0,
        "total_inventory_value": prod_stats["total_val"] or 0,
        "active_collections": col_stats["col_count"] or 0,
        "recent_audit_logs": [dict(l) for l in recent_logs]
    })

async def admin_get_products(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY display_order ASC, updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    products = [parse_product_row(r) for r in rows]
    return json_ok(products=products, count=len(products))

async def admin_get_product_by_id(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    prod_id = request.path_params["id"]
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return json_err("Product not found", status_code=404)

    return json_ok(product=parse_product_row(row))

async def admin_create_product(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    try:
        data = await request.json()
    except Exception:
        return json_err("Invalid JSON body", status_code=400)

    name = (data.get("name") or "").strip()
    if not name:
        return json_err("Product name is required", status_code=400)

    try:
        price = float(data.get("price", 0))
    except (TypeError, ValueError):
        return json_err("Price must be a valid number", status_code=400)

    original_price = None
    if data.get("original_price") is not None and str(data.get("original_price")).strip():
        try:
            original_price = float(data.get("original_price"))
        except (TypeError, ValueError):
            original_price = None

    prod_id = (data.get("id") or "").strip()
    if not prod_id:
        slug_base = name.lower().replace(" ", "-")
        clean_slug = "".join(c for c in slug_base if c.isalnum() or c == "-")
        prod_id = clean_slug or f"prod-{uuid.uuid4().hex[:8]}"

    slug = (data.get("slug") or prod_id).strip().lower()
    now = datetime.now(timezone.utc).isoformat()

    gallery_json = json.dumps(data.get("gallery", []))
    sizes_json = json.dumps(data.get("sizes", ["S", "M", "L", "XL", "XXL"]))
    colors_json = json.dumps(data.get("colors", ["Kuro Black"]))
    tags_json = json.dumps(data.get("tags", []))

    conn = get_db_connection()
    cursor = conn.cursor()
    # Check duplicate ID
    cursor.execute("SELECT id FROM products WHERE id = ?", (prod_id,))
    if cursor.fetchone():
        conn.close()
        return json_err(f"Product ID '{prod_id}' already exists. Choose a unique ID.", status_code=409)

    with conn:
        conn.execute("""
            INSERT INTO products (
                id, name, slug, subtitle, category, category_label, collection,
                price, original_price, currency, rating, reviews_count, badge,
                is_featured, is_active, stock_quantity, image, gallery_json,
                description, story, fabric, fit, sizes_json, colors_json,
                tags_json, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            prod_id, name, slug, data.get("subtitle", ""), data.get("category", "OVERSIZED"),
            data.get("category_label", "Oversized T-Shirt"), data.get("collection", "ECLIPSE"),
            price, original_price, data.get("currency", "INR"), float(data.get("rating", 5.0)),
            int(data.get("reviews_count", 0)), data.get("badge", ""), 1 if data.get("is_featured") else 0,
            1 if data.get("is_active", True) else 0, int(data.get("stock_quantity", 50)),
            data.get("image", "assets/images/hero-street-samurai.jpg"), gallery_json,
            data.get("description", ""), data.get("story", ""), data.get("fabric", ""),
            data.get("fit", ""), sizes_json, colors_json, tags_json,
            int(data.get("display_order", 0)), now, now
        ))
    conn.close()

    # Record Audit Log
    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="PRODUCT_CREATED",
        object_type="product",
        object_id=prod_id,
        new_value={"name": name, "price": price, "stock": data.get("stock_quantity")},
        ip_address=ip
    )

    return json_ok(message="Product created successfully", product_id=prod_id)

async def admin_update_product(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    prod_id = request.path_params["id"]

    try:
        data = await request.json()
    except Exception:
        return json_err("Invalid JSON body", status_code=400)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
    old_row = cursor.fetchone()

    if not old_row:
        conn.close()
        return json_err("Product not found", status_code=404)

    old_prod = parse_product_row(old_row)

    # Read updated fields
    name = (data.get("name") or old_prod["name"]).strip()
    try:
        new_price = float(data.get("price", old_prod["price"]))
    except (TypeError, ValueError):
        new_price = old_prod["price"]

    new_orig_price = None
    if data.get("original_price") is not None and str(data.get("original_price")).strip():
        try:
            new_orig_price = float(data.get("original_price"))
        except (TypeError, ValueError):
            new_orig_price = old_prod.get("original_price")
    elif "original_price" in data and not data.get("original_price"):
        new_orig_price = None
    else:
        new_orig_price = old_prod.get("original_price")

    now = datetime.now(timezone.utc).isoformat()

    gallery_json = json.dumps(data.get("gallery", old_prod.get("gallery", [])))
    sizes_json = json.dumps(data.get("sizes", old_prod.get("sizes", [])))
    colors_json = json.dumps(data.get("colors", old_prod.get("colors", [])))
    tags_json = json.dumps(data.get("tags", old_prod.get("tags", [])))

    is_featured = 1 if data.get("is_featured", old_prod["is_featured"]) else 0
    is_active = 1 if data.get("is_active", old_prod["is_active"]) else 0

    with conn:
        conn.execute("""
            UPDATE products SET
                name = ?, subtitle = ?, category = ?, category_label = ?, collection = ?,
                price = ?, original_price = ?, currency = ?, rating = ?, reviews_count = ?,
                badge = ?, is_featured = ?, is_active = ?, stock_quantity = ?, image = ?,
                gallery_json = ?, description = ?, story = ?, fabric = ?, fit = ?,
                sizes_json = ?, colors_json = ?, tags_json = ?, display_order = ?, updated_at = ?
            WHERE id = ?
        """, (
            name, data.get("subtitle", old_prod.get("subtitle", "")),
            data.get("category", old_prod.get("category")),
            data.get("category_label", old_prod.get("category_label")),
            data.get("collection", old_prod.get("collection")),
            new_price, new_orig_price, data.get("currency", old_prod.get("currency", "INR")),
            float(data.get("rating", old_prod.get("rating", 5.0))),
            int(data.get("reviews_count", old_prod.get("reviews_count", 0))),
            data.get("badge", old_prod.get("badge", "")),
            is_featured, is_active,
            int(data.get("stock_quantity", old_prod.get("stock_quantity", 0))),
            data.get("image", old_prod.get("image")),
            gallery_json, data.get("description", old_prod.get("description", "")),
            data.get("story", old_prod.get("story", "")),
            data.get("fabric", old_prod.get("fabric", "")),
            data.get("fit", old_prod.get("fit", "")),
            sizes_json, colors_json, tags_json,
            int(data.get("display_order", old_prod.get("display_order", 0))),
            now, prod_id
        ))
    conn.close()

    # Detect Price Change specifically for high-priority audit logging
    if abs(old_prod["price"] - new_price) > 0.001:
        record_audit_log(
            user_id=user["id"],
            user_email=user["email"],
            action="PRICE_CHANGED",
            object_type="product",
            object_id=prod_id,
            old_value={"price": old_prod["price"], "original_price": old_prod.get("original_price")},
            new_value={"price": new_price, "original_price": new_orig_price},
            ip_address=ip
        )

    # General Product Update Audit
    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="PRODUCT_UPDATED",
        object_type="product",
        object_id=prod_id,
        old_value={"name": old_prod["name"], "price": old_prod["price"], "stock": old_prod["stock_quantity"]},
        new_value={"name": name, "price": new_price, "stock": data.get("stock_quantity", old_prod["stock_quantity"])},
        ip_address=ip
    )

    return json_ok(message="Product updated successfully", product_id=prod_id, new_price=new_price)

async def admin_delete_product(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    prod_id = request.path_params["id"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return json_err("Product not found", status_code=404)

    old_prod = parse_product_row(row)

    with conn:
        conn.execute("DELETE FROM products WHERE id = ?", (prod_id,))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="PRODUCT_DELETED",
        object_type="product",
        object_id=prod_id,
        old_value={"name": old_prod["name"], "price": old_prod["price"]},
        ip_address=ip
    )

    return json_ok(message=f"Product '{old_prod['name']}' deleted successfully.")

async def admin_duplicate_product(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    prod_id = request.path_params["id"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return json_err("Product to duplicate not found", status_code=404)

    orig = dict(row)
    new_id = f"{orig['id']}-copy-{uuid.uuid4().hex[:4]}"
    new_name = f"{orig['name']} (Copy)"
    new_slug = f"{orig['slug']}-copy-{uuid.uuid4().hex[:4]}"
    now = datetime.now(timezone.utc).isoformat()

    with conn:
        conn.execute("""
            INSERT INTO products (
                id, name, slug, subtitle, category, category_label, collection,
                price, original_price, currency, rating, reviews_count, badge,
                is_featured, is_active, stock_quantity, image, gallery_json,
                description, story, fabric, fit, sizes_json, colors_json,
                tags_json, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id, new_name, new_slug, orig["subtitle"], orig["category"], orig["category_label"],
            orig["collection"], orig["price"], orig["original_price"], orig["currency"],
            orig["rating"], 0, "NEW DRAFT", 0, 0, orig["stock_quantity"], orig["image"],
            orig["gallery_json"], orig["description"], orig["story"], orig["fabric"],
            orig["fit"], orig["sizes_json"], orig["colors_json"], orig["tags_json"],
            orig["display_order"] + 1, now, now
        ))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="PRODUCT_DUPLICATED",
        object_type="product",
        object_id=new_id,
        new_value={"original_id": prod_id, "new_id": new_id, "name": new_name},
        ip_address=ip
    )

    return json_ok(message="Product duplicated successfully", new_id=new_id)

# -------------------------------------------------------------
# Collection Management Endpoints
# -------------------------------------------------------------
async def admin_get_collections(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, COUNT(p.id) as product_count
        FROM collections c
        LEFT JOIN products p ON UPPER(c.name) = UPPER(p.collection)
        GROUP BY c.id
        ORDER BY c.display_order ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return json_ok(collections=[dict(r) for r in rows])

async def admin_create_collection(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    data = await request.json()

    name = (data.get("name") or "").strip().upper()
    if not name:
        return json_err("Collection name is required", status_code=400)

    col_id = data.get("id") or f"col_{name.lower().replace(' ', '_')}"
    slug = data.get("slug") or name.lower().replace(" ", "-")

    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO collections (id, name, slug, subtitle, description, image, badge, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            col_id, name, slug, data.get("subtitle", ""), data.get("description", ""),
            data.get("image", "assets/images/collection-shadow.jpg"), data.get("badge", "NEW DROP"),
            int(data.get("display_order", 0)), 1 if data.get("is_active", True) else 0
        ))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="COLLECTION_CREATED",
        object_type="collection",
        object_id=col_id,
        new_value={"name": name, "slug": slug},
        ip_address=ip
    )
    return json_ok(message="Collection created successfully", collection_id=col_id)

async def admin_update_collection(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    col_id = request.path_params["id"]
    data = await request.json()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM collections WHERE id = ?", (col_id,))
    old_row = cursor.fetchone()
    if not old_row:
        conn.close()
        return json_err("Collection not found", status_code=404)

    old = dict(old_row)
    name = (data.get("name") or old["name"]).strip().upper()

    with conn:
        conn.execute("""
            UPDATE collections SET
                name = ?, subtitle = ?, description = ?, image = ?,
                badge = ?, display_order = ?, is_active = ?
            WHERE id = ?
        """, (
            name, data.get("subtitle", old.get("subtitle")), data.get("description", old.get("description")),
            data.get("image", old.get("image")), data.get("badge", old.get("badge")),
            int(data.get("display_order", old.get("display_order", 0))),
            1 if data.get("is_active", old.get("is_active")) else 0, col_id
        ))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="COLLECTION_UPDATED",
        object_type="collection",
        object_id=col_id,
        old_value=old,
        new_value=data,
        ip_address=ip
    )
    return json_ok(message="Collection updated successfully.")

async def admin_delete_collection(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    col_id = request.path_params["id"]

    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM collections WHERE id = ?", (col_id,))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="COLLECTION_DELETED",
        object_type="collection",
        object_id=col_id,
        ip_address=get_client_ip(request)
    )
    return json_ok(message="Collection deleted successfully.")

# -------------------------------------------------------------
# Homepage Content Management
# -------------------------------------------------------------
async def admin_get_homepage(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value_json FROM homepage_config WHERE key = 'main'")
    row = cursor.fetchone()
    conn.close()
    return json_ok(config=json.loads(row["value_json"]) if row else {})

async def admin_update_homepage(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)
    data = await request.json()
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value_json FROM homepage_config WHERE key = 'main'")
    old_row = cursor.fetchone()
    old_val = json.loads(old_row["value_json"]) if old_row else {}

    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO homepage_config (key, value_json, updated_at, updated_by)
            VALUES ('main', ?, ?, ?)
        """, (json.dumps(data), now, user["id"]))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="HOMEPAGE_UPDATED",
        object_type="homepage_config",
        object_id="main",
        old_value=old_val,
        new_value=data,
        ip_address=ip
    )
    return json_ok(message="Homepage content updated successfully.")

# -------------------------------------------------------------
# Media / Image Uploads
# -------------------------------------------------------------
async def admin_upload_image(request: Request):
    """
    Receives multipart image upload, validates image integrity with Pillow,
    saves to uploads/ with unique random filename, and records in database.
    """
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    user = request.state.user
    ip = get_client_ip(request)

    form = await request.form()
    file_item = form.get("file")
    if not file_item or not hasattr(file_item, "read"):
        return json_err("No file uploaded or invalid form field", status_code=400)

    contents = await file_item.read()
    if len(contents) > 10 * 1024 * 1024: # 10MB limit
        return json_err("File exceeds 10MB maximum limit", status_code=400)

    # Validate image with Pillow
    try:
        img = Image.open(BytesIO(contents))
        img_format = img.format.lower()
        if img_format not in ("jpeg", "jpg", "png", "webp", "gif"):
            return json_err(f"Unsupported image format: {img_format}. Allowed: JPEG, PNG, WEBP, GIF", status_code=400)
    except Exception as e:
        return json_err(f"Invalid image file: {str(e)}", status_code=400)

    ext = "jpg" if img_format in ("jpeg", "jpg") else img_format
    file_id = f"soul_{uuid.uuid4().hex[:12]}"
    filename = f"{file_id}.{ext}"
    target_path = UPLOADS_DIR / filename

    with open(target_path, "wb") as f:
        f.write(contents)

    public_url = f"/uploads/{filename}"
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO media_uploads (id, filename, original_name, url, size_bytes, mime_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (file_id, filename, file_item.filename, public_url, len(contents), f"image/{ext}", now))
    conn.close()

    record_audit_log(
        user_id=user["id"],
        user_email=user["email"],
        action="IMAGE_UPLOADED",
        object_type="media",
        object_id=file_id,
        new_value={"filename": filename, "url": public_url, "size": len(contents)},
        ip_address=ip
    )

    return json_ok(
        message="Image uploaded successfully",
        url=public_url,
        filename=filename,
        size_bytes=len(contents)
    )

async def admin_get_media(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media_uploads ORDER BY created_at DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return json_ok(media=[dict(r) for r in rows])

# -------------------------------------------------------------
# Audit Logs Endpoint
# -------------------------------------------------------------
async def admin_get_audit_logs(request: Request):
    auth_err = enforce_owner_permission(request)
    if auth_err:
        return auth_err

    limit = min(int(request.query_params.get("limit", 100)), 200)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return json_ok(logs=[dict(r) for r in rows])

# -------------------------------------------------------------
# Frontend Page Handlers
# -------------------------------------------------------------
async def serve_public_home(request: Request):
    return FileResponse(str(BASE_DIR / "index.html"))

async def serve_admin_login(request: Request):
    # If already logged in as owner, redirect directly to /admin
    if require_owner(request.state.user):
        return RedirectResponse("/admin", status_code=302)
    return FileResponse(str(BASE_DIR / "admin" / "login.html"))

async def serve_admin_dashboard(request: Request):
    """
    Enforces authentication on the /admin route.
    If not authenticated as owner, redirects to /admin/login.
    """
    if not require_owner(request.state.user):
        return RedirectResponse("/admin/login", status_code=302)
    return FileResponse(str(BASE_DIR / "admin" / "index.html"))

# -------------------------------------------------------------
# Route Definitions
# -------------------------------------------------------------
routes = [
    # Public HTML
    Route("/", serve_public_home, methods=["GET"]),
    Route("/index.html", serve_public_home, methods=["GET"]),
    Route("/shop", serve_public_home, methods=["GET"]),

    # Public Catalog APIs
    Route("/api/products", public_get_products, methods=["GET"]),
    Route("/api/products/{id}", public_get_product_by_id, methods=["GET"]),
    Route("/api/collections", public_get_collections, methods=["GET"]),
    Route("/api/categories", public_get_categories, methods=["GET"]),
    Route("/api/homepage", public_get_homepage, methods=["GET"]),

    # Auth APIs
    Route("/api/auth/login", auth_login, methods=["POST"]),
    Route("/api/auth/logout", auth_logout, methods=["POST"]),
    Route("/api/auth/me", auth_get_me, methods=["GET"]),
    Route("/api/auth/forgot-password", auth_forgot_password, methods=["POST"]),
    Route("/api/auth/change-password", auth_change_password, methods=["POST"]),

    # Admin Protected APIs (Strict Owner-Only Enforcement)
    Route("/api/admin/dashboard-stats", admin_get_dashboard_stats, methods=["GET"]),
    Route("/api/admin/products", admin_get_products, methods=["GET"]),
    Route("/api/admin/products", admin_create_product, methods=["POST"]),
    Route("/api/admin/products/{id}", admin_get_product_by_id, methods=["GET"]),
    Route("/api/admin/products/{id}", admin_update_product, methods=["PUT"]),
    Route("/api/admin/products/{id}", admin_delete_product, methods=["DELETE"]),
    Route("/api/admin/products/{id}/duplicate", admin_duplicate_product, methods=["POST"]),

    Route("/api/admin/collections", admin_get_collections, methods=["GET"]),
    Route("/api/admin/collections", admin_create_collection, methods=["POST"]),
    Route("/api/admin/collections/{id}", admin_update_collection, methods=["PUT"]),
    Route("/api/admin/collections/{id}", admin_delete_collection, methods=["DELETE"]),

    Route("/api/admin/homepage", admin_get_homepage, methods=["GET"]),
    Route("/api/admin/homepage", admin_update_homepage, methods=["PUT"]),

    Route("/api/admin/upload-image", admin_upload_image, methods=["POST"]),
    Route("/api/admin/media", admin_get_media, methods=["GET"]),
    Route("/api/admin/audit-logs", admin_get_audit_logs, methods=["GET"]),

    # Admin Frontend Pages
    Route("/admin/login", serve_admin_login, methods=["GET"]),
    Route("/admin", serve_admin_dashboard, methods=["GET"]),
    Route("/admin/{path:path}", serve_admin_dashboard, methods=["GET"]),

    # Static Assets Mounts
    Mount("/assets", app=StaticFiles(directory=str(BASE_DIR / "assets")), name="assets"),
    Mount("/uploads", app=StaticFiles(directory=str(UPLOADS_DIR)), name="uploads"),
    Mount("/admin-static", app=StaticFiles(directory=str(BASE_DIR / "admin")), name="admin-static"),
]

middleware = [
    Middleware(AuthMiddleware),
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    ),
]

app = Starlette(routes=routes, middleware=middleware)

if __name__ == "__main__":
    import uvicorn
    init_db()
    print("Starting THE SOUL VASTRA Secure Backend on http://127.0.0.1:8080...")
    uvicorn.run("backend.server:app", host="0.0.0.0", port=8080, log_level="info")
