# AI Next Model Wise Frontend

React + Vite frontend for model recommender app.

## What it does

- Login/logout flow
- Show user model list
- Add/remove models
- Run prompt recommendation
- Pass context details with prompt
- Show recommended model, confidence, summary
- Show history and ranking views
- Show usage stats
- Toast errors and basic UI state

## Tech

- React
- Redux Toolkit
- React Router
- React Toastify
- Bootstrap
- Vite

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Structure

- `src/App.jsx` — main app shell and routing
- `src/components/` — UI pieces
- `src/lib/api.js` — API helper
- `src/store.js` — Redux store
- `src/styles.css` — app styles

## Backend

Frontend talks to backend API in `../backend`.
