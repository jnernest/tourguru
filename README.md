# TourGuide

A GPS-aware tour guide for your phone. As you walk, it finds places around you on Wikipedia
and Wikidata and tells you about them out loud, in your language, the way a guide would:

> "On your right is Schönbrunn Palace, a palace in Vienna, Austria. Built in 1638. Designed by
> Johann Bernhard Fischer von Erlach and Nicolò Pacassi. Its style is Baroque. Heritage status:
> part of UNESCO World Heritage Site. The 1,441-room Baroque palace is one of the most important
> architectural, cultural, and historic monuments in the country."

## Features

- **Speaks up on its own** when you pass something (60 m, 120 m if ahead, 200 m when standing
  still), points it out by direction ("on your left", "just ahead", "you've just passed"), never
  repeats a place, and waits between narrations. "What's around me?" and tap-to-hear for the rest.
- **Key points, not read-outs:** what the place is and its main facts (built, architect, style,
  UNESCO status, height, named after) from Wikidata, plus one highlight sentence from the article.
- **Local + your language:** places come from your language's Wikipedia *and* the local one
  (e.g. German in Vienna), merged; narration is always in your language.
- **Works offline / without AI:** extractive summarizer and Google ML Kit on-device translation
  (Android). Optional **AI narration with Claude** when a key is configured.
- **Simulated walk** through Munich's old town, for testing at a desk.
- **Diagnostic log** shareable from the app, for debugging on a phone without a cable.
- Languages: English, Deutsch, Français, Español, Italiano, हिन्दी.

## Run it

```bash
npm install
npm start            # Expo dev server (web: npm run web)
npm run check        # typecheck + lint + Vitest
npm run e2e:web      # real-browser test (local Chrome) with a simulated walk
```

Android APK (Expo EAS cloud build, Android only for on-device translation):

```bash
npm run eas:login
npm run apk                              # prints a download link / QR code
```

AI stories come from a small server on EAS Hosting (`src/app/api/narrate+api.ts`), so the Gemini
key never ships in the app:

```bash
npm run proxy:set-key       # uploads LLM_API_KEY from .env.local to EAS (sensitive, server-only)
npm run proxy:deploy        # exports the server build, checks it has no key, deploys to tour-guide.expo.app
npm run apk:set-proxy-url   # tells app builds/updates to use EXPO_PUBLIC_LLM_PROXY_URL
```

After that, ship app-code changes over the air (no new APK; the app picks them up on its
next start or two):

```bash
npm run update                  # message = latest git commit subject
npm run update "what changed"   # or your own message (no `--` needed, works in PowerShell)
```

A new APK is only needed when native parts change (native modules, `app.json` plugins or
Android settings). The `fingerprint` runtime version makes sure an update is never delivered
to an APK it is incompatible with.

Expo Go works for the core (no on-device translation, which needs the native module in
`modules/mlkit-translate`).

## How it works

```
GPS fix ─► GuideController ─► Wikipedia geosearch, user language + local language (re-queried every 150 m)
                │                 └► rankPois: proximity · article richness · "ahead" bonus
                ├► selectCandidate + StabilityGate (2 consistent fixes) + cooldown
                └► NarrationEngine
                     ├ ClaudeEngine (optional)   ─┐ falls back to
                     └ ExtractiveEngine          ◄┘ Wikidata facts · summarizer · ML Kit translation
                          └► Speaker (expo-speech)
```

Native APIs (`expo-location`, `expo-speech`, `expo-sqlite`, ML Kit) sit behind interfaces, so the
core logic is tested in Node with Vitest.

## Data and licensing

- Text from **Wikipedia**, **CC BY-SA 4.0**: the app attributes and links every article it uses.
  Derived narrations must carry the same attribution and stay share-alike.
- Facts from **Wikidata**, **CC0**.
- Wikimedia requests send a descriptive User-Agent (`src/config.ts`). **Set a real contact
  address before any public release.**
- Location stays on the device except for coordinates sent to Wikipedia to find nearby articles.
- With AI narration, the API key is embedded in the app bundle: personal use only. A public
  release needs a backend proxy.
