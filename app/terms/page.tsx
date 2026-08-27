import type { Metadata } from "next"
import LegalShell from "@/components/legal-shell"
import { LEGAL_UPDATED, SITE_NAME } from "@/lib/legal"

export const metadata: Metadata = {
  title: `Terms of Use · ${SITE_NAME}`,
  description: "Terms for using the SpeedyCheck internet speed test.",
}

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <p className="mb-8 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      <p>
        By using {SITE_NAME} you agree to these terms. If you do not agree, do not use the site or the installed app.
      </p>
      <p className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
        These terms are a practical baseline for a free browser tool. They are not a substitute for advice from a lawyer
        in your country.
      </p>

      <h2>The service</h2>
      <p>
        {SITE_NAME} estimates download speed, upload speed, latency, jitter, and packet loss between your device and
        Cloudflare&apos;s network. It is provided free of charge, “as is”, and may change or stop without notice.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not abuse, overload, or attack the test endpoints or this website</li>
        <li>Do not attempt to reverse engineer the service to disrupt others</li>
        <li>Do not use the service to violate law or third-party terms (including Cloudflare&apos;s)</li>
        <li>Automated scraping or high-frequency testing that harms the service is not allowed</li>
      </ul>

      <h2>No ISP contract</h2>
      <p>
        Results are not a promise from your internet provider. Advertised “up to” speeds, peak-hour congestion, Wi-Fi,
        VPN, and device limits all affect numbers. {SITE_NAME} is not a party to your broadband contract and does not
        provide evidence that is guaranteed to be accepted in a dispute.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The {SITE_NAME} name, layout, and graphics are provided for use of this application. You may share your own
        result cards and comparison PDFs. You may not copy the product as a competing service in a way that infringes
        rights in the code or branding without permission.
      </p>

      <h2>Third-party services</h2>
      <p>
        Tests depend on Cloudflare and other networks we do not control. Outages or blocking on those networks can make
        tests fail or look slow.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent allowed by law, the operator of {SITE_NAME} is not liable for lost profits, lost data,
        business interruption, or inaccurate speed readings. Where liability cannot be excluded, it is limited to the
        amount you paid us for the service in the 12 months before the claim (which is zero if the service is free).
      </p>
      <p>
        Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or any
        liability that cannot be limited under applicable law.
      </p>

      <h2>Governing law</h2>
      <p>
        If you use this site as a consumer, mandatory consumer laws in your country still apply. Otherwise, these terms
        are governed by the laws of the place where the site operator is established, and courts there have exclusive
        jurisdiction, except where the law requires otherwise.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top will change. Continued use after an update is acceptance of the new terms.</p>
    </LegalShell>
  )
}
