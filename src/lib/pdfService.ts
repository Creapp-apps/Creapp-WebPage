import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { supabase } from './supabaseClient';
import { updateProposal } from './proposalService';

export const generateAndUploadContractBox = async (
  contractElementId: string,
  proposalId: string,
  proposalSlug: string
): Promise<string> => {
  const element = document.getElementById(contractElementId);
  if (!element) {
    throw new Error('Contract element not found in DOM.');
  }

  // Temporarily remove max-height and overflow to capture the full length
  const originalMaxHeight = element.style.maxHeight;
  const originalOverflow = element.style.overflow;
  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';

  // Capture the element using html2canvas
  const canvas = await html2canvas(element, {
    scale: 2, // higher resolution
    useCORS: true,
    backgroundColor: '#050505',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  });

  // Restore original styles
  element.style.maxHeight = originalMaxHeight;
  element.style.overflow = originalOverflow;

  const imgData = canvas.toDataURL('image/png');

  // Convert the canvas to a single page continuous PDF
  // This avoids arbitrary page breaks cutting through text or signatures
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });

  // Calculate PDF dimensions based on A4 ratio (210x297mm)
  // Replaced with single continuous page mapping
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

  // Get PDF as a Blob
  const pdfBlob = pdf.output('blob');

  // Upload to Supabase Storage
  const fileName = `contrato-${proposalSlug}-${Date.now()}.pdf`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(fileName, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Error uploading to storage: ${uploadError.message}`);
  }

  // Get public URL (or signed URL if bucket is private)
  const { data: { publicUrl } } = supabase.storage
    .from('contracts')
    .getPublicUrl(uploadData.path);

  // Update Database Record ONLY if upload was successful
  await updateProposal(proposalId, {
    status: 'signed',
    signed_contract_url: publicUrl,
    signed_at: new Date().toISOString()
  });

  return publicUrl;
};

export const generateFullProposalPDF = async (
  templateElementId: string
): Promise<Blob> => {
  const container = document.getElementById(templateElementId);
  if (!container) {
    throw new Error('Print container not found');
  }

  // Save original styling values to restore them later
  const originalClassName = container.className;
  const originalStylePosition = container.style.position;
  const originalStyleLeft = container.style.left;
  const originalStyleTop = container.style.top;
  const originalStyleZIndex = container.style.zIndex;
  const originalStyleVisibility = container.style.visibility;
  const originalStyleDisplay = container.style.display;

  // Temporarily reset positioning to fixed at (0, 0) with high negative z-index
  // so the layout engine processes the sizes/locations properly without rendering off-screen (which breaks html2canvas)
  container.className = '';
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.zIndex = '-9999';
  container.style.visibility = 'visible';
  container.style.display = 'block';

  try {
    const pages = Array.from(container.children) as HTMLElement[];
    if (pages.length === 0) {
      throw new Error('No pages found inside print container');
    }

    // Create a new jsPDF instance with standard A4 page dimensions in points (595.28 x 841.89)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      // Capture page with html2canvas
      const canvas = await html2canvas(page, {
        scale: 2.5, // Crisp resolution for text printing
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: page.offsetWidth || 794,
        windowHeight: page.offsetHeight || 1123
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Draw the page canvas to fit the A4 page boundaries (595.28 x 841.89 pt)
      pdf.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89);
    }

    return pdf.output('blob');
  } finally {
    // Restore original styles
    container.className = originalClassName;
    container.style.position = originalStylePosition;
    container.style.left = originalStyleLeft;
    container.style.top = originalStyleTop;
    container.style.zIndex = originalStyleZIndex;
    container.style.visibility = originalStyleVisibility;
    container.style.display = originalStyleDisplay;
  }
};
