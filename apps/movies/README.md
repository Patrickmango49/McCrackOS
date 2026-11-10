# McCrackFlix

A cinematic movie and TV discovery frontend built for the McCrack ecosystem.

## Features
- Responsive dark UI with cyan accents
- Trending, popular movies, popular TV, search, title details, and local watchlist
- TMDB catalog integration configured in Settings
- Media Provider Manager for APIs you own or are authorized to use
- Stremio add-on protocol connector: validates HTTPS manifests, requests compatible movie/series streams, and merges supported direct HTTP(S) MP4/HLS sources into the player
- Multi-source selection with automatic fallback after a playback error, HLS/MP4 playback, optional WebVTT subtitles, and local playback progress
- TV provider requests include season and episode numbers

## Run it
Open `index.html` locally or enable GitHub Pages for this repository (Settings → Pages → Deploy from a branch → `main` → `/ (root)`).

## Configure the catalog
1. Create a TMDB account and obtain an API Read Access Token from https://www.themoviedb.org/settings/api.
2. Open McCrackFlix and choose **Settings**.
3. Paste the token and choose **Save & load catalog**.

The token is stored in this browser's localStorage. For a public production deployment, consider proxying API requests through a backend so you can manage rate limits and avoid exposing credentials. Follow TMDB's current API terms and attribution requirements.

## Connect a media provider
1. Open **Settings → Add provider**.
2. Enter a provider name and an HTTPS API endpoint that you control or are authorized to call.
3. Optionally enter a bearer token. Provider tokens are stored in localStorage and are visible to anyone using the browser; do not put private production secrets in a public frontend.
4. Open a movie or TV title and choose **Play**. For TV, set the season and episode, then choose **Find episode sources**.

McCrackFlix sends a GET request to the endpoint with these query parameters:
- `type`: `movie` or `tv`
- `id`: TMDB title ID
- `season` and `episode`: included for TV titles

The endpoint must allow browser CORS requests from your site and return JSON in this shape:

```json
{
  "sources": [
    {
      "label": "Main",
      "url": "https://media.example.com/title/stream.m3u8",
      "type": "hls",
      "subtitles": [
        {
          "label": "English",
          "lang": "en",
          "url": "https://media.example.com/subtitles/en.vtt"
        }
      ]
    },
    {
      "label": "MP4 backup",
      "url": "https://media.example.com/title/video.mp4",
      "type": "mp4"
    }
  ]
}
```

Only HTTPS source and subtitle URLs are accepted. HLS playback uses native browser support where available and loads hls.js from jsDelivr otherwise. Browser playback still depends on the provider's CORS headers, codec support, and the stream being valid. The frontend cannot bypass DRM, authentication restrictions, or provider access controls.

## Connect a Stremio-compatible add-on

1. Open **Settings → Stremio add-on connections**.
2. Paste the HTTPS URL ending in `/manifest.json` for an add-on you operate or are authorized to use.
3. McCrackFlix validates the manifest and stores the connection in this browser.
4. Open a movie or series and press **Play**. McCrackFlix uses the TMDB external-ID endpoint to obtain the IMDb ID, then requests the matching Stremio stream resource. For series, it sends the selected season and episode in the Stremio video ID.

The add-on must advertise the `stream` resource and the relevant `movie` or `series` type, and its host must allow browser CORS requests from your McCrackFlix origin. This is a client-side protocol adapter; it does not include a bundled add-on directory or guarantee that any third-party add-on is available.

Only direct HTTPS media URLs ending in or identifying HLS (`.m3u8`) or MP4 (`.mp4`) are passed to the player. Torrent/info-hash entries, external-app links, DRM-protected streams, and formats that browsers cannot play are skipped. Add-ons may return other formats; those require a compatible player or a server-side integration. Subtitles from the Stremio subtitles resource are not currently fetched by this connector.

## Playback status
This is a frontend provider adapter, not a hosted media backend. It does not scrape streaming directories or automatically discover third-party streams. Configure only sources you own or are authorized to distribute. For private production credentials, implement a server-side proxy with authentication and access controls.

## License and attribution
Review the terms of each catalog, artwork, and media provider before deploying publicly. TMDB attribution and branding requirements apply when using its API.
