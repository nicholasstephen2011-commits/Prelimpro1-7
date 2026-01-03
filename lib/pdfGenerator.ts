// PDF Generation for Preliminary Notices using expo-print
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { Project } from './supabase'
import { getStateTemplate } from '../templates/notices/stateNoticeTemplates'
import { CompanyProfile, generateNoticeHTML } from '../templates/notices/noticeHtml'

export interface PDFGenerationResult {
  success: boolean
  uri?: string
  error?: string
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
