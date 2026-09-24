import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata = {
  title: "Trust & Safety · Jomlink",
  description:
    "How Jomlink protects members: verified badges, relationship declarations, escrow, dispute resolution, and a tamper-resistant audit trail.",
};

export default function TrustSafetyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Trust & Safety"
      intro="Jomlink is built on legitimate professional relationships. These safeguards protect both Seekers and Linkers."
      cta={{ href: "/marketplace", label: "Browse opportunities" }}
    >
      <InfoSection title="Verified members">
        <p>
          Members can complete verification to earn a verified badge. Verification
          status is shown on profiles and proposals so you know who you are dealing
          with.
        </p>
      </InfoSection>

      <InfoSection title="Relationship declarations">
        <p>
          Every Linker must declare the basis of their relationship with the target —
          for example a current or former colleague, client, supplier or advisor.
          Misrepresenting a relationship is a serious breach of our terms.
        </p>
      </InfoSection>

      <InfoSection title="Escrow protection">
        <p>
          Rewards are held in escrow, not paid directly. Funds only move when a
          connection completes, or when a dispute is resolved. This protects Seekers
          from paying for introductions that never happen, and Linkers from doing the
          work without payment.
        </p>
      </InfoSection>

      <InfoSection title="Disputes">
        <p>
          Either party can raise a dispute on a connection. Raising a dispute
          immediately places the payout on hold. Our dispute team reviews the evidence
          and resolves the outcome — full release, full refund, or a partial
          settlement.
        </p>
      </InfoSection>

      <InfoSection title="Reputation and reviews">
        <p>
          Completed introductions build a public reputation: success rate, ratings and
          response rate. Repeated cancellations or disputes are reflected in a
          member&apos;s standing.
        </p>
      </InfoSection>

      <InfoSection title="Audit trail">
        <p>
          Sensitive and financial actions are recorded in a tamper-resistant audit log.
          This supports accountability and helps us investigate misuse.
        </p>
      </InfoSection>

      <InfoSection title="Report a concern">
        <p>
          If you believe a member is misusing the platform, raise a dispute on the
          relevant connection or contact our support team. We take all reports
          seriously.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
