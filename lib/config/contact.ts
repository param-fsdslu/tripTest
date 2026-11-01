/**
 * Triplovia's contact details, for the Contact page, the legal pages' contact card and the footer.
 * (Some older components still repeat these; point them here when you touch them.)
 */
export const CONTACT = {
  email: 'triplovia@gmail.com',
  /** E.164, for tel: links */
  phone: '+919113887712',
  phoneDisplay: '+91 91138 87712',
  /** wa.me number: country code + number, digits only */
  whatsapp: '919113887712',
  address: {
    lines: ['First floor, 612, Honnavar Areangadi Road', 'Near BSNL Office, Hosakuli', 'Uttarakannada, Karnataka – 581334'],
    /** One line, for copy */
    singleLine: 'First floor, 612, Honnavar Areangadi Road, Near BSNL Office, Hosakuli, Uttarakannada, Karnataka – 581334',
  },
  businessType: 'Online travel platform',
  gstin: '29AAZFT3826C1ZO',
} as const

/** A wa.me link, optionally with a prefilled message */
export function whatsappUrl(text?: string) {
  return `https://wa.me/${CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
