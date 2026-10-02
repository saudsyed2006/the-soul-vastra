"""
THE SOUL VASTRA - Automated Security & Functionality Verification Suite
Tests all 9 required verification scenarios from the specification.
"""

import sys
import json
import requests
import io
from PIL import Image

BASE_URL = "http://127.0.0.1:8080"

def run_tests():
    print("==================================================================")
    print("      THE SOUL VASTRA - SECURITY & AUTHORIZATION TEST SUITE       ")
    print("==================================================================")
    
    session = requests.Session()
    
    # -------------------------------------------------------------
    # TEST 1: Open public website without logging in
    # -------------------------------------------------------------
    print("\n--- TEST 1: Public Website Access (Unauthenticated) ---")
    res = requests.get(f"{BASE_URL}/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "THE SOUL VASTRA" in res.text, "Expected public branding in HTML"
    assert "WEAR YOUR LEGACY" in res.text or "WEAR" in res.text, "Expected hero content"
    
    # Check public products API
    prod_res = requests.get(f"{BASE_URL}/api/products")
    assert prod_res.status_code == 200, f"Expected 200 from /api/products, got {prod_res.status_code}"
    prod_data = prod_res.json()
    assert prod_data.get("success") == True, "Expected success: true from products API"
    assert len(prod_data.get("products", [])) >= 8, f"Expected >= 8 products, got {len(prod_data.get('products', []))}"
    
    # Verify prices are visible and no admin tokens leaked
    first_p = prod_data["products"][0]
    print(f"Sample Public Product: '{first_p['name']}' at Price: INR {first_p['price']}")
    assert "password_hash" not in str(prod_data), "Security leak: password_hash exposed in public API!"
    assert "salt" not in str(prod_data), "Security leak: salt exposed in public API!"
    print("[PASS] TEST 1: Public website and catalogue accessible, prices visible, zero admin leaks.")

    # -------------------------------------------------------------
    # TEST 2: Open /admin without logging in
    # -------------------------------------------------------------
    print("\n--- TEST 2: Unauthorized /admin Access ---")
    admin_res = requests.get(f"{BASE_URL}/admin", allow_redirects=False)
    print(f"/admin response code: {admin_res.status_code}, Location: {admin_res.headers.get('Location')}")
    assert admin_res.status_code in (302, 307, 303), f"Expected redirect, got {admin_res.status_code}"
    assert "/admin/login" in admin_res.headers.get("Location", ""), "Expected redirect to /admin/login"
    print("[PASS] TEST 2: Unauthenticated /admin request strictly redirects to /admin/login.")

    # -------------------------------------------------------------
    # TEST 3: Login with Owner account
    # -------------------------------------------------------------
    print("\n--- TEST 3: Authenticate with Owner Account ---")
    owner_session = requests.Session()
    login_payload = {
        "email": "owner@thesoulvastra.com",
        "password": "SoulVastra@2026!"
    }
    login_res = owner_session.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed with status {login_res.status_code}: {login_res.text}"
    login_data = login_res.json()
    assert login_data.get("success") == True, "Login response success was not True"
    assert login_data["user"]["role"] == "owner", f"Expected role 'owner', got {login_data['user']['role']}"
    assert "soul_session" in owner_session.cookies, "Expected HTTP-only 'soul_session' cookie"
    
    # Check /admin now succeeds for the owner
    admin_auth_res = owner_session.get(f"{BASE_URL}/admin")
    assert admin_auth_res.status_code == 200, f"Expected 200 on /admin for owner, got {admin_auth_res.status_code}"
    assert "Owner Dashboard" in admin_auth_res.text, "Expected Owner Dashboard in HTML"
    print(f"Logged in as: {login_data['user']['email']} (Role: {login_data['user']['role']})")
    print("[PASS] TEST 3: Owner authentication succeeded, session cookie issued, dashboard accessible.")

    # -------------------------------------------------------------
    # TEST 4: Change a product price (₹1,999 -> ₹2,499)
    # -------------------------------------------------------------
    print("\n--- TEST 4: Change Product Price (Admin -> DB -> Public API) ---")
    target_id = "dawn-of-discipline"
    
    # Fetch current product details from admin
    get_res = owner_session.get(f"{BASE_URL}/api/admin/products/{target_id}")
    assert get_res.status_code == 200, "Could not fetch product from admin"
    orig_prod = get_res.json()["product"]
    print(f"Original Price of '{orig_prod['name']}': INR {orig_prod['price']}")
    
    # Update price to 2499.0
    new_price = 2499.0
    orig_prod["price"] = new_price
    update_res = owner_session.put(f"{BASE_URL}/api/admin/products/{target_id}", json=orig_prod)
    assert update_res.status_code == 200, f"Failed to update product: {update_res.text}"
    print(f"Admin updated price to: INR {new_price}")
    
    # Verify public API returns the new price
    public_res = requests.get(f"{BASE_URL}/api/products/{target_id}")
    assert public_res.status_code == 200, "Public API failed to return product"
    public_prod = public_res.json()["product"]
    print(f"Public API live price: INR {public_prod['price']}")
    assert abs(public_prod["price"] - new_price) < 0.01, f"Expected {new_price}, got {public_prod['price']}"
    print("[PASS] TEST 4: Price change saved to database and immediately reflected on public API.")

    # -------------------------------------------------------------
    # TEST 5 & 6: Attempt to modify product without authentication
    # -------------------------------------------------------------
    print("\n--- TEST 5 & 6: Mutation Without Authentication Rejected ---")
    unauth_res = requests.put(f"{BASE_URL}/api/admin/products/{target_id}", json={"price": 10.0})
    print(f"Unauthenticated PUT status: {unauth_res.status_code} -> {unauth_res.text}")
    assert unauth_res.status_code == 401, f"Expected 401 Unauthorized, got {unauth_res.status_code}"
    print("[PASS] TEST 5 & 6: Backend strictly rejected unauthenticated mutation with HTTP 401.")

    # -------------------------------------------------------------
    # TEST 7: Attempt to call product update API as non-owner (Customer)
    # -------------------------------------------------------------
    print("\n--- TEST 7: Mutation by Authenticated Non-Owner Rejected ---")
    customer_session = requests.Session()
    cust_login_res = customer_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "customer@thesoulvastra.com",
        "password": "Customer@2026!"
    })
    assert cust_login_res.status_code == 200, f"Customer login failed: {cust_login_res.text}"
    cust_data = cust_login_res.json()
    assert cust_data["user"]["role"] == "customer", f"Expected role 'customer', got {cust_data['user']['role']}"
    
    # Attempt mutation as customer
    cust_hack_res = customer_session.put(f"{BASE_URL}/api/admin/products/{target_id}", json={"price": 50.0})
    print(f"Customer role PUT status: {cust_hack_res.status_code} -> {cust_hack_res.text}")
    assert cust_hack_res.status_code == 403, f"Expected 403 Forbidden, got {cust_hack_res.status_code}"
    assert "Owner privileges required" in cust_hack_res.text or "Access denied" in cust_hack_res.text
    print("[PASS] TEST 7: Backend strictly rejected authenticated non-owner mutation with HTTP 403.")

    # -------------------------------------------------------------
    # TEST 8: Delete a product from Admin
    # -------------------------------------------------------------
    print("\n--- TEST 8: Delete Product from Admin ---")
    # First create a temporary product to delete
    temp_id = "test-delete-garment"
    create_res = owner_session.post(f"{BASE_URL}/api/admin/products", json={
        "id": temp_id,
        "name": "TEST TEMPORARY GARMENT",
        "price": 999.0,
        "category": "OVERSIZED",
        "collection": "CRIMSON"
    })
    assert create_res.status_code == 200, f"Failed to create temp product: {create_res.text}"
    
    # Verify visible in public catalog
    temp_check = requests.get(f"{BASE_URL}/api/products/{temp_id}")
    assert temp_check.status_code == 200, "Temp product was not created"
    
    # Delete product via owner session
    delete_res = owner_session.delete(f"{BASE_URL}/api/admin/products/{temp_id}")
    assert delete_res.status_code == 200, f"Delete failed: {delete_res.text}"
    
    # Verify gone from public catalog
    deleted_check = requests.get(f"{BASE_URL}/api/products/{temp_id}")
    assert deleted_check.status_code == 404, f"Expected 404 after deletion, got {deleted_check.status_code}"
    print("[PASS] TEST 8: Product deleted from database and removed from public catalogue.")

    # -------------------------------------------------------------
    # TEST 9: Upload new product image
    # -------------------------------------------------------------
    print("\n--- TEST 9: Upload Product Image Through Admin ---")
    # Generate a sample 200x200 test JPEG in memory
    img = Image.new("RGB", (200, 200), color=(200, 27, 36))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG")
    img_bytes.seek(0)
    
    files = {"file": ("test_samurai_tee.jpg", img_bytes, "image/jpeg")}
    upload_res = owner_session.post(f"{BASE_URL}/api/admin/upload-image", files=files)
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data.get("success") == True, "Upload response success was not True"
    image_url = upload_data.get("url")
    print(f"Uploaded Image URL: {image_url}")
    assert image_url.startswith("/uploads/soul_"), f"Unexpected URL format: {image_url}"
    
    # Verify the uploaded image is accessible publicly via HTTP
    img_http_res = requests.get(f"{BASE_URL}{image_url}")
    assert img_http_res.status_code == 200, f"Uploaded image not accessible: {img_http_res.status_code}"
    assert img_http_res.headers.get("Content-Type", "").startswith("image/"), "Expected image content type"
    print("[PASS] TEST 9: Image uploaded securely, stored on server, and accessible via public URL.")

    # -------------------------------------------------------------
    # TEST 10: Verify Audit Logs Recorded
    # -------------------------------------------------------------
    print("\n--- TEST 10: Verify Audit Logs ---")
    audit_res = owner_session.get(f"{BASE_URL}/api/admin/audit-logs")
    assert audit_res.status_code == 200, "Failed to get audit logs"
    logs = audit_res.json().get("logs", [])
    actions = [l["action"] for l in logs]
    print(f"Recorded Actions in Audit Log: {actions[:8]}")
    assert "PRICE_CHANGED" in actions, "Audit log missing PRICE_CHANGED entry!"
    assert "PRODUCT_DELETED" in actions, "Audit log missing PRODUCT_DELETED entry!"
    print("[PASS] TEST 10: Immutable audit log recorded all administrative mutations.")

    print("\n==================================================================")
    print("      ALL 9 VERIFICATION SCENARIOS PASSED WITH ZERO ERRORS!       ")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
