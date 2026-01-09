// State-specific preliminary notice templates with required legal language
import { Project } from './supabase';

export interface StateNoticeTemplate {
  title: string;
  subtitle: string;
  warningText: string;
  legalNotice: string;
  signatureRequirements: string;
  additionalClauses: string[];
  deadlineDays: number;
  certifiedMailRequired: boolean;
  notaryRequired: boolean;
}

export const STATE_NOTICE_TEMPLATES: Record<string, StateNoticeTemplate> = {
  'California': {
    title: 'PRELIMINARY NOTICE',
    subtitle: '20-Day Preliminary Notice (California Civil Code § 8200-8216)',
    warningText: 'NOTICE TO PROPERTY OWNER: If bills are not paid in full for the labor, services, equipment, or materials furnished or to be furnished, a mechanic\'s lien leading to the loss, through court foreclosure proceedings, of all or part of your property being so improved may be placed against the property even though you have paid your contractor in full. You may wish to protect yourself against this consequence by (1) requiring your contractor to furnish a signed release by the person or firm giving you this notice before making payment to your contractor, or (2) any other method or device that is appropriate under the circumstances.',
    legalNotice: 'This is not a lien. This is not a reflection on the integrity of any contractor or subcontractor. This notice is required by law to be served by a claimant within 20 days after the claimant has first furnished labor, services, equipment, or materials to the jobsite.',
    signatureRequirements: 'Signature of Claimant or Authorized Representative',
    additionalClauses: [
      'The undersigned is a (check one): [ ] Direct Contractor [ ] Subcontractor [ ] Material Supplier [ ] Equipment Lessor [ ] Laborer',
      'The name and address of the person with whom the claimant contracted is set forth above.',
      'A general description of the labor, services, equipment, or materials furnished or to be furnished is set forth above.',
      'The name and address of the owner or reputed owner, if known, is set forth above.'
    ],
    deadlineDays: 20,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Texas': {
    title: 'NOTICE TO OWNER',
    subtitle: 'Texas Property Code Chapter 53 Notice',
    warningText: 'NOTICE: This is not a lien. This notice is required by law to be sent to you to inform you that labor, services, equipment, or materials have been or will be furnished for improvements to your property.',
    legalNotice: 'Under Texas law, those who furnish labor or materials for the construction or repair of improvements on your property may file a lien against your property if they are not paid for their contributions. This notice is required to be given to you by law.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Pursuant to Texas Property Code § 53.056, this notice is given to the owner of the property described herein.',
      'The undersigned has contracted to furnish labor and/or materials for the improvement of the property.',
      'The owner may protect against liens by requiring lien waivers from all contractors, subcontractors, and suppliers.'
    ],
    deadlineDays: 15,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Florida': {
    title: 'NOTICE TO OWNER',
    subtitle: 'Florida Statutes § 713.06 Notice to Owner',
    warningText: 'WARNING: Florida law requires that this notice be given to the property owner. This is not a lien, but a notice of the right to file a lien.',
    legalNotice: 'The undersigned hereby informs you that he or she has furnished or is furnishing services or materials as follows: [description of services/materials]. Florida law (§ 713.06) requires this notice to preserve lien rights.',
    signatureRequirements: 'Signature of Lienor',
    additionalClauses: [
      'This notice is served pursuant to Florida Statutes § 713.06.',
      'The lienor\'s interest in the real property is that of a subcontractor, sub-subcontractor, or materialman.',
      'The amount due or to become due is set forth above.',
      'The lienor is required to serve this notice within 45 days from first furnishing labor, services, or materials.'
    ],
    deadlineDays: 45,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Arizona': {
    title: 'PRELIMINARY TWENTY-DAY NOTICE',
    subtitle: 'Arizona Revised Statutes § 33-992.01',
    warningText: 'IMPORTANT INFORMATION FOR YOUR PROTECTION: Arizona law requires that a claimant who contracts to furnish labor, professional services, materials, machinery, fixtures, or tools for the construction, alteration, or repair of any building, structure, or improvement must give this notice to the owner within twenty days after first furnishing such items.',
    legalNotice: 'This is not a lien. This is not a reflection on the integrity of any contractor or subcontractor. This notice is required by law to preserve lien rights.',
    signatureRequirements: 'Signature of Claimant or Authorized Agent',
    additionalClauses: [
      'Pursuant to A.R.S. § 33-992.01, this notice is given to preserve lien rights.',
      'The claimant has furnished or will furnish labor, services, or materials for the improvement described.',
      'The owner may protect against liens by obtaining lien waivers from all parties.'
    ],
    deadlineDays: 20,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Nevada': {
    title: 'NOTICE OF RIGHT TO LIEN',
    subtitle: 'Nevada Revised Statutes Chapter 108',
    warningText: 'NOTICE: This is not a lien. This notice is sent to inform you that labor, services, or materials have been or will be furnished for improvements to your property and that the sender may have lien rights.',
    legalNotice: 'Under Nevada law (NRS Chapter 108), persons who furnish labor, materials, or equipment for the improvement of real property may file a lien against the property if not paid. This notice must be given within 31 days of first furnishing labor or materials.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'This notice is given pursuant to NRS 108.245.',
      'The claimant reserves all rights under Nevada\'s mechanic\'s lien laws.',
      'The property owner may request lien releases from the general contractor.'
    ],
    deadlineDays: 31,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Colorado': {
    title: 'NOTICE OF INTENT TO FILE LIEN STATEMENT',
    subtitle: 'Colorado Revised Statutes § 38-22-102',
    warningText: 'NOTICE: This document is a notice of intent to file a lien statement. Under Colorado law, those who furnish labor, materials, or services for the improvement of real property may file a lien against the property.',
    legalNotice: 'Pursuant to C.R.S. § 38-22-102, this notice is given to inform the property owner that labor, services, or materials have been furnished for the improvement of the property described herein.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'This notice is required under Colorado mechanic\'s lien law.',
      'The claimant must file this notice within 10 days of first furnishing labor or materials.',
      'The owner should require lien waivers from all contractors and suppliers.'
    ],
    deadlineDays: 10,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Washington': {
    title: 'NOTICE TO OWNER',
    subtitle: 'RCW 60.04.031 Pre-Claim Notice',
    warningText: 'IMPORTANT: This notice is required by Washington law. It is not a lien. Read this notice carefully.',
    legalNotice: 'At any time during the course of construction, you may ask the prime contractor for a list of all subcontractors and suppliers who have notified the prime contractor that they are providing labor, materials, or equipment to your construction project. You may also ask the prime contractor for a list of all subcontractors and suppliers who have not been paid. You may pay those subcontractors and suppliers directly to protect your property from liens.',
    signatureRequirements: 'Signature of Potential Lien Claimant',
    additionalClauses: [
      'This notice is given pursuant to RCW 60.04.031.',
      'The claimant must give this notice within 60 days of first furnishing labor or materials.',
      'This notice preserves the claimant\'s right to file a construction lien.',
      'The owner may protect against liens by requiring lien releases before making payments.'
    ],
    deadlineDays: 60,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Oregon': {
    title: 'NOTICE OF RIGHT TO A LIEN',
    subtitle: 'ORS 87.021 Information Notice',
    warningText: 'NOTICE: This is not a lien. This notice is required by Oregon law to inform you that labor, services, or materials are being furnished for improvements to your property.',
    legalNotice: 'Under Oregon law (ORS 87.021), persons who furnish labor, materials, or equipment for the improvement of real property may file a lien against the property if not paid. This notice must be given within 8 days of first furnishing labor or materials.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'This notice is given pursuant to ORS 87.021.',
      'The claimant has furnished or will furnish labor, materials, or equipment.',
      'The owner may request lien releases from all contractors and suppliers.'
    ],
    deadlineDays: 8,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Utah': {
    title: 'PRELIMINARY NOTICE',
    subtitle: 'Utah Code § 38-1a-501',
    warningText: 'NOTICE: This is not a lien. This notice is required by Utah law to preserve the right to file a mechanic\'s lien.',
    legalNotice: 'Under Utah law (Utah Code § 38-1a-501), persons who furnish labor, materials, or equipment for the improvement of real property must file a preliminary notice to preserve their lien rights. This notice must be filed within 20 days of first furnishing labor or materials.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'This notice is filed pursuant to Utah Code § 38-1a-501.',
      'The claimant has furnished or will furnish labor, materials, or equipment.',
      'The preliminary notice must be filed with the State Construction Registry.',
      'The owner may protect against liens by requiring lien releases.'
    ],
    deadlineDays: 20,
    certifiedMailRequired: false,
    notaryRequired: false
  },
  'Georgia': {
    title: 'NOTICE TO OWNER/CONTRACTOR',
    subtitle: 'O.C.G.A. § 44-14-361.1 Notice',
    warningText: 'NOTICE: This is a notice required by Georgia law. It is not a lien but preserves the right to file a lien.',
    legalNotice: 'Under Georgia law (O.C.G.A. § 44-14-361.1), persons who furnish labor, materials, or services for the improvement of real property must give notice to the owner and contractor to preserve their lien rights.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'This notice is given pursuant to O.C.G.A. § 44-14-361.1.',
      'The claimant has furnished or will furnish labor, materials, or services.',
      'This notice must be given within 30 days of first furnishing labor or materials.',
      'The owner may protect against liens by requiring lien waivers.'
    ],
    deadlineDays: 30,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Michigan': {
    title: 'NOTICE OF FURNISHING',
    subtitle: 'MCL 570.1109 Notice',
    warningText: 'NOTICE: This notice is required by Michigan law to preserve the right to file a construction lien.',
    legalNotice: 'Under Michigan law (MCL 570.1109), subcontractors, laborers, and material suppliers must provide this notice to the property owner and general contractor within 20 days of first furnishing labor or materials to preserve their lien rights.',
    signatureRequirements: 'Signature of Lien Claimant',
    additionalClauses: [
      'This notice is given pursuant to MCL 570.1109.',
      'The claimant has furnished or will furnish labor, materials, or equipment.',
      'This notice must be given within 20 days of first furnishing.',
      'The owner may designate a person to receive notices on their behalf.'
    ],
    deadlineDays: 20,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Ohio': {
    title: 'NOTICE OF FURNISHING',
    subtitle: 'Ohio Revised Code § 1311.05 Notice',
    warningText: 'NOTICE: This notice is required by Ohio law. It is not a lien but is necessary to preserve the right to file a mechanic\'s lien.',
    legalNotice: 'Under Ohio law (ORC § 1311.05), subcontractors and material suppliers must serve this notice upon the owner within 21 days of first furnishing labor or materials to preserve their lien rights.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'This notice is served pursuant to ORC § 1311.05.',
      'The claimant has furnished or will furnish labor or materials.',
      'This notice must be served within 21 days of first furnishing.',
      'The affidavit must be served by certified mail or personal delivery.'
    ],
    deadlineDays: 21,
    certifiedMailRequired: true,
    notaryRequired: true
  },
  'Illinois': {
    title: 'NOTICE OF LIEN RIGHTS',
    subtitle: '770 ILCS 60/24 Subcontractor Notice',
    warningText: 'NOTICE: This notice is required by Illinois law to preserve the right to file a mechanic\'s lien.',
    legalNotice: 'Under Illinois law (770 ILCS 60/24), subcontractors must serve notice upon the owner within 60 days of first furnishing labor or materials to preserve their lien rights against the owner.',
    signatureRequirements: 'Signature of Subcontractor',
    additionalClauses: [
      'This notice is served pursuant to 770 ILCS 60/24.',
      'The subcontractor has furnished or will furnish labor or materials.',
      'This notice must be served within 60 days of first furnishing.',
      'The notice must be served by certified mail or personal delivery.'
    ],
    deadlineDays: 60,
    certifiedMailRequired: true,
    notaryRequired: false
  }
};

// Default template for states not specifically listed
export const DEFAULT_NOTICE_TEMPLATE: StateNoticeTemplate = {
  title: 'PRELIMINARY NOTICE',
  subtitle: 'Notice of Furnishing Labor/Materials',
  warningText: 'NOTICE: This notice is required by law to preserve the right to file a mechanic\'s lien. This is not a lien.',
  legalNotice: 'The undersigned hereby gives notice that labor, services, equipment, or materials have been or will be furnished for the improvement of the property described herein. This notice is given to preserve lien rights under applicable state law.',
  signatureRequirements: 'Signature of Claimant',
  additionalClauses: [
    'The claimant has furnished or will furnish labor, materials, or equipment.',
    'The owner may protect against liens by requiring lien waivers from all contractors and suppliers.',
    'This notice is given to preserve all rights under applicable mechanic\'s lien laws.'
  ],
  deadlineDays: 30,
  certifiedMailRequired: true,
  notaryRequired: false
};

export function getStateTemplate(state: string): StateNoticeTemplate {
  return STATE_NOTICE_TEMPLATES[state] || DEFAULT_NOTICE_TEMPLATE;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}
