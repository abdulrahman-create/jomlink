import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

/**
 * Server wrapper around SiteHeader that resolves the logged-in member and
 * passes it down, so public pages show the right auth actions
 * (Dashboard / Post an Opportunity vs Log in / Get Started) without exposing
 * any session logic to the client.
 */
export async function SiteHeaderWithUser() {
  const user = await getCurrentUser();
  return (
    <SiteHeader
      user={
        user
          ? {
              name: user.fullName,
              email: user.email,
              verified: !!user.profile?.verifiedBadge,
            }
          : null
      }
    />
  );
}