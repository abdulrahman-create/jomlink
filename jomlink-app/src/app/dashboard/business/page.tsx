import { getCurrentUser } from "@/lib/auth";
import { getBusinessProfiles } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BusinessSection } from "./business-section";

export const metadata = { title: "My Business" };

export default async function BusinessPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const businessProfiles = await getBusinessProfiles(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Business</h1>
        <p className="mt-1 text-muted-foreground">
          Set how you use Jomlink and add business context for your opportunities.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account role</CardTitle>
          <CardDescription>
            One account, multiple roles. You can be a Seeker, a Linker, or both.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessSection items={businessProfiles} currentRole={user.role} />
        </CardContent>
      </Card>
    </div>
  );
}