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
      windowWidth: page.offsetWidth,
      windowHeight: page.offsetHeight
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Draw the page canvas to fit the A4 page boundaries (595.28 x 841.89 pt)
    pdf.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89);
  }

  return pdf.output('blob');
};
