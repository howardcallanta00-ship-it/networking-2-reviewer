# CCNA 2 Reviewer

An unofficial study tool for **CCNA 2 v7 – Switching, Routing and Wireless Essentials (SRWE)**, Modules 1–16. It's a plain static site with no build step and no backend.

**Source.** Questions, answer choices and original explanations come from ITExamAnswers.net's CCNA 2 v7 exam-answer pages. Question text is kept as published. Explanations were rewritten for clarity, and the original is shown behind a toggle on every question. This project isn't affiliated with Cisco or ITExamAnswers.net.

## Features

- **Practice**: one question at a time, instant feedback, a clear explanation and a "why the others are wrong" list.
- **Exam simulation**: timer, no feedback until you submit, then a score and a breakdown by module group.
- **Flashcards**: flip the card, then mark it "knew it" or "missed it".
- **Review missed**: questions you got wrong come back until you answer them right twice.
- **Browse**: search every question with its answer.
- **Progress**: daily goal, streak, milestones, accuracy per module, and export/import.
- **Keyboard shortcuts**: `1`–`6` pick an option, `Enter` checks or moves to the next question, `←` `→` navigate, `E` shows or hides the explanation, `F` flags the question.
- Light and dark themes. Works on phones.

Progress is stored in the browser's `localStorage` and never leaves your device.

## Project layout

```
site/                 <- the deployed static site (publish directory)
  index.html
  app.js
  styles.css
  data/questions.json <- generated question bank
  data/explain/*.json <- rewritten explanations, one file per module group
  img/                <- exhibit images extracted from the saved pages
tools/
  mhtml.mjs           <- MHTML (Chrome "save as single file") reader
  parse.mjs           <- builds site/data/questions.json + site/img/
  parse-report.txt    <- questions the parser flagged for a manual check
render.yaml           <- Render Blueprint (free static site)
```

## Rebuild the question bank

You need Node 18 or newer and the five saved MHTML pages.

```
npm install
node tools/parse.mjs "path/to/CCNA 2 v7 Modules 1 - 4 ... .mhtml" "path/to/...Modules 5 - 6....mhtml" ...
```

The parser merges in the explanations from `site/data/explain/`. Exhibit images that the saved pages referenced but did not embed are read from `tools/fetched-img/` (a local download cache, not committed); the extracted copies are already in `site/img/`.

## Run locally

```
npx http-server site -p 5173
```

Then open http://localhost:5173.

## Deploy on Render (free)

1. Render dashboard → **New** → **Static Site** → connect this GitHub repo.
2. **Build command:** leave it empty.
3. **Publish directory:** `site`.
4. **Create Static Site**. Render redeploys automatically on every push to `main`.

(Or use **New → Blueprint**, which reads `render.yaml`.)
