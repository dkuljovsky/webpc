import {
  createApp,
  ref,
  computed,
  onMounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

createApp({
  setup() {
    const fileInput = ref(null);
    const folderInput = ref(null);

    const files = ref([]);
    const activeId = ref(null);
    const quality = ref(82);
    const busy = ref(false);
    const status = ref("READY");
    const toasts = ref([]);

    const outSize = ref(0);
    const outMark = ref("—");
    const outNote = ref("QUEUED FOR SERVER CONVERSION");

    let uid = 0;
    let toastId = 0;

    const started = computed(() => files.value.length > 0);
    const activeFile = computed(
      () => files.value.find((f) => f.id === activeId.value) || null,
    );
    const queueInfo = computed(() => {
      const n = files.value.length;
      return n + " FILE" + (n === 1 ? "" : "S") + " · Q" + quality.value;
    });
    const fileIdxText = computed(() => {
      const f = activeFile.value;
      if (!f) return "— / —";
      const i = files.value.indexOf(f) + 1;
      return (
        String(i).padStart(2, "0") +
        " / " +
        String(files.value.length).padStart(2, "0")
      );
    });
    const previewMeta = computed(() => {
      const f = activeFile.value;
      if (!f) return "—";
      return f.w + " × " + f.h + " PX · SOURCE " + f.type + " · " + fmt(f.size);
    });

    function fmt(b) {
      if (b < 1024) return b + " B";
      if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
      return (b / 1048576).toFixed(2) + " MB";
    }

    function toast(msg, kind) {
      const id = ++toastId;
      toasts.value.push({ id, msg, kind, show: false });
      requestAnimationFrame(() => {
        const t = toasts.value.find((t) => t.id === id);
        if (t) t.show = true;
      });
      setTimeout(() => {
        const t = toasts.value.find((t) => t.id === id);
        if (t) t.show = false;
        setTimeout(() => {
          toasts.value = toasts.value.filter((t) => t.id !== id);
        }, 350);
      }, 3400);
    }

    const IMG_RE = /\.(png|jpe?g|gif|bmp|webp|avif)$/i;
    const isImage = (f) => f.type.startsWith("image/") || IMG_RE.test(f.name);

    // ---- decoding (previews + thumbnails) ----
    function decode(file) {
      if (window.createImageBitmap) {
        return createImageBitmap(file).catch(() => decodeViaImg(file));
      }
      return decodeViaImg(file);
    }
    function decodeViaImg(file) {
      return new Promise((res, rej) => {
        const u = URL.createObjectURL(file),
          im = new Image();
        im.onload = () => {
          URL.revokeObjectURL(u);
          res(im);
        };
        im.onerror = () => {
          URL.revokeObjectURL(u);
          rej(new Error("decode"));
        };
        im.src = u;
      });
    }
    function makeThumb(bmp) {
      const k = Math.min(1, 148 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bmp.width * k));
      c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise((res) =>
        c.toBlob((b) => res(URL.createObjectURL(b)), "image/png", 0.8),
      );
    }

    async function upload(fd) {
      const res = await fetch("/convert", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      return await res.blob();
    }

    async function addFiles(list, sourceLabel) {
      const arr = [...list];
      const imgs = arr.filter(isImage);
      const skipped = arr.length - imgs.length;
      if (skipped > 0)
        toast(
          skipped + " non-image file" + (skipped > 1 ? "s" : "") + " skipped",
          "err",
        );
      if (!imgs.length) {
        toast(
          "No images found" + (sourceLabel ? " in " + sourceLabel : ""),
          "err",
        );
        return;
      }

      busy.value = true;
      status.value = "DECODING";
      const added = [];
      for (const f of imgs) {
        try {
          const bmp = await decode(f);
          added.push({
            id: ++uid,
            file: f,
            name: f.name,
            size: f.size,
            type: (f.type.split("/")[1] || "IMG").toUpperCase(),
            w: bmp.width,
            h: bmp.height,
            bmp,
            srcUrl: URL.createObjectURL(f),
            thumbUrl: null,
          });
        } catch {
          toast(f.name + " — could not be decoded", "err");
        }
      }
      for (const f of added) f.thumbUrl = await makeThumb(f.bmp);
      busy.value = false;
      status.value = "READY";

      if (!added.length) return;
      files.value.push(...added);
      if (activeId.value === null) activeId.value = added[0].id;
      if (added.length > 1)
        toast(
          "Added " +
            added.length +
            " images" +
            (sourceLabel ? " from " + sourceLabel : ""),
        );
    }

    // ---- server conversion (preserved upload logic) ----
    async function convertAll() {
      if (!files.value.length) return;
      const fd = new FormData();

      for (const f of files.value) {
        fd.append("images", f.file);
      }

      busy.value = true;
      status.value = "UPLOADING";
      outMark.value = "…";
      outNote.value = "UPLOADING…";
      try {
        const blob = await upload(fd);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "images.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        outSize.value = blob.size;
        outMark.value = "✓";
        outNote.value =
          "RETURNED images.zip · " + files.value.length + " FILES";
        toast(
          "Converted " +
            files.value.length +
            " image" +
            (files.value.length === 1 ? "" : "s"),
        );
      } catch (err) {
        outNote.value = "CONVERT FAILED";
        outMark.value = "—";
        toast("Convert failed: " + err.message, "err");
        console.error(err);
      } finally {
        busy.value = false;
        status.value = "READY";
      }
    }

    async function downloadFile(f) {
      const fd = new FormData();
      fd.append("images", f.file, f.name);
      fd.append("quality", String(quality.value));
      busy.value = true;
      status.value = "DOWNLOADING";
      outMark.value = "…";
      outNote.value = "DOWNLOADING…";
      try {
        const blob = await upload(fd);
        const url = URL.createObjectURL(blob);
        const ext = f.name.replace(/\.[^.]+$/, "") + ".webp";
        const a = document.createElement("a");
        a.href = url;
        a.download = ext;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        outSize.value = blob.size;
        outMark.value = "✓";
        outNote.value = "SAVED " + f.name;
        toast("Saved " + f.name);
      } catch (err) {
        outNote.value = "DOWNLOAD FAILED";
        outMark.value = "—";
        toast("Download failed: " + err.message, "err");
        console.error(err);
      } finally {
        busy.value = false;
        status.value = "READY";
      }
    }

    function downloadActive() {
      const f = activeFile.value;
      if (f) downloadFile(f);
    }

    function clearAll() {
      files.value.forEach((f) => {
        if (f.srcUrl) URL.revokeObjectURL(f.srcUrl);
        if (f.thumbUrl) URL.revokeObjectURL(f.thumbUrl);
      });
      files.value = [];
      activeId.value = null;
      outSize.value = 0;
      outMark.value = "—";
      outNote.value = "QUEUED FOR SERVER CONVERSION";
      toast("Queue cleared");
    }

    // ---- input wiring ----
    function pickFiles() {
      fileInput.value && fileInput.value.click();
    }
    function pickFolder() {
      folderInput.value && folderInput.value.click();
    }
    function onFileChange(e) {
      addFiles(e.target.files);
      e.target.value = "";
    }
    function onFolderChange(e) {
      const picked = [...e.target.files];
      e.target.value = "";
      if (!picked.length) return;
      const rel = picked[0].webkitRelativePath || "";
      const folderName = rel.includes("/")
        ? rel.slice(0, rel.indexOf("/"))
        : null;
      addFiles(picked, folderName ? 'folder "' + folderName + '"' : "folder");
    }

    // ---- keyboard shortcuts (workspace) ----
    window.addEventListener("keydown", (e) => {
      if (!started.value) return;
      if (
        e.target.id === "quality" &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      )
        return;
      if (e.key === "Escape") clearAll();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i = files.value.findIndex((f) => f.id === activeId.value);
        if (i < 0) return;
        const n = files.value.length;
        const next = (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
        activeId.value = files.value[next].id;
      }
    });

    return {
      fileInput,
      folderInput,
      files,
      activeId,
      quality,
      busy,
      status,
      toasts,
      outSize,
      outMark,
      outNote,
      started,
      activeFile,
      queueInfo,
      fileIdxText,
      previewMeta,
      fmt,
      toast,
      pickFiles,
      pickFolder,
      onFileChange,
      onFolderChange,
      downloadActive,
      downloadFile,
      convertAll,
      clearAll,
    };
  },
}).mount("#app");
