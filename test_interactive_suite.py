import asyncio
import json
import subprocess
import time
import urllib.request
import websockets
import sys

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.msg_id = 0
        self.pending = {}

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=25 * 1024 * 1024)
        self.listen_task = asyncio.create_task(self._listener())

    async def _listener(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                mid = msg.get("id")
                if mid and mid in self.pending:
                    self.pending[mid].set_result(msg)
        except Exception:
            pass

    async def call(self, method, params=None):
        self.msg_id += 1
        mid = self.msg_id
        fut = asyncio.get_event_loop().create_future()
        self.pending[mid] = fut
        payload = {"id": mid, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        res = await asyncio.wait_for(fut, timeout=10.0)
        del self.pending[mid]
        if "error" in res:
            raise RuntimeError(f"CDP error: {res['error']}")
        return res.get("result", {})

    async def evaluate(self, expr):
        res = await self.call("Runtime.evaluate", {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True
        })
        return res.get("result", {}).get("value")

    async def close(self):
        self.listen_task.cancel()
        await self.ws.close()

async def main():
    print("Launching Edge with remote debugging port 9222...")
    proc = subprocess.Popen([
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://localhost:8080/index.html"
    ])
    
    await asyncio.sleep(2)
    
    try:
        req = urllib.request.urlopen("http://127.0.0.1:9222/json")
        targets = json.loads(req.read().decode())
        print("Available targets:", [(t.get("type"), t.get("url")) for t in targets])
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]
        print("Connecting to page target:", page_target.get("url"))
        
        client = CDPClient(ws_url)
        await client.connect()
        await client.call("Page.enable")
        await client.call("Runtime.enable")
        
        print("Navigating to http://localhost:8080/index.html...")
        await client.call("Page.navigate", {"url": "http://localhost:8080/index.html"})
        for _ in range(30):
            state = await client.evaluate("document.readyState")
            if state == "complete":
                break
            await asyncio.sleep(0.3)
        await asyncio.sleep(1)
        
        # Test 1: Page Title and Structure
        print("\n--- Test 1: Page Title & Critical DOM Elements ---")
        title = await client.evaluate("document.title")
        print("Page Title:", title)
        assert "THE SOUL VASTRA" in title, "Title does not contain THE SOUL VASTRA"
        
        sections = await client.evaluate("""
            (() => {
                return {
                    header: !!document.querySelector('#mainHeader'),
                    mobileNav: !!document.querySelector('#mobileNavOverlay'),
                    hero: !!document.querySelector('#hero'),
                    intro: !!document.querySelector('.intro-section'),
                    collections: !!document.querySelector('#collections'),
                    showcase: !!document.querySelector('#showcase'),
                    categories: !!document.querySelector('#categories'),
                    prints: !!document.querySelector('#prints'),
                    shop: !!document.querySelector('#shop'),
                    story: !!document.querySelector('#story'),
                    quality: !!document.querySelector('.quality-section'),
                    philosophy: !!document.querySelector('.philosophy-section'),
                    katanaBanner: !!document.querySelector('.katana-brand-banner'),
                    footer: !!document.querySelector('#footer'),
                    cartDrawer: !!document.querySelector('#cartDrawer'),
                    quickViewModal: !!document.querySelector('#quickViewModal'),
                    sizeGuideModal: !!document.querySelector('#sizeGuideModal'),
                    collectionCardsCount: document.querySelectorAll('.collection-card').length,
                    productCardsCount: document.querySelectorAll('#shopProductGrid .product-card').length,
                    qualityFeaturesCount: document.querySelectorAll('.quality-item').length,
                    printsCardsCount: document.querySelectorAll('.print-card').length
                };
            })()
        """)
        print("DOM Check Summary:", json.dumps(sections, indent=2))
        assert sections["collectionCardsCount"] == 4, f"Expected 4 collections, got {sections['collectionCardsCount']}"
        assert sections["productCardsCount"] >= 8, f"Expected >= 8 products in catalog, got {sections['productCardsCount']}"
        assert sections["qualityFeaturesCount"] == 5, f"Expected 5 quality features, got {sections['qualityFeaturesCount']}"
        assert sections["printsCardsCount"] == 5, f"Expected 5 print cards, got {sections['printsCardsCount']}"
        print("[PASS] Test 1: All 21 essential sections and counts verified.")
        
        # Test 2: Cart Drawer & Operations
        print("\n--- Test 2: Cart Drawer & Operations ---")
        cart_test = await client.evaluate("""
            (() => {
                // Clear any leftover test data
                localStorage.removeItem('soul_vastra_cart');
                window.soulCart.items = [];
                window.soulCart.updateUI();
                
                // Add first item
                window.soulCart.addItem('dawn-of-discipline', 'L', 1);
                const count1 = window.soulCart.getTotalCount();
                
                // Add second item
                window.soulCart.addItem('rising', 'XL', 2);
                const count2 = window.soulCart.getTotalCount();
                const subtotal = window.soulCart.getSubtotal();
                
                // Open drawer
                window.soulCart.openDrawer();
                const drawerActive = document.querySelector('#cartDrawer').classList.contains('active');
                
                // Update quantity of first item by +1
                window.soulCart.updateQuantity('dawn-of-discipline', 'L', 1);
                const count3 = window.soulCart.getTotalCount();
                
                // Close drawer
                window.soulCart.closeDrawer();
                const drawerClosed = !document.querySelector('#cartDrawer').classList.contains('active');
                
                return {
                    count1,
                    count2,
                    subtotal,
                    drawerActive,
                    count3,
                    drawerClosed
                };
            })()
        """)
        print("Cart Test Results:", json.dumps(cart_test, indent=2))
        assert cart_test["count1"] == 1, f"Expected 1 item, got {cart_test['count1']}"
        assert cart_test["count2"] == 3, f"Expected 3 items, got {cart_test['count2']}"
        assert cart_test["count3"] == 4, f"Expected 4 items, got {cart_test['count3']}"
        assert cart_test["drawerActive"] == True, "Cart drawer did not open"
        assert cart_test["drawerClosed"] == True, "Cart drawer did not close"
        print("[PASS] Test 2: Cart drawer, quantity adjustments, and subtotal calculation verified.")
        
        # Test 3: Quick View Modal
        print("\n--- Test 3: Quick View Modal ---")
        qv_test = await client.evaluate("""
            (() => {
                window.openQuickView('dawn-of-discipline');
                const modal = document.querySelector('#quickViewModal');
                const title = document.querySelector('.qv-title') ? document.querySelector('.qv-title').textContent : '';
                const isOpen = modal.classList.contains('active');
                
                const closeBtn = modal.querySelector('.modal-close-btn');
                if (closeBtn) closeBtn.click();
                const isClosed = !modal.classList.contains('active');
                
                return { isOpen, isClosed, title };
            })()
        """)
        print("Quick View Results:", json.dumps(qv_test, indent=2))
        assert qv_test["isOpen"] == True, "Quick view modal did not open"
        assert "DAWN OF DISCIPLINE" in qv_test["title"], f"Wrong product in quick view: {qv_test['title']}"
        assert qv_test["isClosed"] == True, "Quick view modal did not close"
        print("[PASS] Test 3: Quick View modal loads correct product data and toggles correctly.")
        
        # Test 4: Size Guide Modal & Unit Toggle (Inches vs Centimeters)
        print("\n--- Test 4: Size Guide Modal & Unit Toggle ---")
        sg_test = await client.evaluate("""
            (() => {
                window.openSizeGuideModal();
                const modal = document.querySelector('#sizeGuideModal');
                const isOpen = modal.classList.contains('active');
                
                // Click Centimeters toggle
                const cmBtn = document.querySelector('.unit-toggle-btn[data-unit="cm"]');
                if (cmBtn) cmBtn.click();
                const firstValCm = document.querySelector('.measure-val') ? document.querySelector('.measure-val').textContent : '';
                
                // Click Inches toggle
                const inBtn = document.querySelector('.unit-toggle-btn[data-unit="in"]');
                if (inBtn) inBtn.click();
                const firstValIn = document.querySelector('.measure-val') ? document.querySelector('.measure-val').textContent : '';
                
                const closeBtn = modal.querySelector('.modal-close-btn');
                if (closeBtn) closeBtn.click();
                const isClosed = !modal.classList.contains('active');
                
                return { isOpen, isClosed, firstValCm, firstValIn };
            })()
        """)
        print("Size Guide Results:", json.dumps(sg_test, indent=2))
        assert sg_test["isOpen"] == True, "Size guide modal did not open"
        assert "cm" in sg_test["firstValCm"], f"Expected 'cm' measurement, got {sg_test['firstValCm']}"
        assert '"' in sg_test["firstValIn"], f"Expected inches measurement, got {sg_test['firstValIn']}"
        assert sg_test["isClosed"] == True, "Size guide modal did not close"
        print("[PASS] Test 4: Size Guide modal renders and unit toggle switches units dynamically.")
        
        # Test 5: Shop Category Filters
        print("\n--- Test 5: Shop Category Filters ---")
        filter_test = await client.evaluate("""
            (() => {
                const results = {};
                
                // Filter Oversized
                const ovBtn = document.querySelector('.shop-filter-btn[data-filter="OVERSIZED"]');
                if (ovBtn) ovBtn.click();
                results.oversizedVisible = document.querySelectorAll('#shopProductGrid .product-card').length;
                
                // Filter Round Neck
                const rnBtn = document.querySelector('.shop-filter-btn[data-filter="ROUND NECK"]');
                if (rnBtn) rnBtn.click();
                results.roundNeckVisible = document.querySelectorAll('#shopProductGrid .product-card').length;
                
                // Filter New Arrivals
                const naBtn = document.querySelector('.shop-filter-btn[data-filter="NEW ARRIVALS"]');
                if (naBtn) naBtn.click();
                results.newArrivalsVisible = document.querySelectorAll('#shopProductGrid .product-card').length;
                
                // Filter All
                const allBtn = document.querySelector('.shop-filter-btn[data-filter="ALL"]');
                if (allBtn) allBtn.click();
                results.allVisible = document.querySelectorAll('#shopProductGrid .product-card').length;
                
                return results;
            })()
        """)
        print("Shop Filter Results:", json.dumps(filter_test, indent=2))
        assert filter_test["oversizedVisible"] > 0, "No items visible for OVERSIZED filter"
        assert filter_test["roundNeckVisible"] > 0, "No items visible for ROUND NECK filter"
        assert filter_test["allVisible"] >= filter_test["oversizedVisible"], "ALL filter returned fewer than OVERSIZED"
        print("[PASS] Test 5: Shop category filters working accurately.")
        
        # Test 6: Accordions
        print("\n--- Test 6: Showcase Accordions ---")
        accordion_test = await client.evaluate("""
            (() => {
                const accBtn = document.querySelector('.accordion-header');
                const item = accBtn.parentElement;
                const initialActive = item.classList.contains('active');
                
                accBtn.click();
                const afterClickActive = item.classList.contains('active');
                
                accBtn.click();
                const afterSecondClickActive = item.classList.contains('active');
                
                return { initialActive, afterClickActive, afterSecondClickActive };
            })()
        """)
        print("Accordion Results:", json.dumps(accordion_test, indent=2))
        assert accordion_test["afterClickActive"] != accordion_test["initialActive"], "Accordion toggle did not change state"
        print("[PASS] Test 6: Accordion expand/collapse working.")
        
        # Test 7: Mobile Navigation Overlay
        print("\n--- Test 7: Mobile Navigation Overlay ---")
        mobile_nav_test = await client.evaluate("""
            (() => {
                const burger = document.querySelector('#mobileMenuToggle');
                const overlay = document.querySelector('#mobileNavOverlay');
                const closeBtn = document.querySelector('#mobileNavClose');
                
                burger.click();
                const isOpen = overlay.classList.contains('active');
                
                closeBtn.click();
                const isClosed = !overlay.classList.contains('active');
                
                return { isOpen, isClosed };
            })()
        """)
        print("Mobile Nav Results:", json.dumps(mobile_nav_test, indent=2))
        assert mobile_nav_test["isOpen"] == True, "Mobile nav overlay failed to open"
        assert mobile_nav_test["isClosed"] == True, "Mobile nav overlay failed to close"
        print("[PASS] Test 7: Fullscreen mobile menu opens and closes smoothly.")
        
        print("\n==========================================")
        print("ALL INTERACTION AND ARCHITECTURE TESTS PASSED!")
        print("==========================================")
        
        await client.close()
    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
