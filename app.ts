import { $ } from "bun";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");

const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

const TEMP_DIR = `./temp`;

interface TempFolderAddOptions {
  name: string;
  quality?: number;
}

class TempFolder {
  dir: string;
  files: string[] = [];

  constructor() {
    const uuid = Bun.randomUUIDv7();

    this.dir = `${TEMP_DIR}/${uuid}`;
  }
  async create() {
    await $`mkdir -p ${this.dir}`.quiet();
  }
  async add(file: Blob, options: TempFolderAddOptions) {
    const path = join(this.dir, `${stripExt(options.name)}.webp`);

    await new Bun.Image(file)
      .webp({ quality: options.quality ?? 100 })
      .write(path);

    console.log(`Converted ${options.name} to ${path}`);

    this.files.push(path);
  }
  async [Symbol.asyncDispose]() {
    await $`rm -rf ${this.dir}`;
  }
}

class TempArchive {
  archivePath: string;

  constructor(archivePath: string) {
    this.archivePath = archivePath;
  }
  async create(sources: string[]) {
    await $`zip -j ${this.archivePath} ${sources}`;
  }
  async [Symbol.asyncDispose]() {
    await $`rm -f ${this.archivePath}`;
  }
}

const PORT = Number(Bun.env.PORT ?? "4000");
const HOSTNAME = Bun.env.HOSTNAME ?? "127.0.0.1";
const fmtBytes = (bytes: number) => {
  const mb = Math.round(bytes / (1024 * 1024));
  return mb + "MB";
};

const MAX_BODY_SIZE = Number(Bun.env.MAX_BODY_SIZE ?? 100 * 1024 * 1024 * 5);
const MAX_BODY_SIZE_LABEL = fmtBytes(MAX_BODY_SIZE);

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
};

function contentTypeFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

const app = Bun.serve({
  routes: {
    "/convert": {
      POST: async (req) => {
        const formData = await req.formData();
        const files: File[] = [];

        const quality = Number(formData.get("quality") ?? 100);

        for (const f of formData.getAll("images")) {
          if (typeof f !== "string") files.push(f);
        }

        if (files.length === 0) {
          return new Response("No images provided", { status: 400 });
        }

        try {
          await using folder = new TempFolder();
          await folder.create();
          for (const [i, file] of files.entries()) {
            await folder.add(file, {
              name: file.name || `image-${i + 1}`,
              quality,
            });
          }

          // A single image is returned as raw WebP; multiple are zipped.
          if (files.length === 1) {
            const path = folder.files[0]!;
            const name = stripExt(files[0]?.name || "image") + ".webp";
            // Read eagerly so the temp file can be disposed after returning.
            const blob = new Blob([await Bun.file(path).arrayBuffer()], {
              type: "image/webp",
            });
            return new Response(blob, {
              headers: {
                "Content-Type": "image/webp",
                "Content-Disposition": `attachment; filename="${name}"`,
              },
            });
          }

          await using archive = new TempArchive(
            join(folder.dir, "archive.zip"),
          );
          await archive.create(folder.files);

          const blob = new Blob(
            [await Bun.file(archive.archivePath).arrayBuffer()],
            { type: "application/zip" },
          );

          return new Response(blob, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": 'attachment; filename="images.zip"',
            },
          });
        } catch (e) {
          return Response.json(
            { error: (e as Error)?.message ?? "Something went wrong" },
            { status: 500 },
          );
        }
      },
    },
  },
  async fetch(req) {
    const url = new URL(req.url);

    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(PUBLIC_DIR, path.slice(1));

    if (!filePath.startsWith(PUBLIC_DIR + "/") || !existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }

    const file = Bun.file(filePath);
    const content = await file.text();

    if (path.endsWith(".html")) {
      return new Response(
        content.replace(/__MAX_BODY_SIZE__/g, MAX_BODY_SIZE_LABEL),
        {
          headers: { "Content-Type": contentTypeFor(filePath) },
        },
      );
    }

    return new Response(file, {
      headers: { "Content-Type": contentTypeFor(filePath) },
    });
  },
  port: PORT,
  hostname: HOSTNAME,
  maxRequestBodySize: MAX_BODY_SIZE,
});

console.log(`Server running on port ${app.port}`);
