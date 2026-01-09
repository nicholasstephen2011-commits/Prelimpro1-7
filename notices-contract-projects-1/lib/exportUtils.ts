// Export utilities for project data - CSV and PDF reports
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Project } from './supabase';
import { formatDate, formatCurrency } from './stateNoticeTemplates';

export interface ExportResult {
  success: boolean;
  uri?: string;
  error?: string;
}

// Format project data for export
function formatProjectData(project: Project) {
  return {
    projectName: project.project_name,
    state: project.state,
    status: project.status.charAt(0).toUpperCase() + project.status.slice(1),
    deadline: project.deadline ? formatDate(project.deadline) : 'N/A',
    jobStartDate: formatDate(project.job_start_date),
    contractAmount: formatCurrency(project.contract_amount),
    propertyAddress: project.property_address,
    propertyOwnerName: project.property_owner_name,
    propertyOwnerAddress: project.property_owner_address,
    generalContractorName: project.general_contractor_name || 'N/A',
    generalContractorAddress: project.general_contractor_address || 'N/A',
    lenderName: project.lender_name || 'N/A',
    lenderAddress: project.lender_address || 'N/A',
    description: project.description,
    noticeRequired: project.notice_required ? 'Yes' : 'No',
    deliveryMethod: project.delivery_method || 'N/A',
    trackingNumber: project.tracking_number || 'N/A',
    createdAt: formatDate(project.created_at),
  };
}

// Generate CSV content from projects
export function generateCSV(projects: Project[]): string {
  const headers = [
    'Project Name',
    'State',
    'Status',
    'Deadline',
    'Job Start Date',
    'Contract Amount',
    'Property Address',
    'Property Owner Name',
    'Property Owner Address',
    'General Contractor Name',
    'General Contractor Address',
    'Lender Name',
    'Lender Address',
    'Description',
    'Notice Required',
    'Delivery Method',
    'Tracking Number',
    'Created Date',
  ];

  const rows = projects.map(project => {
    const data = formatProjectData(project);
    return [
      `"${data.projectName.replace(/"/g, '""')}"`,
      `"${data.state}"`,
      `"${data.status}"`,
      `"${data.deadline}"`,
      `"${data.jobStartDate}"`,
      `"${data.contractAmount}"`,
      `"${data.propertyAddress.replace(/"/g, '""')}"`,
      `"${data.propertyOwnerName.replace(/"/g, '""')}"`,
      `"${data.propertyOwnerAddress.replace(/"/g, '""')}"`,
      `"${data.generalContractorName.replace(/"/g, '""')}"`,
      `"${data.generalContractorAddress.replace(/"/g, '""')}"`,
      `"${data.lenderName.replace(/"/g, '""')}"`,
      `"${data.lenderAddress.replace(/"/g, '""')}"`,
      `"${data.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${data.noticeRequired}"`,
      `"${data.deliveryMethod}"`,
      `"${data.trackingNumber}"`,
      `"${data.createdAt}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Export projects as CSV file
export async function exportCSV(projects: Project[]): Promise<ExportResult> {
  try {
    const csvContent = generateCSV(projects);
    const fileName = `Projects_Export_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Projects CSV',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return {
      success: true,
      uri: fileUri,
    };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export CSV',
    };
  }
}

