# Tagalog Trainer

A static Tagalog ↔ English practice app. Plain HTML/CSS/JS — no build step, no dependencies. Deployable to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

## Features

- **Word of the Day** — a Tagalog word, its English translation, and an example sentence. Picked deterministically from the date, so it stays the same all day and rotates at midnight.
- **Category tiles** — each tile drills a category of sentences. Click a tile → random Tagalog sentence → **Translate** reveals the English → **Next sentence** repeats. A **Home** button returns to the main page.

## Running locally

Browsers block `fetch()` of local JSON when `index.html` is opened directly from disk (`file://`). Serve the folder instead:

- **VS Code**: install the *Live Server* extension, right-click `index.html` → "Open with Live Server", or
- **Terminal**: `npx serve` (Node) or `python -m http.server` from this folder.

Once deployed to a static host it works with no extra setup.

## Data files

All content lives in `data/`:

| File | Purpose |
|---|---|
| `categories.json` | Manifest of tiles shown on the home page |
| `words.json` | Word-of-the-day pool (word + translation + example sentence) |
| `sentences-root-verbs.json` | Sentences built on common Tagalog verb roots |
| `sentences-adjectives.json` | Sentences using common Tagalog adjectives |

### Adding a new category

1. Create `data/sentences-<your-category>.json`:

```json
{
  "category": "My Category",
  "description": "Optional description.",
  "sentences": [
    { "tagalog": "…", "english": "…", "focus": "optional focus word" }
  ]
}
```

2. Add one entry to `data/categories.json`:

```json
{
  "id": "my-category",
  "title": "My Category",
  "description": "Shown on the tile.",
  "file": "data/sentences-my-category.json"
}
```

That's it — the tile appears automatically. No code changes needed.

### Adding words or sentences

Append entries to the relevant JSON array, keeping the existing one-line-per-entry format. The `focus` field records the root verb / adjective the sentence is built around (not displayed yet, but available for future features like highlighting).
