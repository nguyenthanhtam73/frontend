/** Max long edge for onboarding face photos — enough detail for skin cues, much smaller than camera originals. */
export const ONBOARDING_PHOTO_MAX_EDGE = 1280;

/** JPEG quality — high enough for pore/redness cues, smaller payload for upload + vision API. */
export const ONBOARDING_PHOTO_JPEG_QUALITY = 0.88;

const SKIP_IF_JPEG_UNDER_BYTES = 500_000;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode image"));
    };
    img.src = url;
  });
}

function scaledDimensions(width: number, height: number, maxEdge: number) {
  const long = Math.max(width, height);
  if (long <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

/** Resize/compress a face photo before onboarding upload. Falls back to the original file on failure. */
export async function compressOnboardingPhoto(
  file: File,
): Promise<{ file: File; preview: string }> {
  if (!file.type.startsWith("image/")) {
    return { file, preview: URL.createObjectURL(file) };
  }

  if (
    file.type === "image/jpeg" &&
    file.size <= SKIP_IF_JPEG_UNDER_BYTES
  ) {
    try {
      const img = await loadImageFromFile(file);
      const long = Math.max(img.naturalWidth, img.naturalHeight);
      if (long <= ONBOARDING_PHOTO_MAX_EDGE) {
        return { file, preview: URL.createObjectURL(file) };
      }
    } catch {
      /* fall through to full compress path */
    }
  }

  try {
    const img = await loadImageFromFile(file);
    const { width, height } = scaledDimensions(
      img.naturalWidth,
      img.naturalHeight,
      ONBOARDING_PHOTO_MAX_EDGE,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { file, preview: URL.createObjectURL(file) };
    }
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToJpegBlob(canvas, ONBOARDING_PHOTO_JPEG_QUALITY);
    if (!blob) {
      return { file, preview: URL.createObjectURL(file) };
    }

    const base = file.name.replace(/\.[^.]+$/u, "") || "onboarding";
    const compressed = new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    return { file: compressed, preview: URL.createObjectURL(compressed) };
  } catch {
    return { file, preview: URL.createObjectURL(file) };
  }
}

/** Add up to `remaining` compressed photos to onboarding state. */
export async function appendOnboardingPhotos(
  files: File[],
  remaining: number,
  addPhoto: (item: { file: File; preview: string }) => void,
): Promise<void> {
  const picked = files.filter((f) => f.type.startsWith("image/")).slice(0, remaining);
  for (const file of picked) {
    const item = await compressOnboardingPhoto(file);
    addPhoto(item);
  }
}
