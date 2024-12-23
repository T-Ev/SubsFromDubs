# SubsFromDubs

Live Multi-language Subtitle Generation and Display Through Arbitrary Number of Devices.

# Problem

At my church we distribute thousands of pounds of donated food each week to families in need in NH. We usually preceed this with an encouraging message or devotional while the folks wait in our warm building for their turn to "shop" our free selection. Recently we have seen a huge influx of refugees and immigrants who don't speak english. Specifically the main languages are Ukrainian and Spanish with a touch of French. We wanted to be able to offer real time translation to these folks.

After some research, existing transcription and translation services only go one language to one language and are only accessible on a single host device. Ideally, our system would take the generated translation and we could project it on a wall or better yet have it show up on the people's phones (they all have smartphones).

# Solution

Subs From Dubs is a real-time open source transcription and translation app that creates shared rooms where anyone can access multi-language subtitles via link or QR code.

The transcription and translation all happens locally in browser using open source models, so use of the app is free and doesn't require any accounts with AI providers.

One device acts as the "Master" and does all the heavy lifting audio capture and AI processing. Then the project uses websockets to sync the translation across any other devices in the room in real-time.

[Demo](https://subsfromdubs.glitch.me)

# Usage

### Local

1. Clone repo
2. `npm start`
3. navigate to `localhost:3000`

### Deploy on Glitch.com

1. [Open Project in Glitch](https://glitch.com/edit/#!/subsfromdubs)
2. Click `Remix` in the upper right

# Notes

- For performance reasons, I decided to use distilled whisper models to decrease load time and increase inferences speed
- Using distil-medium.en provided the fastest real-time performance for some reason in my tests. It was faster than distil-small.en
- Transcription and translation uses 5s audio chunks for processing
- Recommend 3060 or better GPU for real-time effect

# Roadmap

- Add option to use OpenAI whisper endpoint to reduce client side compute
- Add mobile detection and automatically prompt for offloading Whisper to API or scale down model
- Add dynamic language selection + more supported languages
