import POLICIES from '../legal.json'

// Public policy pages (no login needed). Play Store, App Store and Razorpay
// all ask for these links: /privacy /terms /refund /shipping /contact /delete-account
export const BUSINESS = {
  name: 'Mana Bazar',
  owner: 'Prashanthi Pamarthi',
  address: 'Flat 705, 7th Floor, Tower B07, Sahabhavana Township, Beside DMart, Anand Nagar Circle, Bandlaguda, Nagole, Hyderabad, Telangana 500068',
  phone: '+91 96661 83665',
  phoneRaw: '919666183665',
  email: 'pavan.mynam@gmail.com',
  hours: '9 AM – 9 PM, all days',
}
const UPDATED = '27 November 2026'

export const LEGAL_PAGES = [
  ['privacy', 'Privacy Policy'], ['terms', 'Terms & Conditions'], ['refund', 'Cancellation & Refund'],
  ['shipping', 'Shipping & Delivery'], ['contact', 'Contact us'], ['delete-account', 'Delete account'],
]

export function legalSlugFromPath(path) {
  const slug = (path || '').replace(/^\/+|\/+$/g, '').toLowerCase()
  return LEGAL_PAGES.some(([s]) => s === slug) ? slug : null
}

export function LegalLinks() {
  return (
    <div className="legal-links">
      {LEGAL_PAGES.map(([s, t]) => <a key={s} href={`/${s}`}>{t}</a>)}
    </div>
  )
}

export default function Legal({ slug }) {
  const doc = POLICIES.find((p) => p.slug === slug)
  return (
    <div className="legal">
      <a className="legal-brand" href="/">🛍️ <b>Mana Bazar</b></a>
      {doc && (
        <>
          <h1>{doc.title}</h1>
          <small className="muted">Last updated: {UPDATED}</small>
          {doc.intro && <p dangerouslySetInnerHTML={{ __html: doc.intro }} />}
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.p.map((t, i) => <p key={i} dangerouslySetInnerHTML={{ __html: t }} />)}
            </section>
          ))}
          <p>Questions? See <a href="/contact">Contact us</a>.</p>
        </>
      )}
      {slug === 'contact' && <Contact />}
      {slug === 'delete-account' && <DeleteAccount />}
      <LegalLinks />
    </div>
  )
}

function Contact() {
  return (
    <>
      <h1>Contact us &amp; Grievance Officer</h1>
      <p>We are happy to help with orders, refunds, account problems and complaints.</p>
      <table className="legal-table">
        <tbody>
          <tr><th>Business</th><td>{BUSINESS.name} (proprietor: {BUSINESS.owner})</td></tr>
          <tr><th>Address</th><td>{BUSINESS.address}</td></tr>
          <tr><th>Phone / WhatsApp</th><td><a href={`tel:+${BUSINESS.phoneRaw}`}>{BUSINESS.phone}</a></td></tr>
          <tr><th>Email</th><td><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></td></tr>
          <tr><th>Support hours</th><td>{BUSINESS.hours}</td></tr>
          <tr><th>Grievance Officer</th><td>{BUSINESS.owner}, Proprietor · {BUSINESS.email}</td></tr>
        </tbody>
      </table>
      <p>As required by the Consumer Protection (E-Commerce) Rules, 2020, we acknowledge every complaint within <b>48 hours</b> and aim to resolve it within <b>one month</b>.</p>
    </>
  )
}

export function deletionRequestLinks(phone = '') {
  const body = `Please delete my Mana Bazar account.\nRegistered mobile number: ${phone}`
  return {
    mail: `mailto:${BUSINESS.email}?subject=${encodeURIComponent('Delete my Mana Bazar account')}&body=${encodeURIComponent(body)}`,
    whatsapp: `https://wa.me/${BUSINESS.phoneRaw}?text=${encodeURIComponent(body)}`,
  }
}

function DeleteAccount() {
  const l = deletionRequestLinks()
  return (
    <>
      <h1>Delete your Mana Bazar account</h1>
      <p>You can ask us to delete your account and personal data at any time. This works for customers, shop owners and delivery partners.</p>
      <h2>How to request</h2>
      <ol>
        <li>In the app: open <b>Profile → Delete my account</b>, or</li>
        <li>Send an email to <a href={l.mail}>{BUSINESS.email}</a> or a WhatsApp message to <a href={l.whatsapp}>{BUSINESS.phone}</a> from your registered mobile number, with the subject "Delete my Mana Bazar account".</li>
      </ol>
      <h2>What happens</h2>
      <ul>
        <li>We confirm the request and delete your account within <b>7 days</b>.</li>
        <li>Deleted: your login, name, phone number, saved address and location. Shop owners: shop listing, products and KYC documents.</li>
        <li>Kept: order and payment records needed for tax and legal reasons (usually up to 8 years), with your name removed where the law allows.</li>
      </ul>
    </>
  )
}
