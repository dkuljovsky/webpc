# webpc

A fast, browser-based image converter that turns PNG, JPEG, GIF, BMP, WebP, and AVIF files into WebP format — powered by Bun.

## Features

- **Drop files or entire folders** directly into the browser
- **Bulk conversion** — convert multiple images at once, downloaded as a ZIP archive
- **Single file download** — get an individual `.webp` file
- **Adjustable quality** — control output quality with a slider
- **Live previews** — see image dimensions and metadata before converting
- **Keyboard shortcuts** — arrow keys to navigate images, Escape to clear the queue
- **Folder upload** — drag and drop a whole folder of images

## Tech Stack

- **[Bun](https://bun.com)** — JavaScript runtime and dev server
- **Vue 3** — Frontend UI (loaded from CDN, no build step)
- **Bun.Image API** — Server-side WebP conversion

## Getting Started

### Install dependencies

```bash
bun install
```

### Run the dev server

```bash
bun run dev
```

Then open [http://localhost:4000](http://localhost:4000) in your browser.

### Run with Docker

```bash
docker build -t webpc .
docker run -p 4000:4000 -e PORT=4000 webpc
```

## How it works

1. The browser-side Vue app lets you select images or folders and preview them
2. On conversion, files are sent to the Bun server via `POST /convert`
3. The server converts each image to WebP using `Bun.Image`
4. A single image returns the `.webp` file directly; multiple images are returned as a ZIP archive

## Project Structure

```
├── app.ts          # Bun server — routes, image conversion, static file serving
├── public/
│   └── main.js     # Vue 3 frontend — drag-and-drop, previews, conversion UI
├── Dockerfile      # Container image for deployment
└── package.json
```

## Environment

- **PORT** — Server port (default: `4000`)
- **Max upload size** — 500 MB

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