// Generate PDF report HTML
function generateReportHTML(projects: Project[], title: string): string {
  const currentDate = formatDate(new Date());
  const totalContractValue = projects.reduce((sum, p) => sum + p.contract_amount, 0);
  const statusCounts = {
    draft: projects.filter(p => p.status === 'draft').length,
    pending: projects.filter(p => p.status === 'pending').length,
    sent: projects.filter(p => p.status === 'sent').length,
    delivered: projects.filter(p => p.status === 'delivered').length,
    signed: projects.filter(p => p.status === 'signed').length,
  };

  const projectRows = projects.map((project, index) => {
    const data = formatProjectData(project);
    const statusColor = {
      draft: '#6B7280',
      pending: '#F59E0B',
      sent: '#3B82F6',
      delivered: '#10B981',
      signed: '#10B981',
    }[project.status] || '#6B7280';

    return `
      <div class="project-card ${index > 0 ? 'page-break-inside-avoid' : ''}">
        <div class="project-header">
          <div class="project-name">${data.projectName}</div>
          <div class="status-badge" style="background-color: ${statusColor}20; color: ${statusColor};">
            ${data.status}
          </div>
        </div>
        
        <div class="project-grid">
          <div class="info-section">
            <h4>Project Information</h4>
            <div class="info-row">
              <span class="label">State:</span>
              <span class="value">${data.state}</span>
            </div>
            <div class="info-row">
              <span class="label">Job Start Date:</span>
              <span class="value">${data.jobStartDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Deadline:</span>
              <span class="value">${data.deadline}</span>
            </div>
            <div class="info-row">
              <span class="label">Contract Amount:</span>
              <span class="value">${data.contractAmount}</span>
            </div>
            <div class="info-row">
              <span class="label">Notice Required:</span>
              <span class="value">${data.noticeRequired}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h4>Property Details</h4>
            <div class="info-row">
              <span class="label">Address:</span>
              <span class="value">${data.propertyAddress}</span>
            </div>
            <div class="info-row">
              <span class="label">Owner Name:</span>
              <span class="value">${data.propertyOwnerName}</span>
            </div>
            <div class="info-row">
              <span class="label">Owner Address:</span>
              <span class="value">${data.propertyOwnerAddress}</span>
            </div>
          </div>
        </div>
        
        <div class="project-grid">
          <div class="info-section">
            <h4>General Contractor</h4>
            <div class="info-row">
              <span class="label">Name:</span>
              <span class="value">${data.generalContractorName}</span>
            </div>
            <div class="info-row">
              <span class="label">Address:</span>
              <span class="value">${data.generalContractorAddress}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h4>Lender Information</h4>
            <div class="info-row">
              <span class="label">Name:</span>
              <span class="value">${data.lenderName}</span>
            </div>
            <div class="info-row">
              <span class="label">Address:</span>
              <span class="value">${data.lenderAddress}</span>
            </div>
          </div>
        </div>
        
        <div class="description-section">
          <h4>Work Description</h4>
          <p>${data.description}</p>
        </div>
        
        ${project.delivery_method ? `
        <div class="delivery-section">
          <h4>Delivery Information</h4>
          <div class="info-row">
            <span class="label">Method:</span>
            <span class="value">${data.deliveryMethod}</span>
          </div>
          ${project.tracking_number ? `
          <div class="info-row">
            <span class="label">Tracking #:</span>
            <span class="value">${data.trackingNumber}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page {
      margin: 0.5in;
      size: letter;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1F2937;
      background: #fff;
    }
    
    .report-container {
      max-width: 8.5in;
      margin: 0 auto;
    }
    
    .report-header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #1E40AF;
      margin-bottom: 20px;
    }
    
    .report-title {
      font-size: 24pt;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 5px;
    }
    
    .report-subtitle {
      font-size: 11pt;
      color: #6B7280;
    }
    
    .summary-section {
      display: flex;
      justify-content: space-between;
      background: #F3F4F6;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    .summary-item {
      text-align: center;
      flex: 1;
    }
    
    .summary-value {
      font-size: 18pt;
      font-weight: bold;
      color: #1E40AF;
    }
    
    .summary-label {
      font-size: 9pt;
      color: #6B7280;
      text-transform: uppercase;
    }
    
    .status-summary {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 9pt;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    
    .project-card {
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      background: #fff;
    }
    
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .project-name {
      font-size: 14pt;
      font-weight: bold;
      color: #1F2937;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .project-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .info-section {
      flex: 1;
    }
    
    .info-section h4 {
      font-size: 10pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 4px;
    }
    
    .label {
      font-weight: 500;
      color: #6B7280;
      min-width: 100px;
    }
    
    .value {
      color: #1F2937;
      flex: 1;
    }
    
    .description-section {
      background: #F9FAFB;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    
    .description-section h4 {
      font-size: 10pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 5px;
    }
    
    .description-section p {
      font-size: 9pt;
      color: #4B5563;
      line-height: 1.5;
    }
    
    .delivery-section {
      background: #EFF6FF;
      padding: 10px;
      border-radius: 6px;
      border-left: 3px solid #1E40AF;
    }
    
    .delivery-section h4 {
      font-size: 10pt;
      font-weight: 600;
      color: #1E40AF;
      margin-bottom: 5px;
    }
    
    .report-footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 8pt;
      color: #9CA3AF;
    }
    
    .page-break-inside-avoid {
      page-break-inside: avoid;
    }
    
    @media print {
      .project-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="report-title">${title}</div>
      <div class="report-subtitle">Generated on ${currentDate}</div>
    </div>
    
    <div class="summary-section">
      <div class="summary-item">
        <div class="summary-value">${projects.length}</div>
        <div class="summary-label">Total Projects</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${formatCurrency(totalContractValue)}</div>
        <div class="summary-label">Total Contract Value</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${projects.filter(p => p.notice_required).length}</div>
        <div class="summary-label">Notices Required</div>
      </div>
    </div>
    
    <div class="status-summary">
      <div class="status-item">
        <div class="status-dot" style="background: #6B7280;"></div>
        <span>Draft: ${statusCounts.draft}</span>
      </div>
      <div class="status-item">
        <div class="status-dot" style="background: #F59E0B;"></div>
        <span>Pending: ${statusCounts.pending}</span>
      </div>
      <div class="status-item">
        <div class="status-dot" style="background: #3B82F6;"></div>
        <span>Sent: ${statusCounts.sent}</span>
      </div>
      <div class="status-item">
        <div class="status-dot" style="background: #10B981;"></div>
        <span>Delivered/Signed: ${statusCounts.delivered + statusCounts.signed}</span>
      </div>
    </div>
    
    ${projectRows}
    
    <div class="report-footer">
      <p>Prelimpro - Preliminary Notice Management</p>
      <p>This report is for informational purposes only. Consult with a licensed attorney for legal advice.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Export projects as PDF report
export async function exportPDFReport(
  projects: Project[],
  title: string = 'Project Report'
): Promise<ExportResult> {
  try {
    const html = generateReportHTML(projects, title);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Rename the file to have a meaningful name
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${title}`,
        UTI: 'com.adobe.pdf',
      });
    }
    
    return {
      success: true,
      uri: newUri,
    };
  } catch (error) {
    console.error('Error exporting PDF report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PDF report',
    };
  }
}

