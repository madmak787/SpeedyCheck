import type { Metadata } from "next"
import LegalShell from "@/components/legal-shell"
import { LEGAL_UPDATED, SITE_NAME } from "@/lib/legal"

export const metadata: Metadata = {
  title: `Privacy Policy · ${SITE_NAME}`,
  description: "How SpeedyCheck handles information when you run an internet speed test.",
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p className="mb-8 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      <p>
        This policy describes how {SITE_NAME} handles information when you use the website or the installed app. We do
        not create user accounts. Speed tests run in your browser.
      </p>
      <p className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
        This text is provided so visitors can see what the product actually does. It is not legal advice. If you operate
        this site commercially, have a lawyer review it and add your legal entity, address, and contact email.
      </p>

      <h2>Who we are</h2>
      <p>
        {SITE_NAME} is a browser-based internet speed test. The operator of this deployment is the person or
        organisation that publishes this website. We do not sell speed-test accounts or paid ISP services through this
        app.
      </p>

      <h2>Information we process</h2>
      <h3>On your device only</h3>
      <p>These items stay in your browser (typically localStorage) and are not uploaded to a {SITE_NAME} account:</p>
      <ul>
        <li>Recent speed-test history (download, upload, ping, jitter, packet loss, time)</li>
        <li>Your preferred speed unit (Mbps or MB/s)</li>
        <li>Optional plan speed you enter for comparison</li>
        <li>Optional city and country you save for labelling results</li>
        <li>Whether we already asked you to install the app</li>
        <li>Your cookie / analytics choice</li>
      </ul>

      <h3>Sent to third parties when you run a test</h3>
      <p>
        A test measures the path between your device and Cloudflare&apos;s network. Your IP address, approximate
        location derived from that IP, and the test traffic itself are processed by those services so the measurement
        can run:
      </p>
      <ul>
        <li>
          <strong>Cloudflare</strong> (<code>speed.cloudflare.com</code>) — download, upload, ping, jitter, packet-loss
          probes, and a diagnostic trace (including colo / country codes)
        </li>
        <li>
          <strong>ipwho.is</strong> — IP lookup used to show ISP and city labels
        </li>
        <li>
          <strong>BigDataCloud</strong> — only if you tap “Use device location”; we send coordinates from your device to
          reverse-geocode a city name
        </li>
      </ul>
      <p>
        We do not operate those services. Their own privacy policies apply to data they receive.
      </p>

      <h3>Optional analytics</h3>
      <p>
        If you choose “Accept all”, we load Vercel Analytics, which may collect visit counts, page views, and coarse
        device or region information. If you choose “Necessary only”, analytics is not loaded.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>No sign-in, email, or password</li>
        <li>No payment card data</li>
        <li>No address book, photos, or files, except a result image or PDF you choose to share or save</li>
        <li>We do not sell personal information</li>
      </ul>

      <h2>Legal bases (EEA / UK)</h2>
      <p>Where GDPR or UK GDPR applies, we rely on:</p>
      <ul>
        <li>
          <strong>Legitimate interests</strong> or <strong>contract</strong> to run the test you requested and store
          local settings
        </li>
        <li>
          <strong>Consent</strong> for optional analytics and for device geolocation
        </li>
      </ul>

      <h2>Retention</h2>
      <p>
        Server-side, {SITE_NAME} does not keep a personal speed-test account. Local history is kept on your device until
        you clear it (up to the last 10 tests). Third parties retain logs according to their own policies.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Clear test history in Settings</li>
        <li>Decline device location; city labels then come only from IP lookup or what you type</li>
        <li>Choose necessary cookies only, or clear site data in your browser</li>
        <li>Uninstall the PWA and delete the site from your browser</li>
      </ul>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or restrict processing of personal
        data, and to lodge a complaint with a supervisory authority.
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is not directed at children under 16. We do not knowingly collect personal information from
        children.
      </p>

      <h2>International transfers</h2>
      <p>
        Cloudflare, IP lookup, geocoding, and (if enabled) Vercel may process data in countries other than yours,
        including the United States. Those providers use their own transfer mechanisms (such as standard contractual
        clauses) where required.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy. The “Last updated” date above will change when we do. Continued use after a change
        means you have seen the new version.
      </p>
    </LegalShell>
  )
}
