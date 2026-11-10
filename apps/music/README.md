<div align="center">

# McCrackify

**Music, your way.** A browser-based music player from McCrack.

Search for music, play YouTube videos in the built-in player, queue search results, skip between tracks, save liked songs, and make playlists — no APK required.

[Open McCrackify](https://patrickmango49.github.io/McCrackify/)

</div>

## Features

- YouTube-powered search with multiple public search backends.
- In-page YouTube player for full-length videos when the video owner and YouTube allow embedding.
- Automatically advances through the current search queue when a track ends.
- Skips to the next queued track if YouTube reports that a video cannot be embedded.
- Liked songs, playlists, shuffle, repeat, volume, seeking, and a queue saved/managed in your browser.
- Short Apple Music/iTunes previews are only a fallback when YouTube search services are unavailable.

## Important playback notes

McCrackify does not host music files. Full-length playback uses YouTube's official embedded player and follows YouTube's availability, region, account, and embedding restrictions. Some videos may not permit embedding, and public search backends may be unavailable or rate-limited. If search fails, use the link to open the query on YouTube Music. No browser-only implementation can guarantee that every song is playable.

## Publishing

This project is published with GitHub Pages. The browser app lives in `web/`. The root `index.html` redirects visitors to that folder.

## Branding, copyright, and licenses

**McCrackify branding and original web-edition changes: Copyright © 2026 McCrack.**

This branding notice applies to the McCrackify name, visual identity, and original McCrack-specific web-edition changes. It does **not** transfer ownership of third-party code, assets, music, videos, or trademarks to McCrack.

This repository includes inherited upstream Musify project code. Its existing license and upstream copyright notices remain in effect; see the repository's `LICENSE` file and the notices retained in the source. Contributions and redistribution must comply with those terms, including any applicable GNU GPL v3 requirements. YouTube, Apple, and other third-party services retain their own names, trademarks, terms, and content rights.

McCrackify does not host or claim ownership of the music it links to. Users must respect the terms of the services and the rights of content owners.
