# THE SOUL VASTRA &bull; SECURE MANAGEABLE E-COMMERCE PLATFORM

> **Premium Japanese-Inspired Streetwear Platform with Production-Grade Backend & Owner Administration**  
> Blending samurai discipline, warrior philosophy, and high-end editorial streetwear with strict database-level security and a private Owner Management Portal.

---

## 🗡️ Architectural Overview: Public vs Admin Separation

THE SOUL VASTRA is structured with **complete architectural separation** between the public customer storefront and the privileged administration engine:

```
[ CUSTOMERS / PUBLIC ]                       [ WEBSITE OWNER / ADMIN ]
       │                                                 │
       ▼                                                 ▼
http://localhost:8080/                          http://localhost:8080/admin
   (Public Storefront)                               (Owner Portal)
       │                                                 │
       │ (GET only: Published Catalogue)                 │ (POST, PUT, DELETE: Requires 'owner' role)
       ▼                                                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    STARLETTE / UVICORN BACKEND LAYER                      │
│                                                                           │
│  - Session Authentication Middleware (HTTP-Only Secure Cookie)            │
│  - Strict Server-Side Role Enforcement (role === 'owner')                 │
│  - Brute-Force Rate Limiting (5 attempts / 15 min lockout)                │
│  - Cryptographic PBKDF2 Password Hashing (200,000 iterations + Salt)       │
│  - Image Validation & Secure Storage (Pillow MIME & Format Checks)        │
│  - Immutable Audit Log Engine (PRICE_CHANGED, PRODUCT_UPDATED, etc.)      │
└───────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           DATABASE STORAGE                                │
│                                                                           │
│  - SQLite (Production WAL Mode, Foreign Keys, High-Concurrency)           │
│  - OR Supabase / PostgreSQL (Complete RLS Policies included)              │
│                                                                           │
│  Tables: users, sessions, categories, collections, products,              │
│          homepage_config, audit_logs, media_uploads                       │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 1. Database Schema

The database schema is defined in [`backend/database.py`](file:///c:/Users/sauds/OneDrive/Documents/CLU/the-soul-vastra/backend/database.py) (for local SQLite WAL mode) and [`backend/supabase_schema.sql`](file:///c:/Users/sauds/OneDrive/Documents/CLU/the-soul-vastra/backend/supabase_schema.sql) (for Supabase PostgreSQL).

### Core Tables:

1. **`users`**:
   - `id` (TEXT PRIMARY KEY)
   - `email` (TEXT UNIQUE NOT NULL COLLATE NOCASE)
   - `password_hash` (TEXT NOT NULL) — 200,000 iteration PBKDF2-HMAC-SHA256
   - `salt` (TEXT NOT NULL) — 16-byte cryptographically secure random salt
   - `name` (TEXT NOT NULL)
   - `role` (TEXT NOT NULL CHECK in `'owner'`, `'admin'`, `'customer'`)
   - `created_at` (TEXT NOT NULL)
   - `last_login` (TEXT)

2. **`sessions`**:
   - `token` (TEXT PRIMARY KEY) — 48-byte URL-safe cryptographically generated token
   - `user_id` (TEXT REFERENCES users(id) ON DELETE CASCADE)
   - `created_at` (TEXT NOT NULL)
   - `expires_at` (TEXT NOT NULL) — 24-hour TTL with server-side expiry check
   - `ip_address` (TEXT)
   - `user_agent` (TEXT)

3. **`products`**:
   - `id` (TEXT PRIMARY KEY)
   - `name` (TEXT NOT NULL)
   - `slug` (TEXT UNIQUE NOT NULL)
   - `subtitle` (TEXT)
   - `category` (TEXT NOT NULL)
   - `category_label` (TEXT)
   - `collection` (TEXT)
   - `price` (REAL NOT NULL)
   - `original_price` (REAL)
   - `currency` (TEXT DEFAULT 'INR')
   - `rating` (REAL DEFAULT 5.0)
   - `reviews_count` (INTEGER DEFAULT 0)
   - `badge` (TEXT)
   - `is_featured` (INTEGER DEFAULT 0)
   - `is_active` (INTEGER DEFAULT 1) — Controls public catalog visibility
   - `stock_quantity` (INTEGER DEFAULT 100)
   - `image` (TEXT NOT NULL)
   - `gallery_json` (TEXT)
   - `description` (TEXT)
   - `story` (TEXT)
   - `fabric` (TEXT)
   - `fit` (TEXT)
   - `sizes_json` (TEXT)
   - `colors_json` (TEXT)
   - `tags_json` (TEXT)
   - `display_order` (INTEGER DEFAULT 0)
   - `created_at` (TEXT NOT NULL)
   - `updated_at` (TEXT NOT NULL)

4. **`collections`**:
   - `id`, `name`, `slug`, `subtitle`, `description`, `image`, `badge`, `display_order`, `is_active`

5. **`homepage_config`**:
   - `key` (TEXT PRIMARY KEY, e.g. `'main'`)
   - `value_json` (TEXT NOT NULL) — Stores live hero headlines, CTAs, story, and quality pillars
   - `updated_at`, `updated_by`

6. **`audit_logs`** (Immutable History):
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `timestamp` (TEXT NOT NULL)
   - `user_id` (TEXT NOT NULL)
   - `user_email` (TEXT)
   - `action` (TEXT NOT NULL, e.g. `PRICE_CHANGED`, `PRODUCT_CREATED`, `PRODUCT_DELETED`)
   - `object_type` (TEXT NOT NULL)
   - `object_id` (TEXT)
   - `old_value_json` (TEXT)
   - `new_value_json` (TEXT)
   - `ip_address` (TEXT)

7. **`media_uploads`**:
   - `id`, `filename`, `original_name`, `url`, `size_bytes`, `mime_type`, `created_at`

---

## 🛡️ 2. Authentication Setup & Server-Side Security

- **No Client-Side Secrets**: No passwords, tokens, or service-role keys exist in frontend code.
- **Password Protection**: Passwords are never stored in plaintext. Hashed using PBKDF2-HMAC-SHA256 with user-specific random salt and 200,000 iterations.
- **Session Handling**: When the owner logs in at `/api/auth/login`, a secure session is stored in the database, and an **HTTP-only cookie** (`soul_session`) is set on the response:
  - `HttpOnly: True` (Inaccessible to JavaScript, immune to XSS token theft)
  - `SameSite: Lax` (CSRF defense)
  - `Path: /`
  - `Max-Age: 86400` (24 Hours)
- **Rate Limiting**: Failed login attempts are logged in `login_attempts`. If more than 5 failed attempts occur within 15 minutes from an IP or email, requests are rejected with `HTTP 429 Too Many Requests`.
- **Anti-Enumeration**: Both nonexistent emails and invalid passwords return the identical response: `"Invalid email or password."`.

---

## 👑 3. Admin Account Setup Instructions

The database has been seeded with the default owner credentials:

- **Owner Portal URL**: [http://localhost:8080/admin](http://localhost:8080/admin)
- **Login Page URL**: [http://localhost:8080/admin/login](http://localhost:8080/admin/login)
- **Default Owner Email**: `owner@thesoulvastra.com`
- **Default Owner Password**: `SoulVastra@2026!`
- **Role**: `owner`

> [!TIP]
> **Changing the Owner Password**:
> 1. Log in to `/admin`.
> 2. Click **SETTINGS** in the sidebar.
> 3. Enter your current password (`SoulVastra@2026!`) and your new password (minimum 8 characters).
> 4. Click **UPDATE SECURE PASSWORD**. The password hash is immediately updated and logged to the audit trail.

---

## 🌐 4. Environment Variables Required

Create a `.env` file in the project root if overriding default ports or connecting to cloud databases:

```env
# Server Configuration
PORT=8080
HOST=0.0.0.0
ENVIRONMENT=production

