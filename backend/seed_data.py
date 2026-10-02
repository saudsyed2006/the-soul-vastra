"""
THE SOUL VASTRA - Database Seed Script
Populates the database with initial Owner account, categories, collections,
the 10 products, and homepage dynamic configuration.
"""

import json
from datetime import datetime, timezone
from backend.database import init_db, get_db_connection
from backend.auth import hash_password

def seed():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    # 1. Seed Owner Account
    # Email: owner@thesoulvastra.com
    # Default initial password: SoulVastra@2026!
    cursor.execute("SELECT id FROM users WHERE email = 'owner@thesoulvastra.com'")
    if not cursor.fetchone():
        pwd_hash, salt = hash_password("SoulVastra@2026!")
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, salt, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("usr_owner_001", "owner@thesoulvastra.com", pwd_hash, salt, "Website Owner", "owner", now))
        print("[OK] Created Owner account: owner@thesoulvastra.com")

    # 1b. Seed Owner Account: thesoulvastra@gmail.com
    cursor.execute("SELECT id FROM users WHERE email = 'thesoulvastra@gmail.com'")
    if not cursor.fetchone():
        pwd_hash, salt = hash_password("SoulVastra@2026!")
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, salt, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("usr_owner_002", "thesoulvastra@gmail.com", pwd_hash, salt, "Soul Vastra Owner", "owner", now))
        print("[OK] Created Owner account: thesoulvastra@gmail.com")

    # 2. Seed Customer Account (for testing non-owner unauthorized attempts)
    # Email: customer@thesoulvastra.com
    cursor.execute("SELECT id FROM users WHERE email = 'customer@thesoulvastra.com'")
    if not cursor.fetchone():
        pwd_hash, salt = hash_password("Customer@2026!")
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, salt, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("usr_customer_001", "customer@thesoulvastra.com", pwd_hash, salt, "Regular Customer", "customer", now))
        print("[OK] Created Customer account: customer@thesoulvastra.com")

    # 3. Seed Categories
    categories = [
        {"id": "cat_oversized", "name": "OVERSIZED T-SHIRTS", "slug": "oversized", "description": "Relaxed fit. Bold look. Made to stand out.", "display_order": 1},
        {"id": "cat_roundneck", "name": "ROUND NECK T-SHIRTS", "slug": "round-neck", "description": "Timeless fit. Everyday essential. Clean, comfortable and classic.", "display_order": 2}
    ]
    for cat in categories:
        cursor.execute("""
            INSERT OR REPLACE INTO categories (id, name, slug, description, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (cat["id"], cat["name"], cat["slug"], cat["description"], cat["display_order"]))

    # 4. Seed Collections
    collections = [
        {"id": "col_shadow", "name": "SHADOW", "slug": "shadow", "subtitle": "BLACK DYE DROP", "description": "Monochrome heavyweights for the midnight prowler.", "image": "assets/images/collection-shadow.jpg", "badge": "DROP 01", "display_order": 1},
        {"id": "col_ronin", "name": "RONIN", "slug": "ronin", "subtitle": "MASTERLESS DISCIPLINE", "description": "Raw hems, weathered prints, unmatched freedom.", "image": "assets/images/collection-ronin.jpg", "badge": "DROP 02", "display_order": 2},
        {"id": "col_eclipse", "name": "ECLIPSE", "slug": "eclipse", "subtitle": "SOLAR CORD", "description": "Darkest charcoal offset by subtle crimson moon highlights.", "image": "assets/images/collection-eclipse.jpg", "badge": "DROP 03", "display_order": 3},
        {"id": "col_crimson", "name": "CRIMSON", "slug": "crimson", "subtitle": "WARRIOR INK", "description": "Vibrant bloody cinnabar accents on heavyweight black cotton.", "image": "assets/images/collection-crimson.jpg", "badge": "DROP 04", "display_order": 4}
    ]
    for col in collections:
        cursor.execute("""
            INSERT OR REPLACE INTO collections (id, name, slug, subtitle, description, image, badge, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (col["id"], col["name"], col["slug"], col["subtitle"], col["description"], col["image"], col["badge"], col["display_order"]))

    # 5. Seed Products (10 authentic products)
    products = [
        {
            "id": "dawn-of-discipline",
            "name": "DAWN OF DISCIPLINE",
            "slug": "dawn-of-discipline",
            "subtitle": "ECLIPSE OVERSIZED TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "ECLIPSE",
            "price": 1999.0,
            "original_price": 2499.0,
            "rating": 4.9,
            "reviews_count": 142,
            "badge": "BEST SELLER",
            "is_featured": 1,
            "is_active": 1,
            "stock_quantity": 85,
            "image": "assets/images/product-dawn-discipline-main.jpg",
            "gallery_json": json.dumps([
                "assets/images/product-dawn-discipline-main.jpg",
                "assets/images/product-dawn-detail.jpg",
                "assets/images/product-dawn-model.jpg",
                "assets/images/product-dawn-alt.jpg"
            ]),
            "description": "Crafted for those who rise in silence. Premium heavyweight cotton. Oversized fit. Built to last.",
            "story": "Forged in midnight shades, the Dawn of Discipline represents the unwavering samurai spirit—calm in turbulence, lethal in execution. Features a high-contrast ink-brush warrior graphic spanning the spine.",
            "fabric": "280 GSM 100% Combed Terry Cotton",
            "fit": "Signature Boxy Oversized Streetwear Fit",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black", "Charcoal Smoke"]),
            "tags_json": json.dumps(["BEST SELLERS", "OVERSIZED"]),
            "display_order": 1
        },
        {
            "id": "rising",
            "name": "RISING",
            "slug": "rising",
            "subtitle": "CRIMSON OVERSIZED TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "CRIMSON",
            "price": 1999.0,
            "original_price": 2399.0,
            "rating": 4.8,
            "reviews_count": 98,
            "badge": "NEW ARRIVAL",
            "is_featured": 1,
            "is_active": 1,
            "stock_quantity": 60,
            "image": "assets/images/model-rising.jpg",
            "gallery_json": json.dumps(["assets/images/model-rising.jpg", "assets/images/cat-oversized-tees.jpg"]),
            "description": "Embody the awakening warrior. Circular crimson sun with bold ink brush warrior emblem for relentless ambition.",
            "story": "The Rising print honors the ronin who awakens before the world stirs. Pure discipline channeled into wearable art.",
            "fabric": "280 GSM Heavyweight Terry Cotton",
            "fit": "Drop-Shoulder Oversized",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black"]),
            "tags_json": json.dumps(["NEW ARRIVALS", "OVERSIZED"]),
            "display_order": 2
        },
        {
            "id": "shinigami",
            "name": "SHINIGAMI",
            "slug": "shinigami",
            "subtitle": "SHADOW HEAVYWEIGHT TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "SHADOW",
            "price": 2199.0,
            "original_price": 2699.0,
            "rating": 5.0,
            "reviews_count": 215,
            "badge": "LIMITED DROP",
            "is_featured": 1,
            "is_active": 1,
            "stock_quantity": 42,
            "image": "assets/images/model-shinigami.jpg",
            "gallery_json": json.dumps(["assets/images/model-shinigami.jpg"]),
            "description": "Dark reaper aesthetic fused with high-density discharge screen printing. Subtle, ominous, commanding.",
            "story": "Fear nothing except hesitation. The Shinigami print was drawn by hand using black ink before digital translation.",
            "fabric": "300 GSM Ultra-Heavy Cotton",
            "fit": "Structured Boxy Fit",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Pitch Black"]),
            "tags_json": json.dumps(["LIMITED DROPS", "OVERSIZED"]),
            "display_order": 3
        },
        {
            "id": "discipline",
            "name": "DISCIPLINE",
            "slug": "discipline",
            "subtitle": "ESSENTIAL ROUND NECK TEE",
            "category": "ROUND NECK",
            "category_label": "Round Neck T-Shirt",
            "collection": "RONIN",
            "price": 1899.0,
            "original_price": 2199.0,
            "rating": 4.7,
            "reviews_count": 76,
            "badge": "CORE ESSENTIAL",
            "is_featured": 0,
            "is_active": 1,
            "stock_quantity": 110,
            "image": "assets/images/model-discipline.jpg",
            "gallery_json": json.dumps(["assets/images/model-discipline.jpg", "assets/images/cat-roundneck-tees.jpg"]),
            "description": "Everyday armor for relentless daily routines. Ribbed collar that never sags and pre-shrunk premium yarn.",
            "story": "Discipline is choosing between what you want now and what you want most. Clean minimalism meets warrior precision.",
            "fabric": "240 GSM Ring-Spun Combed Cotton",
            "fit": "Tailored Regular Fit",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black", "Ashen Gray"]),
            "tags_json": json.dumps(["ROUND NECK", "BEST SELLERS"]),
            "display_order": 4
        },
        {
            "id": "lone-warrior",
            "name": "LONE WARRIOR",
            "slug": "lone-warrior",
            "subtitle": "RONIN EDITION TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "RONIN",
            "price": 1999.0,
            "original_price": 2499.0,
            "rating": 4.9,
            "reviews_count": 184,
            "badge": "BEST SELLER",
            "is_featured": 1,
            "is_active": 1,
            "stock_quantity": 55,
            "image": "assets/images/model-lone-warrior.jpg",
            "gallery_json": json.dumps(["assets/images/model-lone-warrior.jpg"]),
            "description": "Solitary path, unshakable focus. Back print features a wandering samurai warrior under rain and neon moonlight.",
            "story": "The one who walks alone can start today, but he who travels with another must wait till that other is ready.",
            "fabric": "280 GSM Heavyweight Terry Cotton",
            "fit": "Drop-Shoulder Oversized",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black"]),
            "tags_json": json.dumps(["BEST SELLERS", "OVERSIZED"]),
            "display_order": 5
        },
        {
            "id": "focus",
            "name": "FOCUS",
            "slug": "focus",
            "subtitle": "ECLIPSE ROUND NECK TEE",
            "category": "ROUND NECK",
            "category_label": "Round Neck T-Shirt",
            "collection": "ECLIPSE",
            "price": 1799.0,
            "original_price": 2099.0,
            "rating": 4.8,
            "reviews_count": 62,
            "badge": "NEW ARRIVAL",
            "is_featured": 0,
            "is_active": 1,
            "stock_quantity": 90,
            "image": "assets/images/model-focus.jpg",
            "gallery_json": json.dumps(["assets/images/model-focus.jpg"]),
            "description": "Minimalist chest warrior embroidery with a subtle crimson nape blade tag. Quiet strength that commands attention.",
            "story": "Like an arrow held taut before release: zero distractions, total focus. Engineered for daily wear and workouts.",
            "fabric": "240 GSM Combed Cotton",
            "fit": "Athletic Regular Fit",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black"]),
            "tags_json": json.dumps(["NEW ARRIVALS", "ROUND NECK"]),
            "display_order": 6
        },
        {
            "id": "ronin-black",
            "name": "RONIN BLACK",
            "slug": "ronin-black",
            "subtitle": "LIMITED EDITION DROP",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "RONIN",
            "price": 1999.0,
            "original_price": 2399.0,
            "rating": 4.9,
            "reviews_count": 89,
            "badge": "LIMITED DROP",
            "is_featured": 0,
            "is_active": 1,
            "stock_quantity": 38,
            "image": "assets/images/collection-ronin.jpg",
            "gallery_json": json.dumps(["assets/images/collection-ronin.jpg"]),
            "description": "Masterless samurai warrior typography in high-contrast matte ink across the chest and back yoke.",
            "story": "For those who follow their own code. Heavyweight build that drapes with authoritative presence.",
            "fabric": "280 GSM French Terry",
            "fit": "Boxy Oversized Fit",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black"]),
            "tags_json": json.dumps(["OVERSIZED", "LIMITED DROPS"]),
            "display_order": 7
        },
        {
            "id": "shadow-blade",
            "name": "SHADOW BLADE",
            "slug": "shadow-blade",
            "subtitle": "SHADOW MONOCHROME TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "SHADOW",
            "price": 2299.0,
            "original_price": 2799.0,
            "rating": 4.9,
            "reviews_count": 133,
            "badge": "BEST SELLER",
            "is_featured": 0,
            "is_active": 1,
            "stock_quantity": 47,
            "image": "assets/images/collection-shadow.jpg",
            "gallery_json": json.dumps(["assets/images/collection-shadow.jpg"]),
            "description": "Deep black dye wash with stealth reflective katana blade motif down the left sleeve and spine.",
            "story": "Silence is the highest form of discipline. The blade strikes before the thunder is heard.",
            "fabric": "300 GSM Heavyweight Cotton",
            "fit": "Drop-Shoulder Oversized",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Stealth Black"]),
            "tags_json": json.dumps(["BEST SELLERS", "OVERSIZED"]),
            "display_order": 8
        },
        {
            "id": "crimson-sun",
            "name": "CRIMSON SUN",
            "slug": "crimson-sun",
            "subtitle": "BLOOD RED DROP TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "CRIMSON",
            "price": 1899.0,
            "original_price": 2299.0,
            "rating": 4.7,
            "reviews_count": 54,
            "badge": "NEW ARRIVAL",
            "is_featured": 0,
            "is_active": 1,
            "stock_quantity": 72,
            "image": "assets/images/collection-crimson.jpg",
            "gallery_json": json.dumps(["assets/images/collection-crimson.jpg"]),
            "description": "Bold vermilion sun graphic with hand-painted warrior brush strokes symbolizing strength and rebirth.",
            "story": "Rise from the ashes of every defeat. The crimson sun heralds the awakening warrior.",
            "fabric": "280 GSM Heavyweight Terry Cotton",
            "fit": "Drop-Shoulder Oversized",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Onyx Black"]),
            "tags_json": json.dumps(["NEW ARRIVALS", "OVERSIZED"]),
            "display_order": 9
        },
        {
            "id": "bushido-spirit",
            "name": "BUSHIDO SPIRIT",
            "slug": "bushido-spirit",
            "subtitle": "ECLIPSE HEAVYWEIGHT TEE",
            "category": "OVERSIZED",
            "category_label": "Oversized T-Shirt",
            "collection": "ECLIPSE",
            "price": 1999.0,
            "original_price": 2499.0,
            "rating": 4.8,
            "reviews_count": 115,
            "badge": "BEST SELLER",
            "is_featured": 0,
            "is_active": 1,
            "stock_quantity": 64,
            "image": "assets/images/collection-eclipse.jpg",
            "gallery_json": json.dumps(["assets/images/collection-eclipse.jpg"]),
            "description": "Seven virtues of Bushido inscribed in subtle matte gloss typography across the back panel.",
            "story": "Integrity, Courage, Compassion, Respect, Honesty, Honor, Loyalty. A creed worn with pride.",
            "fabric": "280 GSM Combed Cotton",
            "fit": "Boxy Oversized Fit",
            "sizes_json": json.dumps(["S", "M", "L", "XL", "XXL"]),
            "colors_json": json.dumps(["Charcoal Black"]),
            "tags_json": json.dumps(["BEST SELLERS", "OVERSIZED"]),
            "display_order": 10
        }
    ]

    for prod in products:
        cursor.execute("""
            INSERT OR REPLACE INTO products (
                id, name, slug, subtitle, category, category_label, collection,
                price, original_price, currency, rating, reviews_count, badge,
                is_featured, is_active, stock_quantity, image, gallery_json,
                description, story, fabric, fit, sizes_json, colors_json,
                tags_json, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            prod["id"], prod["name"], prod["slug"], prod["subtitle"], prod["category"],
            prod["category_label"], prod["collection"], prod["price"], prod["original_price"],
            prod.get("currency", "INR"), prod["rating"], prod["reviews_count"], prod["badge"],
            prod["is_featured"], prod["is_active"], prod["stock_quantity"], prod["image"],
            prod["gallery_json"], prod["description"], prod["story"], prod["fabric"],
            prod["fit"], prod["sizes_json"], prod["colors_json"], prod["tags_json"],
            prod["display_order"], now, now
        ))
    print(f"[OK] Seeded {len(products)} products into database.")

    # 6. Seed Homepage Configuration
    homepage_data = {
        "hero": {
            "eyebrow": "WEAR YOUR LEGACY.",
            "eyebrow_jp": "WEAR YOUR LEGACY.",
            "title_line1": "WEAR",
            "title_line2": "YOUR",
            "title_line3": "LEGACY.",
            "subtitle": "Premium streetwear inspired by discipline, strength and individuality.",
            "cta_oversized_text": "SHOP OVERSIZED",
            "cta_roundneck_text": "SHOP ROUND NECK",
            "bg_image": "assets/images/hero-samurai-clean.jpg"
        },
        "intro": {
            "quote_line1": "NOT EVERY SOUL IS WORN.",
            "quote_line2": "SOME ARE FORGED.",
            "scroll_cta": "SCROLL TO ENTER",
            "katana_image": "assets/images/intro-katana.png"
        },
        "story": {
            "heading": "MORE THAN CLOTHING. IT'S A WAY OF LIFE.",
            "p1": "THE SOUL VASTRA is not just fabric. It's discipline. It's mindset. It's a reminder of who you are and who you choose to become.",
            "p2": "We design for the silent warriors. The ones who don't follow the path, but forge their own.",
            "cta_text": "READ OUR STORY",
            "image": "assets/images/story-warrior.jpg"
        },
        "philosophy": {
            "heading": "WE DON'T FOLLOW TRENDS. WE CREATE IDENTITY.",
            "p1": "THE SOUL VASTRA is not just a brand. It's a mindset. A way of life.",
            "p2": "Every print we create carries a meaning. Every piece we make represents strength, discipline and individuality.",
            "p3": "This is not for everyone. This is for those who choose to stand out.",
            "image": "assets/images/philosophy-warrior.jpg"
        },
        "quality": [
            {"title": "PREMIUM COTTON", "desc": "Soft, breathable 280 GSM combed cotton built for all-day comfort."},
            {"title": "HIGH QUALITY PRINTS", "desc": "High-density discharge inks engineered to never crack or fade."},
            {"title": "PERFECT FIT", "desc": "Tailored drop-shoulder structure designed to drape with authority."},
            {"title": "MADE TO LAST", "desc": "Durable double-needle lockstitching stronger with every wash."},
            {"title": "LIMITED DROPS", "desc": "Numbered batches preserving rarity—we drop less, but the best."}
        ]
    }

    cursor.execute("""
        INSERT OR REPLACE INTO homepage_config (key, value_json, updated_at, updated_by)
        VALUES ('main', ?, ?, 'system')
    """, (json.dumps(homepage_data), now))
    print("[OK] Seeded dynamic homepage configuration.")

    conn.commit()
    conn.close()
    print("[OK] Database seeding complete!")

if __name__ == "__main__":
    seed()
