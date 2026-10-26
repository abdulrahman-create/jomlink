import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeaderWithUser } from "@/components/site-header-with-user";
import { SiteFooter } from "@/components/site-footer";
import { OpportunityForm } from "./opportunity-form";

export const metadata = { title: "Post an Opportunity · Jomlink" };

export default async function NewOpportunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/opportunities/new");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderWithUser />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Post an Opportunity</h1>
          <p className="mt-2 text-muted-foreground">
            Describe who you need to reach and what a successful introduction looks like.
          </p>
        </div>
        <OpportunityForm defaultCountry={user.country} />
      </main>
      <SiteFooter />
    </div>
  );
}