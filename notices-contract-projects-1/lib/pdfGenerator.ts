// PDF Generation for Preliminary Notices using expo-print
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Project } from './supabase';
import { getStateTemplate, formatDate, formatCurrency, StateNoticeTemplate } from './stateNoticeTemplates';

export interface PDFGenerationResult {
  success: boolean;
  uri?: string;
  error?: string;
}

export interface CompanyProfile {
  company_name?: string;
  company_logo_url?: string | null;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  license_number?: string;
}

// Generate HTML content for the preliminary notice PDF
export function generateNoticeHTML(
  project: Project, 
  template: StateNoticeTemplate,
  companyProfile?: CompanyProfile
): string {
  const currentDate = formatDate(new Date());
  const jobStartDate = formatDate(project.job_start_date);
  const contractAmount = formatCurrency(project.contract_amount);

  // Company logo HTML - only include if logo URL exists
  const logoHTML = companyProfile?.company_logo_url 
    ? `<img src="${companyProfile.company_logo_url}" alt="Company Logo" style="max-height: 60px; max-width: 150px; object-fit: contain; margin-bottom: 10px;" />`
    : '';

  // Company info for signature section
  const companyName = companyProfile?.company_name || '';
  const companyAddress = companyProfile?.company_address || '';
  const companyPhone = companyProfile?.company_phone || '';
  const licenseNumber = companyProfile?.license_number || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      margin: 0.75in;
      size: letter;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    
    .document {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .company-logo {
      margin-bottom: 10px;
    }
    
    .title {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 3px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    
    .subtitle {
      font-size: 10pt;
      color: #333;
      font-style: italic;
    }
    
    .warning-box {
      background-color: #fff3cd;
      border: 2px solid #856404;
      padding: 12px 15px;
      margin: 20px 0;
      font-size: 10pt;
    }
    
    .warning-box strong {
      color: #856404;
    }
    
    .section {
      margin: 15px 0;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
    }
    
    .field-row {
      display: flex;
      margin: 5px 0;
      padding: 3px 0;
    }
    
    .field-label {
      font-weight: bold;
      min-width: 180px;
      flex-shrink: 0;
    }
    
    .field-value {
      flex: 1;
      border-bottom: 1px solid #ccc;
      padding-left: 5px;
    }
    
    .paragraph {
      text-align: justify;
      margin: 10px 0;
      text-indent: 0.5in;
    }
    
    .legal-notice {
      background-color: #f8f9fa;
      border-left: 4px solid #1E40AF;
      padding: 12px 15px;
      margin: 20px 0;
      font-size: 10pt;
    }
    
    .clauses {
      margin: 15px 0;
      padding-left: 20px;
    }
    
    .clause-item {
      margin: 8px 0;
      padding-left: 10px;
      position: relative;
    }
    
    .clause-item::before {
      content: "•";
      position: absolute;
      left: -10px;
    }
    
    .signature-section {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    
    .signature-block {
      width: 45%;
    }
    
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 10pt;
    }
    
    .date-line {
      margin-top: 20px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    
    .notary-section {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #000;
      page-break-inside: avoid;
    }
    
    .notary-title {
      font-weight: bold;
      text-align: center;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    
    .notary-text {
      font-size: 10pt;
      line-height: 1.6;
    }
    
    .checkbox-item {
      margin: 5px 0;
      display: flex;
      align-items: center;
    }
    
    .checkbox {
      width: 12px;
      height: 12px;
      border: 1px solid #000;
      margin-right: 8px;
      display: inline-block;
    }
    
    .delivery-info {
      background-color: #e8f4fd;
      border: 1px solid #1E40AF;
      padding: 12px 15px;
      margin: 20px 0;
      font-size: 10pt;
    }
    
    .delivery-title {
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="document">
    <!-- Header -->
    <div class="header">
      ${logoHTML ? `<div class="company-logo">${logoHTML}</div>` : ''}
      <div class="title">${template.title}</div>
      <div class="subtitle">${template.subtitle}</div>
    </div>
    
    <!-- Warning Box -->
    <div class="warning-box">
      <strong>WARNING:</strong> ${template.warningText}
    </div>
    
    <!-- Property Owner Section -->
    <div class="section">
      <div class="section-title">To: Property Owner</div>
      <div class="field-row">
        <span class="field-label">Owner Name:</span>
        <span class="field-value">${project.property_owner_name}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Owner Address:</span>
        <span class="field-value">${project.property_owner_address}</span>
      </div>
    </div>
    
    ${project.general_contractor_name ? `
    <!-- General Contractor Section -->
    <div class="section">
      <div class="section-title">General Contractor</div>
      <div class="field-row">
        <span class="field-label">Contractor Name:</span>
        <span class="field-value">${project.general_contractor_name}</span>
      </div>
      ${project.general_contractor_address ? `
      <div class="field-row">
        <span class="field-label">Contractor Address:</span>
        <span class="field-value">${project.general_contractor_address}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    ${project.lender_name ? `
    <!-- Lender Section -->
    <div class="section">
      <div class="section-title">Construction Lender</div>
      <div class="field-row">
        <span class="field-label">Lender Name:</span>
        <span class="field-value">${project.lender_name}</span>
      </div>
      ${project.lender_address ? `
      <div class="field-row">
        <span class="field-label">Lender Address:</span>
        <span class="field-value">${project.lender_address}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    <!-- Property Information -->
    <div class="section">
      <div class="section-title">Property Information</div>
      <div class="field-row">
        <span class="field-label">Property Address:</span>
        <span class="field-value">${project.property_address}</span>
      </div>
    </div>
    
    <!-- Notice Statement -->
    <div class="section">
      <div class="section-title">Notice Is Hereby Given That:</div>
      <p class="paragraph">
        The undersigned has furnished or will furnish labor, services, equipment, or materials 
        for the improvement of the above-described property. This notice is given in accordance 
        with applicable state law to preserve the undersigned's rights under the mechanic's lien 
        statutes of the State of ${project.state}.
      </p>
    </div>
    
    <!-- Work Description -->
    <div class="section">
      <div class="section-title">Description of Labor, Services, Equipment, or Materials</div>
      <p class="paragraph">${project.description}</p>
    </div>
    
    <!-- Contract Details -->
    <div class="section">
      <div class="section-title">Contract Information</div>
      <div class="field-row">
        <span class="field-label">Estimated Contract Amount:</span>
        <span class="field-value">${contractAmount}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Date Work Commenced:</span>
        <span class="field-value">${jobStartDate}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Date of This Notice:</span>
        <span class="field-value">${currentDate}</span>
      </div>
    </div>
    
    <!-- Legal Notice -->
    <div class="legal-notice">
      <strong>LEGAL NOTICE:</strong> ${template.legalNotice}
    </div>
    
    <!-- Additional Clauses -->
    <div class="section">
      <div class="section-title">Additional Information</div>
      <div class="clauses">
        ${template.additionalClauses.map(clause => `
          <div class="clause-item">${clause}</div>
        `).join('')}
      </div>
    </div>
    
    <!-- Delivery Requirements -->
    <div class="delivery-info">
      <div class="delivery-title">Delivery Requirements for ${project.state}</div>
      <p>
        ${template.certifiedMailRequired 
          ? 'This notice must be sent via certified mail with return receipt requested, or by personal delivery with proof of service.'
          : 'This notice may be delivered by regular mail, certified mail, or personal delivery.'}
        ${template.notaryRequired 
          ? ' This notice requires notarization before delivery.'
          : ''}
      </p>
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section">
      <div class="section-title">Certification and Signature</div>
      <p style="margin: 10px 0; font-size: 10pt;">
        I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge.
      </p>
      
      <div class="signature-row">
        <div class="signature-block">
          <div class="signature-line">${template.signatureRequirements}</div>
        </div>
        <div class="signature-block">
          <div class="signature-line date-line">Date</div>
        </div>
      </div>
      
      <div class="signature-row">
        <div class="signature-block">
          <div class="signature-line">Printed Name</div>
        </div>
        <div class="signature-block">
          <div class="signature-line">Title/Position</div>
        </div>
      </div>
      
      <div class="field-row" style="margin-top: 20px;">
        <span class="field-label">Company Name:</span>
        <span class="field-value">${companyName}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Company Address:</span>
        <span class="field-value">${companyAddress}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Phone Number:</span>
        <span class="field-value">${companyPhone}</span>
      </div>
      <div class="field-row">
        <span class="field-label">License Number:</span>
        <span class="field-value">${licenseNumber}</span>
      </div>
    </div>
    
    ${template.notaryRequired ? `
    <!-- Notary Section -->
    <div class="notary-section">
      <div class="notary-title">Notary Acknowledgment</div>
      <div class="notary-text">
        <p>State of ${project.state}</p>
        <p>County of ___________________</p>
        <br>
        <p>
          On this _____ day of _______________, 20___, before me, the undersigned notary public, 
          personally appeared _________________________________, proved to me on the basis of 
          satisfactory evidence to be the person(s) whose name(s) is/are subscribed to the within 
          instrument and acknowledged to me that he/she/they executed the same in his/her/their 
          authorized capacity(ies), and that by his/her/their signature(s) on the instrument the 
          person(s), or the entity upon behalf of which the person(s) acted, executed the instrument.
        </p>
        <br>
        <p>WITNESS my hand and official seal.</p>
        <br>
        <div class="signature-row">
          <div class="signature-block">
            <div class="signature-line">Notary Public Signature</div>
          </div>
          <div class="signature-block">
            <div style="width: 80px; height: 80px; border: 1px solid #000; margin-top: 20px; text-align: center; line-height: 80px; font-size: 9pt;">[SEAL]</div>
          </div>
        </div>
        <p style="margin-top: 10px;">My Commission Expires: ___________________</p>
      </div>
    </div>
    ` : ''}
    

    <!-- Footer -->
    <div class="footer">
      <p style="font-weight: bold; color: #D97706; margin-bottom: 8px; font-size: 10pt;">
        Generated by PrelimPro — Tool only. Not legal advice. Consult an attorney.
      </p>
      <p>This preliminary notice was generated on ${currentDate}</p>
      <p>Project: ${project.project_name} | State: ${project.state}</p>
      <p style="margin-top: 8px; font-size: 8pt;">
        This document is a template for informational purposes only. PrelimPro is not a law firm and does not provide legal advice. 
        No attorney-client relationship is formed. You are solely responsible for verifying accuracy and compliance with current state law.
        Consult with a licensed attorney for legal advice specific to your situation.
      </p>
      <p style="margin-top: 5px; font-size: 8pt;">
        <a href="https://prelimpro.com/terms" style="color: #1E40AF;">Terms of Service</a> | 
        <a href="https://prelimpro.com/privacy" style="color: #1E40AF;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}


// Generate PDF from project data
export async function generatePDF(
  project: Project, 
  companyProfile?: CompanyProfile
): Promise<PDFGenerationResult> {
  try {
    const template = getStateTemplate(project.state);
    const html = generateNoticeHTML(project, template, companyProfile);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Rename the file to have a meaningful name
    const fileName = `Preliminary_Notice_${project.project_name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });
    
    return {
      success: true,
      uri: newUri,
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

// Print PDF directly
export async function printPDF(
  project: Project,
  companyProfile?: CompanyProfile
): Promise<PDFGenerationResult> {
  try {
    const template = getStateTemplate(project.state);
    const html = generateNoticeHTML(project, template, companyProfile);
    
    await Print.printAsync({
      html,
    });
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error printing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to print PDF',
    };
  }
}

// Share PDF
export async function sharePDF(
  project: Project,
  companyProfile?: CompanyProfile
): Promise<PDFGenerationResult> {
  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Sharing is not available on this device',
      };
    }
    
    // Generate the PDF first
    const result = await generatePDF(project, companyProfile);
    if (!result.success || !result.uri) {
      return result;
    }
    
    // Share the PDF
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Preliminary Notice - ${project.project_name}`,
      UTI: 'com.adobe.pdf',
    });
    
    return {
      success: true,
      uri: result.uri,
    };
  } catch (error) {
    console.error('Error sharing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share PDF',
    };
  }
}

// Save PDF to device
export async function savePDF(
  project: Project,
  companyProfile?: CompanyProfile
): Promise<PDFGenerationResult> {
  try {
    const result = await generatePDF(project, companyProfile);
    if (!result.success || !result.uri) {
      return result;
    }
    
    // The file is already saved to the document directory
    return {
      success: true,
      uri: result.uri,
    };
  } catch (error) {
    console.error('Error saving PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save PDF',
    };
  }
}

// Get PDF preview HTML (for WebView display)
export function getPreviewHTML(
  project: Project,
  companyProfile?: CompanyProfile
): string {
  const template = getStateTemplate(project.state);
  return generateNoticeHTML(project, template, companyProfile);
}
