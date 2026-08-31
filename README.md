# webpc

A fast, browser-based image converter that turns PNG, JPEG, GIF, BMP, WebP, and AVIF files into WebP format — powered by Bun.

## Features

- **Select files or folders** via file picker
- **Bulk conversion** — convert multiple images at once, downloaded as a ZIP archive
- **Single file download** — get an individual `.webp` file
- **Adjustable quality** — control output quality with a slider
- **Live previews** — see image dimensions and metadata before converting
- **Keyboard shortcuts** — arrow keys to navigate images, Escape to clear the queue
- **Folder upload** — select a whole folder of images

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
docker run -p 4000:4000 webpc
```

Override defaults with `-e`:

```bash
docker run -p 4000:4000 -e HOSTNAME=127.0.0.1 -e MAX_BODY_SIZE=104857600 webpc
```

Or with a `.env` file:

```bash
docker run --env-file .env -p 4000:4000 webpc
```

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Server port |
| `HOSTNAME` | `0.0.0.0` | Bind address |
| `MAX_BODY_SIZE` | `524288000` (500 MB) | Max request body size in bytes |

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
