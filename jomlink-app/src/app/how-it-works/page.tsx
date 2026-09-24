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
    body: "Describe who you need to reach, why, and the outcome you want. Set a reward and fund it into escrow. Jomlink charges a 10% activation fee on the reward.",
  },
  {
    title: "2. Linkers propose introductions",
    body: "Members with a genuine relationship to the target submit a proposal: how they will make the introduction, what they will deliver, and their reward. They declare the basis of their relationship.",
  },
  {
    title: "3. The Seeker selects a Linker",
    body: "Compare proposals, negotiate terms, and select the Linker you trust. The agreed reward and deliverable are locked in.",
  },
  {
    title: "4. The introduction happens",
    body: "An appointment is scheduled and acknowledged. The Linker makes the introduction and submits evidence of the connection.",
  },
  {
    title: "5. Completion and payment",
    body: "Once the connection is confirmed complete, the reward is released to the Linker after a 7-day hold. Jomlink deducts a 3% service fee from the payout.",
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
            Seeker activation fee:{" "}
            <strong className="text-foreground">
              {Math.round(FEES.ACTIVATION_FEE_RATE * 100)}%
            </strong>{" "}
            of the reward, paid when funding the opportunity.
          </li>
          <li>
            Linker service fee:{" "}
            <strong className="text-foreground">
              {Math.round(FEES.LINKER_SERVICE_FEE_RATE * 100)}%
            </strong>{" "}
            of the reward, deducted from the payout on completion.
          </li>
          <li>
            Escrow release:{" "}
            <strong className="text-foreground">{FEES.RELEASE_WAIT_DAYS} days</strong>{" "}
            after completion, unless a dispute is raised.
          </li>
        </ul>
        <p className="text-sm">
          Example: a {formatMYR(1000)} reward costs the Seeker {formatMYR(1100)} to
          fund, and pays the Linker {formatMYR(970)} net on completion.
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
