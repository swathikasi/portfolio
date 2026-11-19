"""Simple backend for the portfolio. Uses only Python's standard library (no pip install needed).
Run:  python server.py   (or python3 server.py)   then open http://localhost:8000
"""
import json, os, re, threading, time, webbrowser
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(BASE, "public")
MESSAGES = os.path.join(BASE, "data", "messages.json")
PORT = int(os.environ.get("PORT", 8000))
hits = {}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/contact":
            return self.send_json(404, {"error": "Not found"})
        ip, now = self.client_address[0], time.time()
        recent = [t for t in hits.get(ip, []) if now - t < 600] + [now]
        hits[ip] = recent
        if len(recent) > 5:
            return self.send_json(429, {"error": "Too many messages. Please try again in a few minutes."})
        try:
            size = min(int(self.headers.get("Content-Length", 0)), 20000)
            data = json.loads(self.rfile.read(size) or b"{}")
        except Exception:
            return self.send_json(400, {"error": "Invalid request."})
        name = str(data.get("name", "")).strip()[:80]
        email = str(data.get("email", "")).strip()[:120]
        message = str(data.get("message", "")).strip()[:2000]
        if not name or not message:
            return self.send_json(400, {"error": "Please enter your name and a message."})
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            return self.send_json(400, {"error": "Please enter a valid email address."})
        try:
            with open(MESSAGES, encoding="utf8") as f:
                items = json.load(f)
        except Exception:
            items = []
        items.append({"name": name, "email": email, "message": message,
                      "at": datetime.now(timezone.utc).isoformat()})
        with open(MESSAGES, "w", encoding="utf8") as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        self.send_json(201, {"ok": True})

if __name__ == "__main__":
    os.makedirs(os.path.dirname(MESSAGES), exist_ok=True)
    url = f"http://localhost:{PORT}"
    print(f"Portfolio running at {url}  (press Ctrl+C to stop)")
    threading.Timer(1, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