// Generate single project detail PDF
function generateSingleProjectHTML(project: Project): string {
  const data = formatProjectData(project);
  const currentDate = formatDate(new Date());
  
  const statusColor = {
    draft: '#6B7280',
    pending: '#F59E0B',
    sent: '#3B82F6',
    delivered: '#10B981',
    signed: '#10B981',
  }[project.status] || '#6B7280';

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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1F2937;
      background: #fff;
    }
    
    .document {
      max-width: 8.5in;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #1E40AF;
      margin-bottom: 25px;
    }
    
    .title {
      font-size: 22pt;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 5px;
    }
    
    .subtitle {
      font-size: 11pt;
      color: #6B7280;
    }
    
    .status-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F3F4F6;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    
    .status-badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${statusColor}20;
      color: ${statusColor};
    }
    
    .deadline-info {
      text-align: right;
    }
    
    .deadline-label {
      font-size: 9pt;
      color: #6B7280;
      text-transform: uppercase;
    }
    
    .deadline-value {
      font-size: 14pt;
      font-weight: bold;
      color: #1F2937;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #E5E7EB;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .info-item {
      margin-bottom: 10px;
    }
    
    .info-label {
      font-size: 9pt;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    
    .info-value {
      font-size: 11pt;
      color: #1F2937;
    }
    
    .full-width {
      grid-column: 1 / -1;
    }
    
    .description-box {
      background: #F9FAFB;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #1E40AF;
    }
    
    .description-text {
      font-size: 11pt;
      color: #4B5563;
      line-height: 1.6;
    }
    
    .party-card {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
    }
    
    .party-title {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .delivery-box {
      background: #EFF6FF;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #BFDBFE;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      font-size: 9pt;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="title">${data.projectName}</div>
      <div class="subtitle">Project Detail Report - Generated ${currentDate}</div>
    </div>
    
    <div class="status-section">
      <div>
        <span class="status-badge">${data.status}</span>
      </div>
      <div class="deadline-info">
        <div class="deadline-label">Notice Deadline</div>
        <div class="deadline-value">${data.deadline}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Project Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">State</div>
          <div class="info-value">${data.state}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Contract Amount</div>
          <div class="info-value">${data.contractAmount}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Job Start Date</div>
          <div class="info-value">${data.jobStartDate}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Notice Required</div>
          <div class="info-value">${data.noticeRequired}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Created Date</div>
          <div class="info-value">${data.createdAt}</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Property Details</div>
      <div class="info-grid">
        <div class="info-item full-width">
          <div class="info-label">Property Address</div>
          <div class="info-value">${data.propertyAddress}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Owner Name</div>
          <div class="info-value">${data.propertyOwnerName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Owner Address</div>
          <div class="info-value">${data.propertyOwnerAddress}</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Additional Parties</div>
      <div class="party-card">
        <div class="party-title">General Contractor</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Name</div>
            <div class="info-value">${data.generalContractorName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Address</div>
            <div class="info-value">${data.generalContractorAddress}</div>
          </div>
        </div>
      </div>
      <div class="party-card">
        <div class="party-title">Lender</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Name</div>
            <div class="info-value">${data.lenderName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Address</div>
            <div class="info-value">${data.lenderAddress}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Work Description</div>
      <div class="description-box">
        <div class="description-text">${data.description}</div>
      </div>
    </div>
    
    ${project.delivery_method ? `
    <div class="section">
      <div class="section-title">Delivery Information</div>
      <div class="delivery-box">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Delivery Method</div>
            <div class="info-value">${data.deliveryMethod}</div>
          </div>
          ${project.tracking_number ? `
          <div class="info-item">
            <div class="info-label">Tracking Number</div>
            <div class="info-value">${data.trackingNumber}</div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Prelimpro - Preliminary Notice Management</p>
      <p>This report is for informational purposes only. Consult with a licensed attorney for legal advice.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Export single project as detailed PDF
export async function exportSingleProjectPDF(project: Project): Promise<ExportResult> {
  try {
    const html = generateSingleProjectHTML(project);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    const fileName = `Project_${project.project_name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${project.project_name} Report`,
        UTI: 'com.adobe.pdf',
      });
    }
    
    return {
      success: true,
      uri: newUri,
    };
  } catch (error) {
    console.error('Error exporting single project PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export project PDF',
    };
  }
}
