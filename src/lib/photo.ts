/** Decode and resize locally; only a small JPEG without original metadata is uploaded. */
export async function photoToJpeg(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("invalid_photo");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 384;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("invalid_photo"); }
  const size = Math.min(bitmap.width, bitmap.height);
  context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 384, 384);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
}