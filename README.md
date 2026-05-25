# SoundSpace

SoundSpace is a browser-based, AI-assisted digital audio workstation for sketching ideas, arranging tracks, editing MIDI, recording audio, and saving projects to Firebase.

## Production Checklist

- Use Node.js 20 or newer.
- Install with `pnpm install`.
- Copy `.env.example` to `.env` and set `VITE_GEMINI_API_KEY` for AI features.
- Restrict the Gemini API key to the deployed domain before publishing.
- Configure Firebase Authentication, Firestore, and the rules in `firestore.rules`.
- Build with `pnpm run build`; this runs TypeScript first and then creates `dist/`.

## Scripts

```bash
pnpm run dev
pnpm run typecheck
pnpm run build
pnpm run preview
```

## Environment

`VITE_GEMINI_API_KEY` enables client-side Gemini features such as chord generation, track balancing, and mastering suggestions. Because Vite exposes `VITE_*` variables to the browser bundle, use a domain-restricted key for public deploys. `GEMINI_API_KEY` is also accepted for AI Studio compatibility.

`APP_URL` can be set by the hosting platform when a deployed URL is needed for callbacks or self-referential links.

## Firebase

The app uses Firebase Auth for Google sign-in and Firestore for project persistence. The included Firestore rules deny all documents by default and allow users to access only projects where `authorId` matches their authenticated user ID.

Deploy the rules before opening the app to public users:

```bash
firebase deploy --only firestore:rules
```

## Deploy

The production bundle is written to `dist/`:

```bash
pnpm run build
```

Any static host that supports single-page apps can serve the generated directory.
