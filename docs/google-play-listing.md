# Google Play — listing and forms (draft)

Copy into Play Console. Limits: app name 30 chars, short description 80, full description 4000.

## App name (≤ 30)

`Walk Guide – Audio Tour` _(or the final brand name; must match `expo.name`)_

## Short description (≤ 80)

`Your free audio tour guide: stories, history and fun facts about places nearby.`

## Full description

```
Walk anywhere and let the guide talk.

Walk Guide uses your location to find interesting places around you and tells you about them
out loud, in your language, like a personal tour guide:

• Speaks up on its own as you walk past a sight, and tells you where to look:
  "On your left is…", "Just ahead you can see…".
• Real history and fun facts: when it was built, by whom, the turning points, the legends.
  Tap "Tell me more" for the full story.
• Works almost everywhere, not only in big tourist cities: places come from Wikipedia and
  Wikidata in your language and the local language, merged.
• Six languages: English, Deutsch, Français, Español, Italiano, हिन्दी.
• Suggest a walk: a short route past the best sights nearby, with walking directions.
• Photos of every place, a list of what is around you, and discovery badges as you explore.
• Works without an internet connection for translation, with Google's on-device translation.

No account, no ads, no tracking.

Place information from Wikipedia (CC BY-SA 4.0) and Wikidata (CC0); photos from Wikimedia
Commons. Walk Guide is not affiliated with the Wikimedia Foundation.
```

## Category and tags

- Category: **Travel & Local**
- Contact email: _(required — same as in the privacy policy)_
- Privacy policy URL: `https://github.com/jnernest/tourguru/blob/main/docs/privacy-policy.md`
  _(the repository must be public; GitHub Pages gives a nicer URL)_

## Graphics needed

- App icon 512 × 512 PNG _(the current icon is Expo's default — replace before publishing)_
- Feature graphic 1024 × 500
- At least 2 phone screenshots (e.g. now-playing card with photo, suggested walk)

## Content rating questionnaire

No violence, sexual content, profanity, drugs, gambling or user-generated content; shares
location with third parties (Wikimedia) for app functionality. Expected rating: **Everyone /
PEGI 3**.

## Target audience

13+ (not designed for children).

## Data safety form (draft — check against Play's current definitions)

| Data type | Collected? | Shared? | Why | Notes |
|---|---|---|---|---|
| Location → **Precise location** | Yes (sent off device) | Yes — Wikimedia (Wikipedia/Wikidata) | App functionality | Not stored by the developer; processed ephemerally; required for the app to work |
| App activity, personal info, contacts, photos, messages, files, health, financial, device IDs | No | No | — | — |
| Diagnostics | No | No | — | The log is only sent when the user shares it themselves |

- Is data encrypted in transit? **Yes** (all requests use HTTPS).
- Can users request data deletion? **No data is kept by the developer**; on-device history can be
  deleted with "Reset history".
- If AI narration is enabled: article text and an approximate relative position are sent to
  Google (Gemini API) — **declare "App activity → Other actions" or reassess**, and mention
  Gemini in the privacy policy (already done).

## Permissions declaration

- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`: foreground only, core functionality
  (finding nearby places). No background location.

## Release steps

1. Play Console → **Create app** (package name `com.walkguide.app` — permanent!).
2. Upload the Google service account key to expo.dev (Credentials → Android → Service credentials).
3. `npm run store:build` → `npm run store:submit` (uploads to **Internal testing** as a draft).
4. Fill in listing, content rating, target audience, data safety, privacy policy URL.
5. New personal developer accounts: run a **closed test with ≥ 12 testers for 14 days**, then
   apply for production access.
