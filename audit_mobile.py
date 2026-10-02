import asyncio
import json
import subprocess
import time
import urllib.request
import websockets
import base64

async def run_audit():
    # Launch Edge
    cmd = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank"
    ]
    proc = subprocess.Popen(cmd)
    time.sleep(2)
    
    try:
        # Get list of targets
        req = urllib.request.urlopen("http://127.0.0.1:9222/json")
        targets = json.loads(req.read().decode())
        ws_url = targets[0]["webSocketDebuggerUrl"]
        print(f"Connected to CDP at {ws_url}")
        
        async with websockets.connect(ws_url, max_size=20*1024*1024) as ws:
            msg_id = 1
            
            async def send(method, params=None):
                nonlocal msg_id
                msg_id += 1
                payload = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == payload["id"]:
                        return res.get("result", {})
            
            # Enable Page and Runtime
            await send("Page.enable")
            await send("Runtime.enable")
            
            # Set device metrics to mobile (375x812, deviceScaleFactor=2, mobile=true)
            await send("Emulation.setDeviceMetricsOverride", {
                "width": 375,
                "height": 812,
                "deviceScaleFactor": 2,
                "mobile": True
            })
            
            # Navigate to local site
            print("Navigating to http://localhost:8080/index.html...")
            await send("Page.navigate", {"url": "http://localhost:8080/index.html"})
            await asyncio.sleep(2)
            
            # Run overflow check script
            eval_res = await send("Runtime.evaluate", {
                "expression": """
                (() => {
                    const docWidth = document.documentElement.clientWidth;
                    const bodyWidth = document.body.clientWidth;
                    const scrollWidth = document.documentElement.scrollWidth;
                    
                    const overflowing = [];
                    document.querySelectorAll('*').forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.right > docWidth + 1) {
                            overflowing.push({
                                tag: el.tagName,
                                id: el.id,
                                class: el.className,
                                left: Math.round(rect.left),
                                right: Math.round(rect.right),
                                width: Math.round(rect.width)
                            });
                        }
                    });
                    
                    // Check header icons specifically
                    const navActions = document.querySelector('.nav-actions');
                    const hamburger = document.querySelector('.hamburger-btn');
                    const cartBtn = document.querySelector('.cart-toggle-btn');
                    
                    const headerInfo = {
                        navActions: navActions ? navActions.getBoundingClientRect() : null,
                        hamburger: hamburger ? {
                            display: window.getComputedStyle(hamburger).display,
                            rect: hamburger.getBoundingClientRect()
                        } : null,
                        cartBtn: cartBtn ? {
                            display: window.getComputedStyle(cartBtn).display,
                            rect: cartBtn.getBoundingClientRect()
                        } : null
                    };
                    
                    return JSON.stringify({
                        docWidth,
                        bodyWidth,
                        scrollWidth,
                        overflowingCount: overflowing.length,
                        overflowing: overflowing.slice(0, 15),
                        headerInfo
                    });
                })()
                """,
                "returnByValue": True
            })
            
            result = json.loads(eval_res.get("result", {}).get("value", "{}"))
            print("=== AUDIT RESULTS ===")
            print("Doc Width:", result.get("docWidth"))
            print("Scroll Width:", result.get("scrollWidth"))
            print("Overflowing Count:", result.get("overflowingCount"))
            print("Header Info:", json.dumps(result.get("headerInfo"), indent=2))
            print("Top Overflowing Elements:")
            for item in result.get("overflowing", []):
                print(f"  [{item['tag']}] id={item['id']} class={item['class']} -> right={item['right']}px, width={item['width']}px")
            
            # Take a mobile screenshot with emulation
            screenshot = await send("Page.captureScreenshot", {"format": "png"})
            with open("assets/site_reviews/mobile_emulated.png", "wb") as f:
                f.write(base64.b64decode(screenshot["data"]))
            print("Saved emulated screenshot to assets/site_reviews/mobile_emulated.png")
            
    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(run_audit())
