import type { Metadata } from "next"
import LegalShell from "@/components/legal-shell"
import { LEGAL_UPDATED, SITE_NAME } from "@/lib/legal"

export const metadata: Metadata = {
  title: `Disclaimer · ${SITE_NAME}`,
  description: "Accuracy, measurement method, and liability limits for SpeedyCheck.",
}

export default function DisclaimerPage() {
  return (
    <LegalShell title="Disclaimer">
      <p className="mb-8 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>

      <h2>Speed figures are estimates</h2>
      <p>
        {SITE_NAME} reports an estimate of throughput and latency to Cloudflare&apos;s anycast network from your current
        connection. It is not a laboratory measurement and is not guaranteed to match Fast.com, Ookla Speedtest, your
        ISP&apos;s app, or the speed printed on your bill.
      </p>
      <p>Results can differ because of Wi-Fi, VPN, browser, time of day, server choice, and scoring methods.</p>

      <h2>Not professional or legal advice</h2>
      <p>
        Content on this site, including quality labels such as “Fair” or “Excellent”, is for general information only.
        It is not telecom, engineering, or legal advice.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided without warranties of any kind, whether express or implied, including merchantability,
        fitness for a particular purpose, and non-infringement, to the extent permitted by law.
      </p>

      <h2>External links and providers</h2>
      <p>
        Cloudflare, ipwho.is, BigDataCloud, and Vercel are independent. We are not responsible for their availability,
        accuracy, or policies.
      </p>

      <h2>Availability</h2>
      <p>
        We may suspend or change the tool at any time. A failed or incomplete test is not evidence that your ISP is at
        fault or that the tool is defective in a way that creates a claim.
      </p>
    </LegalShell>
  )
}
