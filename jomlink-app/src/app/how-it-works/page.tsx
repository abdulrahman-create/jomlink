import { InfoPage, InfoSection } from "@/components/info-page";
import { FEES, formatMYR } from "@/lib/constants";

export const metadata = {
  title: "How it works · Jomlink",
  description:
    "How Jomlink connects Seekers who need access with Linkers who can open the right doors — from posting an opportunity to releasing payment.",
};

const STEPS = [
  {
    title: "1. A Seeker posts an opportunity",
    body: "Describe who you need to reach, why, and the outcome you want. Set a reward and pay a 10% posting deposit from your wallet (which includes the RM10 listing fee). The reward itself is not charged yet.",
  },
  {
    title: "2. Linkers propose introductions",
    body: "Members with a genuine relationship to the target submit a proposal: how they will make the introduction, what they will deliver, and their reward. They declare the basis of their relationship.",
  },
  {
    title: "3. The Seeker selects a Linker",
    body: "Compare proposals, negotiate terms, and select the Linker you trust. The agreed reward and deliverable are locked in, and the full reward is placed into escrow from your wallet.",
  },
  {
    title: "4. The introduction happens",
    body: "An appointment is scheduled and acknowledged. The Linker makes the introduction and submits evidence of the connection.",
  },
  {
    title: "5. Completion and payment",
    body: "The Linker submits evidence and the Seeker confirms it. Jomlink then verifies the completion before releasing the reward — so no single party controls payment. Jomlink deducts a 10% service fee from the Linker's payout.",
  },
];

export default function HowItWorksPage() {
  return (
    <InfoPage
      eyebrow="Platform"
      title="How Jomlink works"
      intro="Jomlink is a marketplace for business introductions. We connect Seekers who need access with Linkers who have the professional relationships to open the right doors."
      cta={{ href: "/marketplace", label: "Browse opportunities" }}
    >
      <InfoSection title="The core idea">
        <p>
          An opportunity for an introduction — not a guaranteed outcome. Jomlink
          facilitates the connection; it does not promise that a deal, tender or
          approval will follow.
        </p>
      </InfoSection>

      <InfoSection title="The journey, step by step">
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.title} className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-sm">{s.body}</p>
            </li>
          ))}
        </ol>
      </InfoSection>

      <InfoSection title="Fees at a glance">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Posting deposit:{" "}
            <strong className="text-foreground">
              {Math.round(FEES.POSTING_DEPOSIT_RATE * 100)}%
            </strong>{" "}
            of the reward, deducted from your wallet when you post. Refundable less a{" "}
            {formatMYR(FEES.LISTING_FEE)} listing fee if you cancel before a Linker is
            selected.
          </li>
          <li>
            Reward settlement: the full reward is charged only when you{" "}
            <strong className="text-foreground">accept a Linker</strong>, then held in
            escrow until completion.
          </li>
          <li>
            Linker service fee:{" "}
            <strong className="text-foreground">
              {Math.round(FEES.LINKER_SERVICE_FEE_RATE * 100)}%
            </strong>{" "}
            of the reward, deducted from the payout on completion.
          </li>
          <li>
            Escrow release: after the Seeker confirms and Jomlink verifies the
            completion. A{" "}
            <strong className="text-foreground">{FEES.RELEASE_WAIT_DAYS}-day</strong>{" "}
            safety net applies if a verified connection is not released, unless a
            dispute is raised.
          </li>
        </ul>
        <p className="text-sm">
          Example: a {formatMYR(1000)} reward costs {formatMYR(100)} to post, then{" "}
          {formatMYR(1000)} when you accept a Linker, and pays the Linker{" "}
          {formatMYR(1000 * (1 - FEES.LINKER_SERVICE_FEE_RATE))} net on completion.
        </p>
      </InfoSection>

      <InfoSection title="Trust and safety">
        <p>
          Members can earn a verified badge, build a reputation from completed
          introductions, and raise a dispute if something goes wrong. Funds are held
          in escrow until the outcome is settled.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
