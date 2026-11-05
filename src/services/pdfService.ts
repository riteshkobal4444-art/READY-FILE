import { PDFDocument, PageSizes } from 'pdf-lib';
import { readFileAsArrayBuffer } from '../utils/fileHelpers';

export interface ImageToPdfItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export interface ImageToPdfOptions {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  marginPt?: number; // default 20pt
  fitMode?: 'contain' | 'fit-width';
}

export interface PdfFileInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  isEncrypted: boolean;
  isValid: boolean;
  error?: string;
}

/**
 * Converts any image file to a compatible PNG or JPEG ArrayBuffer for pdf-lib
 */
async function ensureEmbeddableImage(file: File): Promise<{ buffer: ArrayBuffer; format: 'png' | 'jpeg' }> {
  const mime = file.type.toLowerCase();

  // If already clean JPEG or PNG, try reading directly
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    const buffer = await readFileAsArrayBuffer(file);
    return { buffer, format: 'jpeg' };
  }

  if (mime === 'image/png') {
    const buffer = await readFileAsArrayBuffer(file);
    return { buffer, format: 'png' };
  }

  // WebP, AVIF, BMP or others: convert to PNG via Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert image to embeddable format'));
          return;
        }
        const buffer = await readFileAsArrayBuffer(blob);
        resolve({ buffer, format: 'png' });
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image format: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Creates a single multi-page PDF from a list of images
 */
export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  options: ImageToPdfOptions
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error('Please select at least one image to convert.');
  }

  const pdfDoc = await PDFDocument.create();

  // Standard point sizes (72 points per inch)
  // A4: 595.28 x 841.89 pt
  // Letter: 612.00 x 792.00 pt
  const baseSize = options.pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
  const isLandscape = options.orientation === 'landscape';

  const pageWidth = isLandscape ? Math.max(baseSize[0], baseSize[1]) : Math.min(baseSize[0], baseSize[1]);
  const pageHeight = isLandscape ? Math.min(baseSize[0], baseSize[1]) : Math.max(baseSize[0], baseSize[1]);

  const margin = options.marginPt !== undefined ? options.marginPt : 28; // ~10mm margin
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  for (const item of items) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const { buffer, format } = await ensureEmbeddableImage(item.file);
    let embeddedImage;

    try {
      if (format === 'jpeg') {
        embeddedImage = await pdfDoc.embedJpg(buffer);
      } else {
        embeddedImage = await pdfDoc.embedPng(buffer);
      }
    } catch {
      // If native embed fails (e.g., malformed jpeg headers), fallback to drawing on canvas as PNG
      const fallback = await new Promise<ArrayBuffer>((res, rej) => {
        const img = new Image();
        const url = URL.createObjectURL(item.file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          if (!ctx) return rej(new Error('Canvas error'));
          ctx.drawImage(img, 0, 0);
          c.toBlob(async (b) => {
            if (!b) return rej(new Error('Blob error'));
            res(await readFileAsArrayBuffer(b));
          }, 'image/png');
        };
        img.onerror = () => rej(new Error('Image decode error'));
        img.src = url;
      });
      embeddedImage = await pdfDoc.embedPng(fallback);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    // Scale to fit printable area while preserving aspect ratio
    const scaleFactor = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
    const finalWidth = imgWidth * scaleFactor;
    const finalHeight = imgHeight * scaleFactor;

    // Center image on the page
    const x = margin + (printableWidth - finalWidth) / 2;
    const y = margin + (printableHeight - finalHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: finalWidth,
      height: finalHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return pdfBlob;
}

/**
 * Inspects a PDF file: validates readability, gets page count, detects encryption
 */
export async function inspectPdfFile(file: File): Promise<PdfFileInfo> {
  const id = `${file.name}-${file.size}-${Math.random().toString(36).substring(2, 7)}`;
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount,
      isEncrypted: pdfDoc.isEncrypted,
      isValid: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error reading PDF file';
    const isEncrypted = message.toLowerCase().includes('encrypt') || message.toLowerCase().includes('password');

    return {
      id,
      file,
      name: file.name,
      size: file.size,
      pageCount: 0,
      isEncrypted,
      isValid: false,
      error: isEncrypted
        ? 'This PDF is encrypted or password-protected. Please remove password protection before merging.'
        : 'Unable to parse PDF. The file may be corrupted, truncated, or not a valid PDF.',
    };
  }
}

/**
 * Merges multiple PDF files in given order
 */
export async function mergePdfFiles(files: File[]): Promise<{ blob: Blob; totalPages: number }> {
  if (files.length < 2) {
    throw new Error('Please select at least 2 PDF files to merge.');
  }

  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await readFileAsArrayBuffer(file);

    let srcDoc: PDFDocument;
    try {
      srcDoc = await PDFDocument.load(arrayBuffer);
    } catch {
      throw new Error(
        `Failed to read "${file.name}". The document might be password-protected or contain corrupted PDF objects.`
      );
    }

    const indices = srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcDoc, indices);

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
      totalPages++;
    }
  }

  const mergedBytes = await mergedPdf.save();
  const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
  return { blob, totalPages };
}
