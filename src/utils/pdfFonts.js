import notoSansBengaliBoldUrl from "../assets/fonts/NotoSansBengali-Bold.ttf?url";
import notoSansBengaliRegularUrl from "../assets/fonts/NotoSansBengali-Regular.ttf?url";

export const PDF_BENGALI_FONT = "NotoSansBengali";

let bengaliFontPromise = null;

const fontToBase64 = async (url) => {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok || contentType.includes("text/html")) {
    throw new Error(`Failed to load PDF font: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

export const registerBengaliPdfFont = async (doc) => {
  if (!bengaliFontPromise) {
    bengaliFontPromise = Promise.all([
      fontToBase64(notoSansBengaliRegularUrl),
      fontToBase64(notoSansBengaliBoldUrl),
    ]);
  }

  const [regularFont, boldFont] = await bengaliFontPromise;

  doc.addFileToVFS("NotoSansBengali-Regular.ttf", regularFont);
  doc.addFont("NotoSansBengali-Regular.ttf", PDF_BENGALI_FONT, "normal");
  doc.addFileToVFS("NotoSansBengali-Bold.ttf", boldFont);
  doc.addFont("NotoSansBengali-Bold.ttf", PDF_BENGALI_FONT, "bold");
  doc.setFont(PDF_BENGALI_FONT, "normal");
};
