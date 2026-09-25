import { getCurrentUser } from "@/lib/auth";
import { getProfileByUserId, getEmployment } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "./profile-form";
import { EmploymentSection } from "./employment-form";
import { BasicDetailsForm } from "./basic-details-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  const employment = profile ? await getEmployment(profile.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Professional Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Help others understand who you are and what you do.
          </p>
        </div>
        <Badge variant={user.profile?.verifiedBadge ? "verified" : "outline"}>
          {user.profile?.verifiedBadge ? "Verified" : user.profile?.verificationStatus ?? "UNVERIFIED"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic details</CardTitle>
        </CardHeader>
        <CardContent>
          <BasicDetailsForm
            photoUrl={user.profilePhotoUrl}
            fullName={user.fullName ?? ""}
            mobile={user.mobile}
            country={user.country}
            location={user.location}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About you</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work experience</CardTitle>
        </CardHeader>
        <CardContent>
          <EmploymentSection items={employment} />
        </CardContent>
      </Card>
    </div>
  );
}