import { InfoPage, InfoSection } from "@/components/info-page";

export const metadata = {
  title: "Prohibited Activities · Jomlink",
  description:
    "Activities that are not permitted on Jomlink, including bribery, corruption, misrepresentation, and any attempt to influence government decisions improperly.",
};

export default function ProhibitedPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Prohibited activities"
      intro="Jomlink exists to facilitate legitimate business introductions. The following activities are strictly prohibited and will result in suspension or removal."
    >
      <InfoSection title="Bribery and corruption">
        <p>
          You may not use Jomlink to offer, request or facilitate any payment or
          benefit intended to improperly influence a decision-maker. This includes any
          attempt to influence government officials, tenders or public-sector
          decisions.
        </p>
      </InfoSection>

      <InfoSection title="Misrepresentation">
        <p>
          You may not claim a relationship you do not have, impersonate another person,
          or misrepresent your authority, position or ability to deliver an
          introduction.
        </p>
      </InfoSection>

      <InfoSection title="Illegal or harmful activity">
        <p>
          Opportunities that involve illegal goods or services, money laundering,
          fraud, sanctions evasion, or harm to any person are not permitted.
        </p>
      </InfoSection>

      <InfoSection title="Government and public sector">
        <p>
          Government and public-sector opportunities are a restricted category. They
          are subject to additional review, and Jomlink does not guarantee any approval,
          licence, tender or contract. Any opportunity that implies a guaranteed
          government outcome is prohibited.
        </p>
      </InfoSection>

      <InfoSection title="Circumvention">
        <p>
          You may not attempt to take a transaction off-platform to avoid fees, or
          otherwise circumvent Jomlink&apos;s escrow, dispute or verification
          processes.
        </p>
      </InfoSection>

      <InfoSection title="Consequences">
        <p>
          Violations may lead to suspension, permanent removal, forfeiture of payouts
          tied to the prohibited activity, and referral to the relevant authorities
          where required by law.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
