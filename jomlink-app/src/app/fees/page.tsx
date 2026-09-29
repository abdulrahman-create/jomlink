import { InfoPage, InfoSection } from "@/components/info-page";
import { FEES, formatMYR } from "@/lib/constants";

export const metadata = {
  title: "Fees & Pricing · Jomlink",
  description:
    "Transparent Jomlink fees: a refundable 10% posting deposit (less a RM10 listing fee on cancellation), full reward settlement on Linker acceptance, a 10% Linker service fee, and a 7-day escrow release window. No hidden charges.",
};

export default function FeesPage() {
  const deposit = Math.round(FEES.POSTING_DEPOSIT_RATE * 100);
  const service = Math.round(FEES.LINKER_SERVICE_FEE_RATE * 100);
  const listingFee = formatMYR(FEES.LISTING_FEE);

  return (
    <InfoPage
      eyebrow="Pricing"
      title="Fees & pricing"
      intro="Jomlink charges two simple, transparent fees. There are no subscriptions and no hidden charges."
      cta={{ href: "/opportunities/new", label: "Post an opportunity" }}
    >
      <InfoSection title="Posting deposit">
        <p>
          When you post an opportunity, Jomlink charges a{" "}
          <strong className="text-foreground">{deposit}%</strong> posting deposit on
          the reward amount. It is deducted automatically from your wallet. The deposit{" "}
          <strong className="text-foreground">includes</strong> a flat{" "}
          <strong className="text-foreground">{listingFee} listing fee</strong> — the
          listing fee is charged <strong className="text-foreground">inside</strong> the
          deposit, not in addition to it.
        </p>
        <p className="text-sm">
          A {formatMYR(1000)} reward therefore requires {formatMYR(100)} in wallet
          credit to post; {listingFee} of that is the listing fee and{" "}
          {formatMYR(90)} is refundable. Because the {listingFee} sits inside the
          deposit, the minimum reward is {formatMYR(FEES.MIN_OPPORTUNITY_REWARD)}.
        </p>
        <p className="text-sm">
          <strong className="text-foreground">What happens to the deposit:</strong> if
          you cancel <em>before a Linker is selected</em>, {formatMYR(90)} of a{" "}
          {formatMYR(100)} deposit is refunded and the {listingFee} listing fee is
          retained. On successful completion the whole deposit is consumed. After a
          Linker is selected, a failure or expiry refunds only the reward — the deposit
          is consumed.
        </p>
      </InfoSection>

      <InfoSection title="Reward settlement">
        <p>
          The reward itself is <strong className="text-foreground">not</strong> charged
          when you post. It is only settled when you{" "}
          <strong className="text-foreground">accept a Linker&apos;s submission</strong>.
          At that point your wallet must hold the full agreed reward, which is then held
          in escrow until the connection is verified complete.
        </p>
        <p className="text-sm">
          A {formatMYR(1000)} reward requires {formatMYR(1000)} in wallet credit at the
          moment you accept a Linker.
        </p>
      </InfoSection>

      <InfoSection title="Linker service fee">
        <p>
          When a connection completes and the reward is released, Jomlink deducts a{" "}
          <strong className="text-foreground">{service}%</strong> service fee from the
          Linker&apos;s payout.
        </p>
        <p className="text-sm">
          A {formatMYR(1000)} reward pays the Linker{" "}
          {formatMYR(1000 * (1 - FEES.LINKER_SERVICE_FEE_RATE))} net after the{" "}
          {formatMYR(1000 * FEES.LINKER_SERVICE_FEE_RATE)} service fee.
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

      <InfoSection title="Refunds &amp; cancellation">
        <p>
          If you cancel a posted opportunity <strong className="text-foreground">before
          a Linker is selected</strong>, your {deposit}% posting deposit is refunded less
          the {listingFee} listing fee.
        </p>
        <p>
          If an opportunity fails, expires, or is resolved in the Seeker&apos;s favour
          after a dispute, the escrowed <strong>reward</strong> is refunded to the
          Seeker. Once a Linker has been selected, the posting deposit is consumed (it is
          no longer refundable).
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
