export const DEFAULT_COMPANY_NAME = "KAFELA MART";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const buildAssetUrl = (filePath) => {
  const normalizedPath = String(filePath || "")
    .trim()
    .replace(/\\/g, "/");

  if (!normalizedPath) return "";
  if (/^https?:\/\//i.test(normalizedPath)) return encodeURI(normalizedPath);

  const safeBaseUrl = API_BASE_URL.trim().replace(/\/+$/, "");
  const safePath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;

  return encodeURI(`${safeBaseUrl}${safePath}`);
};

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const loadLogoForPdf = async (logoUrl) => {
  if (!logoUrl) return null;

  const response = await fetch(logoUrl);
  if (!response.ok) return null;

  const sourceDataUrl = await readBlobAsDataUrl(await response.blob());
  const image = await loadImage(sourceDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
};

export const drawPdfBranding = async ({
  pdf,
  logoUrl,
  companyName = DEFAULT_COMPANY_NAME,
  x,
  y,
  maxWidth = 44,
  maxHeight = 14,
  textSize = 21,
  subtitle = "",
  subtitleY,
  subtitleSize = 9,
}) => {
  try {
    const logo = await loadLogoForPdf(logoUrl);
    if (logo?.dataUrl && logo.width && logo.height) {
      const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
      const width = logo.width * scale;
      const height = logo.height * scale;
      pdf.addImage(logo.dataUrl, "PNG", x, y - height + 3, width, height);

      if (subtitle) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(subtitleSize);
        pdf.setTextColor(75, 85, 99);
        pdf.text(subtitle, x, subtitleY);
      }
      return;
    }
  } catch (error) {
    console.warn("PDF logo render failed:", error);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(textSize);
  pdf.text(companyName, x, y);

  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(subtitleSize);
    pdf.setTextColor(75, 85, 99);
    pdf.text(subtitle, x, subtitleY);
  }
};

export const drawPdfBrandBlock = async ({
  pdf,
  logoUrl,
  companyName = DEFAULT_COMPANY_NAME,
  x,
  topY,
  logoMaxWidth = 56,
  logoMaxHeight = 18,
  companySize = 10,
  subtitle = "",
  subtitleSize = 7.5,
}) => {
  let textY = topY;

  try {
    const logo = await loadLogoForPdf(logoUrl);
    if (logo?.dataUrl && logo.width && logo.height) {
      const scale = Math.min(
        logoMaxWidth / logo.width,
        logoMaxHeight / logo.height,
      );
      const width = logo.width * scale;
      const height = logo.height * scale;
      pdf.addImage(logo.dataUrl, "PNG", x, topY, width, height);
      textY = topY + height + 4;
    }
  } catch (error) {
    console.warn("PDF logo render failed:", error);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(companySize);
  pdf.text(companyName, x, textY);

  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(subtitleSize);
    pdf.text(subtitle, x, textY + 5);
  }
};
