import type { Metadata } from "next"
import LegalShell from "@/components/legal-shell"
import { LEGAL_UPDATED, SITE_NAME } from "@/lib/legal"

export const metadata: Metadata = {
  title: `Cookie Policy · ${SITE_NAME}`,
  description: "Cookies and local storage used by SpeedyCheck.",
}

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy">
      <p className="mb-8 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      <p>
        This policy explains how {SITE_NAME} uses cookies, similar technologies, and browser storage. It should be read
        with the Privacy Policy.
      </p>

      <h2>Do we use cookies?</h2>
      <p>
        The speed-test UI itself does not set advertising cookies. Preferences and history are stored with{" "}
        <strong>localStorage</strong> on your device, which is similar to a cookie for legal purposes in many
        jurisdictions.
      </p>
      <p>
        If you accept optional analytics, <strong>Vercel Analytics</strong> may set or read cookies or similar
        identifiers according to Vercel&apos;s documentation.
      </p>

      <h2>Necessary storage</h2>
      <p>These items are needed for the product to work as you configured it:</p>
      <ul>
        <li>
          <code>speedTestHistory</code> — last speed tests
        </li>
        <li>
          <code>speedycheck-speed-unit</code> — Mbps vs MB/s
        </li>
        <li>
          <code>speedycheck-plan-mbps</code> — plan comparison
        </li>
        <li>
          <code>speedycheck-location</code> — optional city label
        </li>
        <li>
          <code>speedycheck-pwa-asked</code> — whether the install prompt was shown
        </li>
        <li>
          <code>speedycheck-cookie-consent</code> — your cookie choice
        </li>
        <li>Service worker cache for the app shell if you install or load the PWA</li>
      </ul>
      <p>You can remove these by clearing this site&apos;s data in your browser or by using Clear history in Settings where available.</p>

      <h2>Optional analytics</h2>
      <p>
        Only if you tap <strong>Accept all</strong>. Used to count visits and basic usage. Choose{" "}
        <strong>Necessary only</strong> to skip this. You can clear site data and reload to see the banner again.
      </p>

      <h2>Third-party cookies</h2>
      <p>
        Requests to Cloudflare, ipwho.is, and BigDataCloud may allow those companies to set or read their own cookies
        when your browser calls their servers. We do not control that.
      </p>

      <h2>Managing cookies</h2>
      <p>
        Most browsers let you block or delete cookies and site storage. Blocking all storage may reset your history and
        settings on each visit.
      </p>
    </LegalShell>
  )
}
