# For Gia

A peaceful fidget playground — soft light, gentle motion, all the colors of hope.

**Live at:** https://gia-fidget-website.netlify.app

Tap any glow at the bottom to add a new companion. Drag the title bar to move it.
Tap a glow to bloom, drift, ripple, or pop. Close with the **×**.

## Design notes

This is a *soothing* site, not an arcade. Every visual choice is grounded in
calming psychology:

- **Hope palette.** Dawn pastels — peach, lavender, mint, sky. Rainbow appears
  only as a soft accent, capped at 70% HSL saturation. No pure red, no pure black.
- **Breath rhythm.** Every autonomous animation cycles on a 6–8 s period with
  `sine.inOut` easing. No bouncy, elastic, or back easings — they read as
  jump-scares.
- **Zero fail states.** Every tap is rewarded softly. Closing is always a soft
  fade. Nothing snaps, nothing yells.
- **Mobile-first.** The site works equally on phone (375 px) and desktop
  (1440 px+) with the same components. Pointer Events unify touch, mouse, and pen.
- **Performance.** DPR is capped at 1.5, RAF pauses when a card is offscreen or
  the tab is hidden, and `prefers-reduced-motion` makes everything quieter.

## Run locally

The site is pure static files — no build step, no Node dependencies at runtime.

```bash
# From the repo root
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or with Node:

```bash
npx http-server -p 8000
```

You can also open `index.html` directly with `file://` in any modern browser.

## Deploy to Netlify

The Netlify CLI is configured for static deploys via `netlify.toml`. The site
needs **no** build command and **no** environment variables.

```bash
# 1. One-time: log in (opens browser for OAuth)
netlify login

# 2. Initialize the site (links this folder to a Netlify project)
netlify init
# → choose "Create & configure a new site"
# → team: your team
# → site name: gia-fidget (or whatever you like)
# → build command: <empty> (we have no build step)
# → publish directory: .

# 3. Deploy to production
netlify deploy --prod
```

The deploy returns a live URL like `https://gia-fidget.netlify.app`.

### Future deploys

After the first deploy, every subsequent push to the linked branch can be done
with:

```bash
netlify deploy --prod
```

Or wire up continuous deployment by pushing the repo to GitHub and connecting
the repo in the Netlify dashboard.

## Project layout

```
.
├── index.html              Landing page
├── styles.css              Calm-by-default styling
├── main.js                 Bootstrap: ambient + chip tray + cards
├── netlify.toml            Static deploy config
├── ambient/
│   └── background.js       Full-viewport FBM noise-warped fluid gradient
├── effects/
│   ├── fluid-goo.js        MiMo-inspired metaball blob
│   ├── soap-bubble.js      Iridescent thin-film sphere
│   ├── petal-drift.js      tsparticles slow-falling petals
│   ├── aurora-ribbon.js    WebGL ribbon with traveling waves
│   ├── galaxy.js           1500-particle galaxy, drag-to-spin
│   └── glow-ripple.js      Tap-to-spawn soft rainbow ripples
└── lib/
    ├── palette.js          Hope palette + rainbow accent (≤70% sat)
    ├── easing.js           Breath-rhythm easings
    ├── dpr.js              Pixel ratio with `?dpr=2` override
    ├── reduced-motion.js   prefers-reduced-motion helper
    ├── visibility.js       RAF gating (IntersectionObserver + visibility)
    └── draggable.js        Pointer-Events draggable wrapper
```

## Auto-deploy

Every push to `master` automatically deploys to Netlify via a `post-push` git hook in `.git/hooks/post-push`. The hook reads `~/.netlifyrc` (mode 0600) for the auth token + site ID.

To disable auto-deploy for a single push, use `git push --no-verify` (no — that bypasses other hooks) or temporarily rename the hook:
```bash
mv .git/hooks/post-push .git/hooks/post-push.disabled
```

Last verified deploy: see git log for the most recent master commit.

## Credits

Made for Gia, from Dad. With love, soft light, and a long, slow exhale.
