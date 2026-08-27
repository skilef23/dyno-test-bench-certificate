import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Generates an official A4 Portrait PDF (210mm x 297mm) with 15mm margins
 * Supporting both multi-page (.certificate-a4-page) and single-sheet certificate layouts.
 */
export async function downloadCertificatePDF(
  elementId: string,
  filename: string
): Promise<boolean> {
  const rootElement = document.getElementById(elementId);
  if (!rootElement) {
    console.error(`Certificate container with id "${elementId}" not found.`);
    return false;
  }

  try {
    // Find discrete A4 pages if present
    const pageElements = rootElement.querySelectorAll<HTMLElement>('.certificate-a4-page');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    if (pageElements.length > 0) {
      // Process each distinct A4 page individually for zero-clipping multi-page output
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        const dataUrl = await toPng(pageEl, {
          quality: 0.98,
          pixelRatio: 2.5, // 300 DPI equivalent for razor-sharp vector/text quality
          backgroundColor: '#ffffff',
          cacheBust: true,
        });

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Each certificate-a4-page has 15mm padding built in, mapping 1:1 to 210 x 297 mm
        pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      }
    } else {
      // Fallback single container processing
      const dataUrl = await toPng(rootElement, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 15; // Official 15mm safe margin
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (img.naturalHeight * contentWidth) / img.naturalWidth;

      if (contentHeight <= pdfHeight - margin * 2) {
        pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
      } else {
        let position = margin;
        let heightLeft = contentHeight;

        pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
          position = margin - (contentHeight - heightLeft);
          pdf.addPage('a4', 'portrait');
          pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
          heightLeft -= (pdfHeight - margin * 2);
        }
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating official Certificate PDF:', error);
    return false;
  }
}
