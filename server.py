#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import os
import time
from urllib.request import Request, urlopen


RATE_API = "https://open.er-api.com/v6/latest/USD"
RATE_CACHE = {"expires": 0, "payload": None}
SUPPORTED = ("USD", "CNY", "EUR", "GBP", "JPY", "KRW", "AUD", "CAD", "SGD", "HKD", "TWD")


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/rates":
            self.serve_rates()
            return
        super().do_GET()

    def serve_rates(self):
        now = time.time()
        try:
            if RATE_CACHE["payload"] is None or RATE_CACHE["expires"] <= now:
                request = Request(RATE_API, headers={"Accept": "application/json", "User-Agent": "WorthCalculator/1.0"})
                with urlopen(request, timeout=8) as response:
                    source = json.load(response)
                if source.get("result") != "success" or "rates" not in source:
                    raise ValueError("invalid provider response")
                usd_rates = source["rates"]
                cny_per_usd = float(usd_rates["CNY"])
                converted = {
                    code: (1.0 if code == "CNY" else cny_per_usd / float(usd_rates[code]))
                    for code in SUPPORTED
                }
                RATE_CACHE["payload"] = {
                    "provider": "ExchangeRate-API",
                    "updated": source.get("time_last_update_utc"),
                    "next_update": source.get("time_next_update_utc"),
                    "rates": converted,
                }
                RATE_CACHE["expires"] = now + 86400
            body = json.dumps(RATE_CACHE["payload"], ensure_ascii=False).encode("utf-8")
            self.send_response(200)
        except Exception as error:
            body = json.dumps({"error": "rate_provider_unavailable", "detail": str(error)}).encode("utf-8")
            self.send_response(502)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Serve the Worth calculator")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    os.chdir(Path(__file__).resolve().parent / "public")
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Worth calculator: http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
