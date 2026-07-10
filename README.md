# boop!

A no-signup, fire-and-forget stream of tiny internet creatures. Open the URL, scroll photos, GIFs, and videos, gently boop a creature, or add your own media privately.

## What it does

- Infinite animal feed with cats, dogs, foxes, rabbits, and other creatures
- Pulls public media from Dog CEO, Cat as a Service, RandomFox, Wikimedia Commons, and credited fallback photography
- Opens images, GIFs, and videos in a simple full-screen viewer
- Stores personal uploads only in the browser's IndexedDB on that device
- Has no accounts, profiles, comments, follower counts, or engagement scores
- Supports mobile, keyboard navigation, reduced motion, and system dark mode
- Includes an automatic GitHub Pages deployment workflow

## Run locally

```sh
npm install
npm run dev
```

## Verify

```sh
npm run typecheck
npm test
npm run build
```

## Publish with GitHub Pages

1. Push this project to a GitHub repository using `main` as the default branch.
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main` or run the **Deploy boop to GitHub Pages** workflow manually.

The Vite build uses relative asset paths, so it works both on a GitHub user site and inside a repository subpath.

## Media and privacy notes

Public feed items stay linked to their original source pages. Availability and licensing are controlled by those sources. Personal uploads are written directly to the visitor's local browser database; the app has no upload server and does not send those files anywhere.
