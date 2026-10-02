import asyncio
import json
import subprocess
import time
import urllib.request
import websockets
import base64

async def capture():
    proc = subprocess.Popen([
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://localhost:8080/admin/login"
    ])
    await asyncio.sleep(2)
    
    try:
        req = urllib.request.urlopen("http://127.0.0.1:9222/json")
        targets = json.loads(req.read().decode())
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]
        
        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            msg_id = 1
            async def call(method, params=None):
                nonlocal msg_id
                msg_id += 1
                payload = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    raw = await ws.recv()
                    data = json.loads(raw)
                    if data.get("id") == payload["id"]:
                        return data.get("result", {})
            
            await call("Page.enable")
            await call("Runtime.enable")
            await call("Network.enable")
            
            # 1. Screenshot login screen
            await asyncio.sleep(1)
            shot1 = await call("Page.captureScreenshot", {"format": "png"})
            with open("assets/site_reviews/admin_login_screen.png", "wb") as f:
                f.write(base64.b64decode(shot1["data"]))
            print("[OK] Saved admin login screenshot")
            
            # 2. Fill login form and submit
            await call("Runtime.evaluate", {
                "expression": """
                (() => {
                    document.getElementById('loginEmail').value = 'owner@thesoulvastra.com';
                    document.getElementById('loginPassword').value = 'SoulVastra@2026!';
                    document.getElementById('submitLoginBtn').click();
                })()
                """
            })
            await asyncio.sleep(2)
            
            # 3. Screenshot Admin Dashboard
            shot2 = await call("Page.captureScreenshot", {"format": "png"})
            with open("assets/site_reviews/admin_dashboard_screen.png", "wb") as f:
                f.write(base64.b64decode(shot2["data"]))
            print("[OK] Saved admin dashboard screenshot")
            
            # 4. Navigate to Products tab in Admin and screenshot
            await call("Runtime.evaluate", {
                "expression": "window.switchTab('products')"
            })
            await asyncio.sleep(1)
            shot3 = await call("Page.captureScreenshot", {"format": "png"})
            with open("assets/site_reviews/admin_products_screen.png", "wb") as f:
                f.write(base64.b64decode(shot3["data"]))
            print("[OK] Saved admin products tab screenshot")
            
            # 5. Navigate to Public Homepage and verify live hydrated price
            await call("Page.navigate", {"url": "http://localhost:8080/"})
            await asyncio.sleep(2)
            shot4 = await call("Page.captureScreenshot", {"format": "png"})
            with open("assets/site_reviews/public_live_showcase.png", "wb") as f:
                f.write(base64.b64decode(shot4["data"]))
            print("[OK] Saved public live showcase screenshot")
            
    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(capture())
