// This is boilerplate/mock legal text—consult a lawyer for real use.

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Privacy</p>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-600">Last updated: January 03, 2026</p>
        </header>

        <p className="text-sm text-gray-600">We respect your privacy and describe here how we handle information for this mock billing / notice-generation site.</p>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>Account data (email, auth metadata) stored via Supabase authentication.</li>
            <li>Project/notice inputs you choose to submit (names, addresses, descriptions, deadlines).</li>
            <li>Usage/event data for reliability and debugging (logs, device/browser info).</li>
            <li>Minimal cookies/local storage for session continuity and preferences.</li>
          </ul>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">How We Use Information</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>Provide and improve the notice drafting and mock billing experience.</li>
            <li>Authenticate users and secure accounts.</li>
            <li>Troubleshoot performance or abuse, and protect the service.</li>
            <li>Communicate important updates related to the service.</li>
          </ul>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Sharing</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>Service providers (e.g., Supabase, hosting, observability) under appropriate terms.</li>
            <li>Compliance with law, legal process, or to protect rights, property, or safety.</li>
            <li>No selling of personal data.</li>
          </ul>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Cookies & Local Storage</h2>
          <p className="text-sm leading-relaxed">We use minimal cookies/local storage for session continuity and user preferences. You can clear or block them in your browser, but some features may not work.</p>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Security</h2>
          <p className="text-sm leading-relaxed">We use industry-standard measures (HTTPS, access controls) but no system is perfectly secure.</p>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Your Choices & Rights</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>Access, update, or delete your account data via the app or by contacting us.</li>
            <li>Opt out of non-essential communications where offered.</li>
          </ul>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Data Retention</h2>
          <p className="text-sm leading-relaxed">We retain data as needed to operate the service or comply with law, then delete or de-identify it.</p>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">International Users</h2>
          <p className="text-sm leading-relaxed">Data may be processed in the United States or other regions where our providers operate.</p>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-sm leading-relaxed">For privacy questions, contact us at support@example.com.</p>
        </section>

        <section className="space-y-3 text-gray-800">
          <h2 className="text-xl font-semibold">Disclaimers & Liability</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li><strong>AS IS:</strong> Services provided “as is” without warranties of any kind.</li>
            <li><strong>NO LIABILITY:</strong> No liability for damages, losses, or issues arising from use (including direct, indirect, incidental, consequential).</li>
            <li><strong>THIRD PARTIES:</strong> Not liable for user-generated content, third-party services (e.g., Supabase, payments), interruptions, or errors.</li>
            <li><strong>INDEMNITY:</strong> You agree to indemnify and hold harmless the site owners from any claims.</li>
            <li><strong>LIMITATION:</strong> To the maximum extent permitted by law, total liability is capped at $100 or amounts paid, whichever is lower.</li>
          </ul>
        </section>

        <p className="text-xs text-gray-500">This document is provided for convenience only and is not legal advice.</p>
      </div>
    </div>
  )
}
