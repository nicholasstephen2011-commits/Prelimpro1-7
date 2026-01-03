// State-specific preliminary notice templates with required legal language

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
  },
  'Alabama': {
    title: 'PRELIMINARY NOTICE TO OWNER',
    subtitle: 'Alabama Code § 35-11-210 Notice',
    warningText: 'NOTICE: This notice protects lien rights for labor, services, or materials furnished to this project. It is not a lien but preserves the right to record one if unpaid.',
    legalNotice: 'Pursuant to Ala. Code § 35-11-210, claimants must notify the owner that labor or materials are being furnished and that a lien may be claimed if not paid.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify claimant, owner, and general contractor with addresses.',
      'Describe the property and the labor or materials furnished.',
      'State the contract price or amount owed for the work.',
      'Advise that payment is expected within statutory timelines.'
    ],
    deadlineDays: 30,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Alaska': {
    title: 'NOTICE OF RIGHT TO LIEN',
    subtitle: 'Alaska Stat. § 34.35.064 Notice',
    warningText: 'IMPORTANT: This notice preserves the right to claim a lien for labor, services, equipment, or materials furnished to this project.',
    legalNotice: 'Under Alaska law, a claimant should give notice of the right to lien before recording a claim to secure priority. Best practice is to send within 15 days of first furnishing.',
    signatureRequirements: 'Signature of Claimant or Agent',
    additionalClauses: [
      'List the owner and original contractor with addresses.',
      'Describe the labor, services, or materials furnished.',
      'State the amount claimed or estimated contract price.',
      'Provide a property description sufficient for identification.'
    ],
    deadlineDays: 15,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Arkansas': {
    title: 'NOTICE TO OWNER AND CONTRACTOR',
    subtitle: 'Ark. Code § 18-44-115 Preliminary Notice',
    warningText: 'NOTICE: This protects lien rights for labor or materials furnished. It is not itself a lien.',
    legalNotice: 'Claimants must provide written notice to the owner and contractor to preserve lien rights under Ark. Code § 18-44-115.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify the project, owner, contractor, and claimant.',
      'Describe the labor or materials furnished and contract amount.',
      'State that a lien may be claimed if payment is not made.',
      'Reference the 75-day window tied to last furnishing.'
    ],
    deadlineDays: 75,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Connecticut': {
    title: 'NOTICE OF INTENT TO CLAIM A LIEN',
    subtitle: 'Conn. Gen. Stat. § 49-34 Notice',
    warningText: 'NOTICE: This document preserves the right to file a mechanic\'s lien for unpaid labor or materials.',
    legalNotice: 'Under Connecticut law, a notice of intent must be served on the owner to perfect lien rights within statutory periods.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'List the owner and original contractor with addresses.',
      'Describe the property and work furnished.',
      'State the amount claimed for labor or materials.',
      'Serve within 90 days of cessation of furnishing.'
    ],
    deadlineDays: 90,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Delaware': {
    title: 'NOTICE TO OWNER',
    subtitle: 'Del. Code tit. 25 § 2712 Residential Notice',
    warningText: 'NOTICE: This preserves the right to claim a mechanic\'s lien on residential property.',
    legalNotice: 'Delaware requires notice to owner on certain residential projects to maintain lien rights. This is not a lien.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Provide claimant and owner names and addresses.',
      'Identify the work or materials furnished.',
      'State the contract amount or amount due.',
      'Indicate intent to claim a lien if unpaid.'
    ],
    deadlineDays: 60,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Hawaii': {
    title: 'NOTICE OF RIGHT TO LIEN',
    subtitle: 'Haw. Rev. Stat. § 507-45 Notice',
    warningText: 'IMPORTANT: This notice preserves lien rights for work or materials provided to the property.',
    legalNotice: 'A claimant may secure lien rights by notifying the owner and original contractor under HRS § 507-45.',
    signatureRequirements: 'Signature of Claimant or Authorized Agent',
    additionalClauses: [
      'Name the owner and original contractor.',
      'Describe the property and the labor or materials furnished.',
      'State the amount claimed or to become due.',
      'Indicate intent to claim a lien if unpaid.'
    ],
    deadlineDays: 45,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Idaho': {
    title: 'PRELIMINARY NOTICE',
    subtitle: 'Idaho Code § 45-507 Notice',
    warningText: 'NOTICE: This preserves the right to file a mechanic\'s lien for labor, services, or materials furnished.',
    legalNotice: 'Idaho law encourages preliminary notice to owners, lenders, and original contractors to secure lien rights.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify owner, lender (if any), and original contractor.',
      'Describe the property and labor or materials furnished.',
      'Provide estimated amount owed.',
      'State that a lien may be recorded if unpaid.'
    ],
    deadlineDays: 30,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Indiana': {
    title: 'PRE-LIEN NOTICE (RESIDENTIAL)',
    subtitle: 'Ind. Code § 32-28 Pre-Lien Notice',
    warningText: 'NOTICE: This preserves lien rights for residential projects. It is not a lien.',
    legalNotice: 'Certain residential projects require pre-lien notice to the owner to maintain lien rights under Indiana law.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Name the claimant, owner, and hiring party.',
      'Describe the property and the labor or materials provided.',
      'State that the claimant may hold a lien if unpaid.',
      'Reference the 30/60 day timing depending on project type.'
    ],
    deadlineDays: 60,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Iowa': {
    title: 'PRELIMINARY NOTICE (MNLR)',
    subtitle: 'Iowa Code § 572.13A Preliminary Notice',
    warningText: 'NOTICE: Filing this preserves lien rights for labor or materials furnished to the property.',
    legalNotice: 'Iowa requires posting a preliminary notice to the Mechanic\'s Notice and Lien Registry (MNLR) to protect lien rights, especially on residential work.',
    signatureRequirements: 'Electronic submission by Claimant',
    additionalClauses: [
      'Provide claimant, owner, and contractor information.',
      'Describe the property and work furnished.',
      'File electronically to the MNLR.',
      'Reference the 10-day best-practice window after first furnishing.'
    ],
    deadlineDays: 10,
    certifiedMailRequired: false,
    notaryRequired: false
  },
  'Kentucky': {
    title: 'NOTICE OF FURNISHING',
    subtitle: 'Ky. Rev. Stat. § 376.010 Notice',
    warningText: 'NOTICE: This preserves lien rights for labor or materials furnished on owner-occupied residential property.',
    legalNotice: 'Under Kentucky law, notice of furnishing should be given on certain residential projects to maintain lien rights.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Name the owner and claimant with addresses.',
      'Describe the property and the work or materials provided.',
      'State the amount claimed or contract price.',
      'Send within the 75-day period tied to last furnishing.'
    ],
    deadlineDays: 75,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Louisiana': {
    title: 'NOTICE OF NONPAYMENT',
    subtitle: 'La. Rev. Stat. § 9:4802 Notice',
    warningText: 'NOTICE: This notifies the owner/contractor of unpaid amounts and preserves privilege rights. It is not a lien.',
    legalNotice: 'Louisiana requires timely notice of nonpayment in many situations to preserve lien/privilege rights, especially for residential suppliers.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify claimant, owner, and contractor.',
      'Describe the property and unpaid labor or materials.',
      'State the amount due and months unpaid.',
      'Indicate intent to preserve privileges if unpaid.'
    ],
    deadlineDays: 30,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Maryland': {
    title: 'NOTICE TO OWNER',
    subtitle: 'Md. Real Prop. § 9-104 Notice',
    warningText: 'NOTICE: This preserves the right to file a mechanic\'s lien for unpaid work.',
    legalNotice: 'Subcontractors and suppliers must send notice to the owner within 120 days after work to maintain lien rights under Maryland law.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'List owner and hiring party with addresses.',
      'Describe the building, work, and amount due.',
      'State intent to claim a lien if unpaid.',
      'Reference the 120-day service window after last work.'
    ],
    deadlineDays: 120,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Massachusetts': {
    title: 'NOTICE OF IDENTIFICATION / CONTRACT',
    subtitle: 'Mass. Gen. Laws ch. 254 Notice',
    warningText: 'NOTICE: This preserves lien rights under Massachusetts mechanic\'s lien law. It is not a lien.',
    legalNotice: 'Subs must serve a Notice of Identification and record required documents to maintain lien rights under M.G.L. c.254.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify the project, owner, GC, and claimant.',
      'State contract amount and description of work.',
      'Serve/record within the statutory period (often 30 days of first furnishing for Notice of ID).',
      'Include statutory language required by c.254.'
    ],
    deadlineDays: 30,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Minnesota': {
    title: 'PRE-LIEN NOTICE',
    subtitle: 'Minn. Stat. § 514.011 Warning',
    warningText: 'IMPORTANT NOTICE: This notice is required by Minnesota law and must appear in contracts or invoices to preserve lien rights.',
    legalNotice: 'Subs and suppliers must provide the statutory pre-lien notice text to owners to maintain lien rights under Minn. Stat. § 514.011.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Include the statutory warning language in contracts or first invoices.',
      'Identify the owner and the property.',
      'Describe the services, labor, or materials furnished.',
      'State that a lien may be claimed if unpaid.'
    ],
    deadlineDays: 45,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Mississippi': {
    title: 'PRE-LIEN NOTICE',
    subtitle: 'Miss. Code § 85-7-409 Notice',
    warningText: 'NOTICE: This is required before filing a lien on certain owner-occupied residences.',
    legalNotice: 'Mississippi requires a 10-day pre-lien notice for owner-occupied residential projects before recording a lien.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify owner and claimant with addresses.',
      'Describe the property and work performed.',
      'State the amount due and intent to file a lien if unpaid.',
      'Serve at least 10 days before filing the lien.'
    ],
    deadlineDays: 10,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Missouri': {
    title: 'NOTICE TO OWNER / 10-DAY NOTICE',
    subtitle: 'RSMo § 429 Notice',
    warningText: 'NOTICE: This notice is required before filing a lien and informs the owner of unpaid work.',
    legalNotice: 'Missouri law requires notice to owner (and GC for certain projects) prior to filing a lien, including the 10-day notice.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Provide owner, GC, and claimant names and addresses.',
      'Describe the property and work furnished.',
      'State the amount due and that a lien will be filed if unpaid.',
      'Serve at least 10 days before recording the lien.'
    ],
    deadlineDays: 10,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Montana': {
    title: 'NOTICE OF RIGHT TO CLAIM A LIEN',
    subtitle: 'Mont. Code § 71-3-531 Notice',
    warningText: 'NOTICE: This preserves the right to claim a construction lien for labor or materials furnished.',
    legalNotice: 'Montana allows notice of right to claim a lien; timely service secures priority especially when a notice of completion is filed.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'List owner and hiring party.',
      'Describe the property and work/materials.',
      'State the amount owed or contract price.',
      'Serve within 20 days of first furnishing when a notice of completion is expected.'
    ],
    deadlineDays: 20,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Nebraska': {
    title: 'NOTICE OF RIGHT TO ASSERT A LIEN',
    subtitle: 'Neb. Rev. Stat. § 52-1309 Notice',
    warningText: 'NOTICE: This preserves the right to claim a construction lien on this property.',
    legalNotice: 'Nebraska permits notice of right to assert a lien; best practice is within 20 days of first furnishing.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify owner and claimant.',
      'Provide property description and work performed.',
      'State the amount claimed or contract price.',
      'Advise that a lien may be recorded if unpaid.'
    ],
    deadlineDays: 20,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'New Jersey': {
    title: 'NOTICE OF UNPAID BALANCE',
    subtitle: 'N.J. Lien Law Residential NUB',
    warningText: 'NOTICE: This alerts the owner and contractor of unpaid balances and preserves lien rights on residential construction.',
    legalNotice: 'A Notice of Unpaid Balance and Right to File Lien must be served/recorded on residential projects before filing a lien under New Jersey law.',
    signatureRequirements: 'Signature of Claimant (often notarized)',
    additionalClauses: [
      'Identify owner, contractor, and claimant.',
      'Describe the property and work performed.',
      'State the contract price, payments made, and balance due.',
      'Serve/record and arbitrate per statutory timelines prior to filing the lien.'
    ],
    deadlineDays: 60,
    certifiedMailRequired: true,
    notaryRequired: true
  },
  'New Mexico': {
    title: 'PRELIMINARY NOTICE OF RIGHT TO CLAIM LIEN',
    subtitle: 'N.M. Stat. § 48-2-2 Notice',
    warningText: 'NOTICE: This preserves the right to claim a mechanic\'s lien for unpaid labor or materials.',
    legalNotice: 'Subcontractors and suppliers must serve preliminary notice to the owner and original contractor within 60 days of first furnishing under New Mexico law.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Provide owner, original contractor, and claimant details.',
      'Describe the property and work performed.',
      'State the amount owed and that a lien may be claimed.',
      'Serve within 60 days of first furnishing for subs/suppliers.'
    ],
    deadlineDays: 60,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'North Carolina': {
    title: 'NOTICE TO LIEN AGENT',
    subtitle: 'N.C. Gen. Stat. § 44A-11.2 Notice',
    warningText: 'NOTICE: Filing with the Lien Agent preserves lien rights. This is not a lien.',
    legalNotice: 'Claimants should file a Notice to Lien Agent via LiensNC within 15 days of first furnishing for best protection.',
    signatureRequirements: 'Electronic submission by Claimant',
    additionalClauses: [
      'Submit through the LiensNC portal identifying owner, contractor, and property.',
      'Describe the labor, services, or materials furnished.',
      'Maintain proof of electronic filing and receipt.',
      'File within 15 days of first furnishing when possible.'
    ],
    deadlineDays: 15,
    certifiedMailRequired: false,
    notaryRequired: false
  },
  'Oklahoma': {
    title: 'PRE-LIEN NOTICE',
    subtitle: 'Okla. Stat. tit. 42 § 142.6 Notice',
    warningText: 'NOTICE: This is required for certain commercial projects to preserve lien rights. It is not a lien.',
    legalNotice: 'Oklahoma requires pre-lien notice to the owner and GC on qualifying projects (generally over $10,000) within 75 days of last furnishing.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'List owner, GC, and claimant with addresses.',
      'Describe the property and unpaid labor or materials.',
      'State the amount due and intent to file a lien if unpaid.',
      'Serve within 75 days of last furnishing for covered projects.'
    ],
    deadlineDays: 75,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Pennsylvania': {
    title: 'NOTICE OF FURNISHING',
    subtitle: '49 P.S. § 1501.2 Notice (when NOC filed)',
    warningText: 'NOTICE: This preserves lien rights on projects where a Notice of Commencement was filed.',
    legalNotice: 'Pennsylvania requires a Notice of Furnishing within 45 days of first work on projects with a filed Notice of Commencement.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Provide claimant, owner, contractor, and project information.',
      'Describe the labor or materials furnished.',
      'Reference the Notice of Commencement if applicable.',
      'Serve/file within 45 days of first furnishing.'
    ],
    deadlineDays: 45,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Rhode Island': {
    title: 'NOTICE OF POSSIBLE MECHANIC\'S LIEN',
    subtitle: 'R.I. Gen. Laws § 34-28-4.1 Notice',
    warningText: 'NOTICE: This notifies the owner of a possible mechanic\'s lien for unpaid work. It is not itself a lien.',
    legalNotice: 'Rhode Island requires notice to owner to perfect lien rights, often within 200 days of last work on commercial projects.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify owner and hiring party.',
      'Describe the property and work performed.',
      'State the amount due and intent to claim a lien.',
      'Serve by certified mail within the statutory window.'
    ],
    deadlineDays: 200,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'South Carolina': {
    title: 'NOTICE OF FURNISHING LABOR OR MATERIALS',
    subtitle: 'S.C. Code § 29-5-20 Notice',
    warningText: 'NOTICE: This preserves lien rights for labor or materials furnished to this project.',
    legalNotice: 'South Carolina requires timely notice to owner and contractor to protect lien rights; send before filing a lien and within 90 days of last furnishing.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Provide owner, GC, and claimant information.',
      'Describe the property and labor or materials furnished.',
      'State the amount due and that a lien may be filed.',
      'Serve within 90 days of last furnishing before lien filing.'
    ],
    deadlineDays: 90,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Tennessee': {
    title: 'NOTICE OF NONPAYMENT',
    subtitle: 'Tenn. Code § 66-11-145 Notice',
    warningText: 'NOTICE: This monthly notice preserves lien rights for unpaid work. It is not a lien.',
    legalNotice: 'Tennessee requires notice of nonpayment to owner and contractor within 90 days of each month of unpaid work to maintain lien rights.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Identify the months unpaid and the amounts due.',
      'List owner and contractor with project description.',
      'State intent to claim a lien if payment is not made.',
      'Serve by the 90th day from each unpaid month.'
    ],
    deadlineDays: 90,
    certifiedMailRequired: true,
    notaryRequired: false
  },
  'Wisconsin': {
    title: 'NOTICE OF LIEN RIGHTS',
    subtitle: 'Wis. Stat. § 779.02(2) Notice',
    warningText: 'NOTICE TO OWNER: As required by Wisconsin law, claimant hereby notifies you that lien rights are claimed for labor or materials furnished.',
    legalNotice: 'Wisconsin requires preliminary notice to the owner within 60 days of first furnishing for most subs/suppliers to preserve lien rights.',
    signatureRequirements: 'Signature of Claimant',
    additionalClauses: [
      'Include the statutory warning text to the owner.',
      'Identify the owner, claimant, and property.',
      'Describe the labor, services, or materials furnished.',
      'Serve within 60 days of first furnishing to maintain rights.'
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
