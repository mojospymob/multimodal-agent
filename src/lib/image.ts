// 前端图片处理：用 canvas 等比缩放 + 压缩成 JPEG，减少视觉 API 的 token 消耗。
// 对应 Python 示例中的 optimize_image_for_api，但放在浏览器端做，避免服务端装 sharp 原生依赖。

export interface CompressedImage {
  /** 压缩后的 data URL */
  dataUrl: string;
  mediaType: string;
  filename: string;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxSize = 1024,
  quality = 0.85,
): Promise<CompressedImage> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const maxDim = Math.max(width, height);
  if (maxDim > maxSize) {
    const ratio = maxSize / maxDim;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 canvas 上下文");
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL("image/jpeg", quality);
  return {
    dataUrl: out,
    mediaType: "image/jpeg",
    filename: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    width,
    height,
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}
