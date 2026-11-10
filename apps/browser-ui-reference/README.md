# McCrack Browser

A lightweight, stylish browser-style web app with:

- Multi-tab browsing
- New-tab landing page with quick search
- URL bar with smart search fallback
- Back / forward / reload controls
- Cloudflare Worker proxy routing

## Proxy configuration

This project is configured to use:

`https://mccrackbrowser.patrickmango499.workers.dev`

When you visit a URL, McCrack Browser sends the iframe to:

`https://mccrackbrowser.patrickmango499.workers.dev/<target-url>`

Example:

`https://mccrackbrowser.patrickmango499.workers.dev/https://example.com`

## Run locally

Because this is a static app, you can run it with any static server.

### Option 1: Python

```bash
python3 -m http.server 5173
```

Then open:

`http://localhost:5173`

### Option 2: VS Code Live Server

Open `index.html` with Live Server and browse from there.

## Notes

- Some sites may block iframe embedding (`X-Frame-Options` / CSP).
- Proxy behavior depends on your Cloudflare Worker implementation.
