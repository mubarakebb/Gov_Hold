import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetProfile, useGetUserStats } from "@workspace/api-client-react";
import { User, MapPin, Phone, Building2, FileText, ThumbsUp, Edit, Settings } from "lucide-react";

export function Profile() {
  const { isAuthenticated, isLoading: authLoading, user, login } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: profileLoading } = useGetProfile({
    query: { enabled: isAuthenticated },
  });

  const { data: stats, isLoading: statsLoading } = useGetUserStats(
    user?.id ?? "",
    { query: { enabled: !!user?.id } }
  );

  if (authLoading || profileLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Please log in to view your profile.</p>
          <button onClick={login} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium">
            Log in
          </button>
        </div>
      </Layout>
    );
  }

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user?.email || "User";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 h-28 relative">
            <div className="absolute -bottom-8 left-6">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="avatar" className="w-16 h-16 rounded-full border-4 border-white object-cover shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full border-4 border-white bg-primary-foreground/20 flex items-center justify-center shadow-md">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-12 px-6 pb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="font-display font-bold text-2xl">{fullName}</h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
              <button
                onClick={() => navigate("/profile/setup")}
                className="flex items-center gap-2 text-sm border border-border px-3 py-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                icon={FileText}
                label="Reports Submitted"
                value={statsLoading ? "..." : String(stats?.reportsSubmitted ?? 0)}
                color="blue"
              />
              <StatCard
                icon={ThumbsUp}
                label="Reports Confirmed"
                value={statsLoading ? "..." : String(stats?.reportsConfirmed ?? 0)}
                color="green"
              />
            </div>

            {user?.isAdmin && (
              <div className="border-t border-border pt-5 mb-5">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Administration</h2>
                <Link href="/admin" className="flex items-center gap-3 w-full px-4 py-3 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">Admin Dashboard</p>
                    <p className="text-xs text-muted-foreground">Manage reports and users</p>
                  </div>
                </Link>
              </div>
            )}

            <div className="space-y-3 border-t border-border pt-5">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contact Details</h2>
              {profile?.phone && (
                <InfoRow icon={Phone} label="Phone" value={profile.phone} />
              )}
              {profile?.state && (
                <InfoRow icon={MapPin} label="State" value={profile.state} />
              )}
              {profile?.lga && (
                <InfoRow icon={Building2} label="LGA" value={profile.lga} />
              )}
              {!profile?.phone && !profile?.state && (
                <p className="text-sm text-muted-foreground">No contact details set. <button onClick={() => navigate("/profile/setup")} className="text-primary underline underline-offset-2">Complete your profile.</button></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: "blue" | "green" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-2 opacity-70" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  );
}
