# ☾ McCrack Chat

A high-performance, real-time chat application built with a sleek monochrome aesthetic. This app leverages **Supabase** for database management and real-time message broadcasting, hosted on **GitHub Pages**.

## ✨ Features
* **Real-Time Messaging:** Instant message delivery using Supabase Realtime (PostgreSQL replication).
* **Monochrome UI:** High-contrast black, white, and silver design with glassmorphism effects.
* **Room History:** Automatically saves your recently visited rooms to your browser's local storage for quick access.
* **Privacy-Focused:** No public directory of rooms; you must know the room name to join.
* **Responsive Design:** Optimized for both desktop and mobile viewing.
* **Private DMs:** One-to-one conversations with accepted friends, protected by row-level security.
* **Voice + Video Calls:** One-to-one WebRTC calls with Supabase-powered invitations and signalling, microphone/camera controls, and incoming-call UI.

## 🚀 Technical Stack
* **Frontend:** HTML5, CSS3 (Flexbox, Backdrop-filters), Vanilla JavaScript.
* **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL).
* **Real-time:** Supabase Channels & Broadcast.
* **Hosting:** GitHub Pages.

## 🛠️ How to Use
1.  **Enter a Display Name:** Tell the room who you are.
2.  **Create/Join a Room:** Enter a unique room name. If it exists, you'll join; if not, you'll create it.
3.  **Recent Rooms:** Use the sidebar to quickly hop back into your frequent hangouts.
4.  **Clear History:** Wipe your local room list at any time with the "Clear" button.

---


## Voice and video setup

Follow [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) and run [SUPABASE_CALLS_SETUP.sql](./SUPABASE_CALLS_SETUP.sql) to enable calling. Supabase handles authentication, call invitations, and signalling; WebRTC carries the actual live media. TURN relay configuration may be needed on restrictive networks.
