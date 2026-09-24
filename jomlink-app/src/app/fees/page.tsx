import { InfoPage, InfoSection } from "@/components/info-page";
import { FEES, formatMYR } from "@/lib/constants";

export const metadata = {
  title: "Fees & Pricing · Jomlink",
  description:
    "Transparent Jomlink fees: a 10% Seeker activation fee, a 3% Linker service fee, and a 7-day escrow release window. No hidden charges.",
};

export default function FeesPage() {
  const activation = Math.round(FEES.ACTIVATION_FEE_RATE * 100);
  const service = Math.round(FEES.LINKER_SERVICE_FEE_RATE * 100);

  return (
    <InfoPage
      eyebrow="Pricing"
      title="Fees & pricing"
      intro="Jomlink charges two simple, transparent fees. There are no listing fees, no subscription, and no hidden charges."
      cta={{ href: "/opportunities/new", label: "Post an opportunity" }}
    >
      <InfoSection title="Seeker activation fee">
        <p>
          When you fund an opportunity, Jomlink charges a{" "}
          <strong className="text-foreground">{activation}%</strong> activation fee on
          the reward amount. This secures the opportunity and covers platform and
          payment costs.
        </p>
        <p className="text-sm">
          A {formatMYR(1000)} reward therefore requires {formatMYR(1100)} to fund:{" "}
          {formatMYR(1000)} held in escrow plus {formatMYR(100)} activation fee.
        </p>
      </InfoSection>

      <InfoSection title="Linker service fee">
        <p>
          When a connection completes and the reward is released, Jomlink deducts a{" "}
          <strong className="text-foreground">{service}%</strong> service fee from the
          Linker&apos;s payout.
        </p>
        <p className="text-sm">
          A {formatMYR(1000)} reward pays the Linker {formatMYR(970)} net after the{" "}
          {formatMYR(30)} service fee.
        </p>
      </InfoSection>

      <InfoSection title="Escrow and release">
        <p>
          Rewards are held in escrow and released{" "}
          <strong className="text-foreground">{FEES.RELEASE_WAIT_DAYS} days</strong>{" "}
          after the connection is marked complete. This window gives both parties time
          to raise a dispute before funds move.
        </p>
      </InfoSection>

      <InfoSection title="Refunds">
        <p>
          If an opportunity fails, is cancelled, expires, or is resolved in the
          Seeker&apos;s favour after a dispute, the escrowed reward is refunded to the
          Seeker. The activation fee is non-refundable once the opportunity is
          published.
        </p>
      </InfoSection>

      <InfoSection title="Currency">
        <p>
          Jomlink currently operates in Malaysian Ringgit (MYR). Additional currencies
          are planned for future rollout.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
