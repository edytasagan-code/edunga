export type ImageFileData = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

const IMAGE_MIME_PREFIX = "image/";

export function isImageFile(file: File): boolean {
  return file.type.startsWith(IMAGE_MIME_PREFIX);
}

export function readImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      reject(new Error("Nie udało się odczytać wymiarów obrazu."));
    };

    image.src = src;
  });
}

export function scaleImageDimensions(
  width: number,
  height: number,
  maxWidth = 480
): { width: number; height: number } {
  if (width <= maxWidth) {
    return { width, height };
  }

  const scale = maxWidth / width;

  return {
    width: maxWidth,
    height: Math.round(height * scale),
  };
}

export async function readImageFileAsDataUrl(
  file: File
): Promise<ImageFileData> {
  if (!isImageFile(file)) {
    throw new Error("Wybrany plik nie jest obrazem.");
  }

  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nie udało się odczytać pliku obrazu."));
    };

    reader.onerror = () => {
      reject(new Error("Nie udało się odczytać pliku obrazu."));
    };

    reader.readAsDataURL(file);
  });

  const natural = await readImageDimensions(src);
  const scaled = scaleImageDimensions(
    natural.width,
    natural.height
  );

  return {
    src,
    width: scaled.width,
    height: scaled.height,
    alt: file.name.replace(/\.[^.]+$/, ""),
  };
}

export function extractClipboardImageFile(
  dataTransfer: DataTransfer
): File | null {
  const items = Array.from(dataTransfer.items ?? []);

  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith(IMAGE_MIME_PREFIX)) {
      const file = item.getAsFile();

      if (file) {
        return file;
      }
    }
  }

  const files = Array.from(dataTransfer.files ?? []);

  for (const file of files) {
    if (isImageFile(file)) {
      return file;
    }
  }

  return null;
}
