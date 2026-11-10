# McCrack Chat — Supabase account setup

The website includes account sign-up/sign-in, password reset, profile syncing, a Friends interface, private direct messages, presence, notifications, richer profiles, and private attachments. You must run the SQL setup before cloud profiles and friend requests will work.

## One-time Supabase setup

1. Open your project at https://supabase.com/dashboard.
2. Select **SQL Editor → New query**.
3. Open [SUPABASE_AUTH_SETUP.sql](./SUPABASE_AUTH_SETUP.sql) in this repository.
4. Copy the **entire file**, paste it into the SQL Editor, and click **Run**.
5. Confirm the **Table Editor** contains `profiles`, `user_preferences`, `friend_requests`, `private_conversations`, and `dm_messages`.
6. Confirm **Storage → Buckets** contains `mcchat-user-media` and the private `mcchat-private-files` bucket.
7. Under **Authentication → URL Configuration**, set **Site URL** to the actual deployed McCrack Chat URL. Add that exact URL as an allowed redirect URL too.
8. Under **Authentication → Providers → Email**, leave Email enabled. Email confirmation is currently disabled in your existing configuration, so new accounts may sign in immediately. Consider enabling confirmation before sharing the app widely.

## Test it

1. Open the deployed chat and click your profile in the lower-left.
2. Choose **Create account / Sign in** and create a test account with an email you can access and a strong, unique password.
3. After signing in, edit your display name/photo and change a setting.
4. Open the site in another browser/device and sign in with that same account. The profile, settings, contact labels, and recent room list should load from Supabase.
5. Open the **Friends** icon, search the other account's exact username, send a request, then sign in as that other account and accept it.

## New messaging features\n\n- Open **Friends** and use **Message** beside an accepted friend to start a private conversation. Private messages are stored separately from public rooms and protected by participant-based row-level security.\n- Presence and last-seen are approximate browser-session indicators; closing a tab or losing connectivity can delay the offline state.\n- Profile banner and bio fields sync to the account. In-app notifications work while the site is open; browser notifications require permission and browser support.\n- Private file attachments are stored in the private `mcchat-private-files` bucket. Download access is restricted to the conversation participants.\n- Re-run the full SQL file after this update. It is designed to be safe to run again and adds the new tables/columns/policies.\n\n## Important notes

- The existing public/anon key remains in the browser, which is expected for Supabase's client-side SDK. Never put a service-role/secret key in the website.
- Profile photos and custom wallpaper files are stored in the public `mcchat-user-media` bucket. Anyone who has a public media URL can view that image; do not upload anything private.
- Existing chat rooms and messages are not changed by this SQL.
- Friend requests are supported by this first version. A friend list does not automatically create private conversations; messaging friends privately is a separate feature to build.
- Existing room chat itself still uses its current room/username model. Accounts and friend requests do not yet enforce that every chat message belongs to an authenticated user.
- If the website is hosted at more than one URL, add each exact URL used for sign-in/password recovery to Supabase's Redirect URLs.


## Voice and video calls

The DM header now has separate **voice call** and **video call** buttons. Calls are one-to-one and require both people to have signed in, accepted the friend request, and opened the private conversation.

1. Open SUPABASE_CALLS_SETUP.sql in this repository.
2. In Supabase, open **SQL Editor → New query**, paste the entire file, and click **Run**.
3. Open **Database → Publications → supabase_realtime** and enable public.call_sessions and public.call_signals.
4. Make sure the browser site is served over HTTPS (GitHub Pages already uses HTTPS).
5. Open a DM with a friend and test a voice call, then a video call. Allow microphone/camera permissions when prompted.

### How calling works

- Supabase Auth identifies the caller and recipient.
- Supabase Postgres stores call invitations and protects call signalling with row-level security.
- Supabase Realtime delivers signalling changes, with a polling fallback.
- WebRTC carries live audio/video directly between the two browsers. Supabase does **not** receive or store the media stream.
- The browser asks for microphone permission for voice calls and microphone + camera permission for video calls.

### Network compatibility

The client currently uses public STUN servers for direct connection discovery. Some school, work, mobile, or restrictive networks require a TURN relay. Supabase does not provide a TURN media relay as part of Realtime. If calls fail to connect across certain networks, configure a TURN provider and add its short-lived credentials in calls.js under ICE_SERVERS. Never put a permanent service secret in the public website.

Calls are currently one-to-one. Group calls would need a media server/SFU rather than simply adding more peer connections. The browser must remain open for incoming calls; background push/ringing when the site is fully closed is not included in this first implementation.
