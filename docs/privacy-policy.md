# Privacy Policy — TourGuide

_Last updated: 2026-10-24_

TourGuide ("the app") is a walking tour guide: it uses your location to find places near you
and tells you about them. This policy explains what data the app uses and where it goes.

**In short:** there are no accounts, no ads, no analytics and no tracking. The only server the
developer runs relays AI narration requests to Google and stores nothing. To work, the app sends
limited data to the services listed below.

## Location

- The app uses your device's **precise location** during a walk, to find nearby places and to
  tell you whether a place is ahead, left or right of you. Only if you turn on **"Keep guiding
  with the screen off"** does it also use location in the background; Android then shows a
  notification for as long as the walk runs, and stopping the walk ends it.
- Your **coordinates are sent to Wikipedia and Wikidata** (operated by the Wikimedia
  Foundation) to look up nearby articles and facts. See the
  [Wikimedia privacy policy](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy).
- Your coordinates are also sent to public **OpenStreetMap Overpass servers** to find opening
  hours and extra places, and the **map** loads tiles for the area you look at from
  **OpenFreeMap**.
- To pick the local language, the app asks your **phone's built-in geocoder** (on Android
  provided by Google) for the country you are in.
- Location is not stored by the app beyond the current walk, and is never sent to the developer.

## AI narration (when enabled)

- If AI narration is on, the app sends the **text of the Wikipedia article** about a place, the
  place's name, your chosen language, an approximate position such as "about 60 metres on your
  left" and, when you ask one, **your question** to the TourGuide server, which passes it to
  **Google's Gemini API** to write the narration. **Your coordinates are not sent.**
- The TourGuide server runs on **Expo's EAS Hosting**. Its code stores nothing except
  short-lived counters per IP address that limit how often it can be called; the hosting
  platform may keep standard request logs. See the
  [Gemini API terms](https://ai.google.dev/gemini-api/terms) and
  [Expo's privacy policy](https://expo.dev/privacy).

## On your device only

- **Places you have heard about** (their Wikidata ids) are stored on your device, so they are
  not repeated and count towards your discovery badges. "Reset history" deletes them.
- **Speech** is produced by your device's text-to-speech engine.
- **Questions by voice:** when you tap "Ask a question", the microphone is used only until you
  stop speaking. Speech is turned into text by your phone's speech recognition service (on
  Android usually Google's, which may process the audio online).
- **Quiz score, walk diary and offline areas** (places, articles and facts you downloaded) are
  stored on your device. Clearing the app's data deletes them.
- **Translation** uses Google ML Kit on the device; it downloads language models from Google
  the first time a language pair is used. The text is translated on the device.
- A **diagnostic log** (app events, errors, questions you asked, coordinates rounded to about
  100 m) is kept in
  memory only and is lost when the app closes. It leaves the device only if you tap
  "Share diagnostic log" and choose where to send it.

## Other services

- **Photos** are loaded from Wikimedia Commons.
- **Sharing** a place or a walk sends the text you see to the app you choose in the share menu.
- **"Walk there" and "Open in Google Maps"** open Google Maps with the destination; what Google
  Maps does with that is covered by Google's privacy policy.

## Children

The app is not directed at children under 13 and does not knowingly collect their data.

## Changes and contact

Changes to this policy are published at this address. Questions:
**<CONTACT EMAIL — to be filled in before publishing>**
