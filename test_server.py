#!/usr/bin/env python3
"""
Simple HTTP server to test the website locally
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Change to website directory
os.chdir('ultracube-factoriopedia')

PORT = 8003

Handler = http.server.SimpleHTTPRequestHandler

print(f"Starting server at http://localhost:{PORT}")
print("Press Ctrl+C to stop the server")

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped")