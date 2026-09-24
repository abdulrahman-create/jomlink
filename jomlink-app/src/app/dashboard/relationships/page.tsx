import { getCurrentUser } from "@/lib/auth";
import { getRelationships } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RelationshipsSection } from "./relationships-section";

export const metadata = { title: "Relationships" };

export default async function RelationshipsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const relationships = await getRelationships(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Relationships</h1>
        <p className="mt-1 text-muted-foreground">
          Declare the professional relationships you can draw on to facilitate introductions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your network &amp; relationships</CardTitle>
          <CardDescription>
            This is the foundation of Jomlink — it lets Seekers discover that you can help, without exposing private contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RelationshipsSection items={relationships} />
        </CardContent>
      </Card>
    </div>
  );
}