# Database (Leave unset for local SQLite WAL mode)
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Security Secrets (Used if signing external tokens)
SESSION_SECRET_KEY=generate_random_64_character_hex_string_here

# Cloudflare / Storage (Optional if using S3/R2 instead of local uploads/)
# STORAGE_BUCKET=the-soul-vastra-media
# STORAGE_ENDPOINT=https://...
```

---

## 📜 5. Security & Row Level Security (RLS) Policies

For deployment with Supabase PostgreSQL, the complete DDL is in [`backend/supabase_schema.sql`](file:///c:/Users/sauds/OneDrive/Documents/CLU/the-soul-vastra/backend/supabase_schema.sql).

### Key RLS Rules Enforced:

```sql
-- Public customers can ONLY read published products
CREATE POLICY "Public read published products"
ON public.products FOR SELECT
USING (is_active = true OR public.is_owner());

-- Only the verified Owner can INSERT new products
CREATE POLICY "Owner insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

-- Only the verified Owner can UPDATE products or prices
CREATE POLICY "Owner update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- Only the verified Owner can DELETE products
CREATE POLICY "Owner delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_owner());
```

---

## 🛠️ 6. How to Create a New Product

1. Navigate to [http://localhost:8080/admin](http://localhost:8080/admin) and log in.
2. In the sidebar, click **PRODUCTS**.
3. Click the red **+ ADD PRODUCT** button on the top right.
4. Fill in the modal fields:
   - **Product Name**: e.g., `KATANA OVERSIZED TEE`
   - **Slug**: e.g., `katana-oversized-tee`
   - **Category**: Select `OVERSIZED` or `ROUND NECK`
   - **Collection**: Select `SHADOW`, `RONIN`, `ECLIPSE`, or `CRIMSON`
   - **Active Price (₹)**: e.g., `2199`
   - **Stock Quantity**: e.g., `50`
   - **Product Image**: Click **Upload New** to upload a file from your device, or paste a URL
   - **Available Sizes**: Check boxes (`S`, `M`, `L`, `XL`, `XXL`)
   - **Description & Story**: Enter the editorial garment narrative
5. Click **SAVE PRODUCT**.
6. The product is inserted into the database, an audit entry `PRODUCT_CREATED` is logged, and the item immediately appears on the public storefront!

---

## 💰 7. How to Change a Price

1. In the Admin Dashboard, click **PRODUCTS**.
2. Find the product in the table (or use the search bar).
3. Click the **Edit** icon (pencil) in the Actions column.
4. Modify the **ACTIVE PRICE (₹)** field:
   - Example: Change `1999` to `2499`.
   - Optionally update the **ORIGINAL / STRIKE (₹)** field to show a strikethrough discount price.
5. Click **SAVE PRODUCT**.
6. **Result**:
   - The database record is updated with timestamp.
   - An immutable audit entry `PRICE_CHANGED` is recorded with `old_value={"price": 1999}` and `new_value={"price": 2499}`.
   - The public website immediately displays `₹2,499.00` on the product card, detail showcase, quick view, and cart without requiring any source code modifications!

---

## 📸 8. How to Upload Product Images

1. **Within the Product Editor**:
   - Click the **Upload New** button beside the image field.
   - Select any image file (JPEG, PNG, WEBP) up to 10MB.
   - The server validates the image using Pillow, saves it to `uploads/soul_[uuid].[ext]`, and automatically assigns the path to the product.
2. **Via Media Library**:
   - Click **MEDIA** in the admin sidebar.
   - Drag & drop an image or click the upload box.
   - Click **Copy Path** on any uploaded asset to paste it into products or collections.

---

## ⛩️ 9. How to Create or Edit a Collection

1. In the sidebar, click **COLLECTIONS**.
2. Click **CREATE COLLECTION** (or **Edit** on an existing collection card).
3. Set the **Collection Name** (e.g. `KAMI`), **Subtitle** (e.g. `DIVINE SPIRIT DROP`), and cover image.
4. Click **SAVE COLLECTION**.
5. The collection is saved to the database and reflected across the catalog filters and homepage.

---

## 🚀 10. How to Deploy the Website Securely

### Option A: Self-Hosted Cloud Server (Ubuntu VPS / DigitalOcean / AWS EC2)
1. Clone the repository to the server.
2. Install Python dependencies:
   ```bash
   pip install starlette uvicorn pillow python-multipart requests
   ```
3. Initialize the database:
   ```bash
   python -m backend.seed_data
   ```
4. Run with a production process manager (systemd or PM2):
   ```bash
   uvicorn backend.server:app --host 0.0.0.0 --port 8080 --workers 4
   ```
5. Configure Nginx with SSL (Let's Encrypt / Certbot) as a reverse proxy:
   ```nginx
   server {
       server_name thesoulvastra.com;
       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Option B: Deploy with Supabase Backend & Vercel / Netlify Frontend
1. Create a project at [supabase.com](https://supabase.com).
2. Open the Supabase SQL Editor and execute [`backend/supabase_schema.sql`](file:///c:/Users/sauds/OneDrive/Documents/CLU/the-soul-vastra/backend/supabase_schema.sql).
3. Create your owner user in Supabase Authentication and set `role = 'owner'` in the `public.profiles` table.
4. Deploy the frontend to Vercel/Netlify pointing to your Supabase project URL and anonymous key. All mutating operations will be rejected by Supabase RLS unless the owner JWT is presented.

---

## 🧪 Automated Security Verification Results

The automated test suite ([`test_security_suite.py`](file:///c:/Users/sauds/OneDrive/Documents/CLU/the-soul-vastra/test_security_suite.py)) executes live verification against all required attack and access vectors:

```
==================================================================
      THE SOUL VASTRA - SECURITY & AUTHORIZATION TEST SUITE       
==================================================================

--- TEST 1: Public Website Access (Unauthenticated) ---
Sample Public Product: 'DAWN OF DISCIPLINE' at Price: INR 1999.0
[PASS] TEST 1: Public website and catalogue accessible, prices visible, zero admin leaks.

--- TEST 2: Unauthorized /admin Access ---
/admin response code: 302, Location: /admin/login
[PASS] TEST 2: Unauthenticated /admin request strictly redirects to /admin/login.

--- TEST 3: Authenticate with Owner Account ---
Logged in as: owner@thesoulvastra.com (Role: owner)
[PASS] TEST 3: Owner authentication succeeded, session cookie issued, dashboard accessible.

--- TEST 4: Change Product Price (Admin -> DB -> Public API) ---
Original Price of 'DAWN OF DISCIPLINE': INR 1999.0
Admin updated price to: INR 2499.0
Public API live price: INR 2499.0
[PASS] TEST 4: Price change saved to database and immediately reflected on public API.

--- TEST 5 & 6: Mutation Without Authentication Rejected ---
Unauthenticated PUT status: 401 -> {"success":false,"error":"Authentication required. Please log in as the owner."}
[PASS] TEST 5 & 6: Backend strictly rejected unauthenticated mutation with HTTP 401.

--- TEST 7: Mutation by Authenticated Non-Owner Rejected ---
Customer role PUT status: 403 -> {"success":false,"error":"Access denied: Owner privileges required to modify catalogue records."}
[PASS] TEST 7: Backend strictly rejected authenticated non-owner mutation with HTTP 403.

--- TEST 8: Delete Product from Admin ---
[PASS] TEST 8: Product deleted from database and removed from public catalogue.

--- TEST 9: Upload Product Image Through Admin ---
Uploaded Image URL: /uploads/soul_52466df3b3f0.jpg
[PASS] TEST 9: Image uploaded securely, stored on server, and accessible via public URL.

--- TEST 10: Verify Audit Logs ---
Recorded Actions in Audit Log: ['IMAGE_UPLOADED', 'PRODUCT_DELETED', 'PRODUCT_CREATED', 'USER_LOGIN', 'PRODUCT_UPDATED', 'PRICE_CHANGED']
[PASS] TEST 10: Immutable audit log recorded all administrative mutations.

==================================================================
      ALL 9 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS!       
==================================================================
```
