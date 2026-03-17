import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useAdminListReports,
  useAdminUpdateReport,
  useAdminDeleteReport,
  useAdminListUsers,
  useAdminSetUserAdmin,
} from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Star, StarOff, Trash2, AlertCircle, Clock, CheckCircle2, LogIn, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "open" | "in_progress" | "resolved";

const statusOptions: { value: Status; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const statusBadge: Record<Status, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const statusIcon: Record<Status, React.ElementType> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
};

export function Admin() {
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const [activeTab, setActiveTab] = useState<"reports" | "users">("reports");
  const { data: reports, isLoading, refetch } = useAdminListReports({ query: { enabled: isAdmin } });
  const updateReport = useAdminUpdateReport();
  const deleteReport = useAdminDeleteReport();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useAdminListUsers({ query: { enabled: isAdmin && activeTab === "users" } });
  const setUserAdmin = useAdminSetUserAdmin();

  async function handleStatusChange(id: string, status: Status) {
    await updateReport.mutateAsync({ id, data: { status } });
    refetch();
  }

  async function handleHighlightToggle(id: string, current: boolean) {
    await updateReport.mutateAsync({ id, data: { isHighlighted: !current } });
    refetch();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report permanently? This cannot be undone.")) return;
    setDeletingId(id);
    await deleteReport.mutateAsync({ id });
    setDeletingId(null);
    refetch();
  }

  if (authLoading) {
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <LogIn className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground">You must be logged in to access the admin panel.</p>
          <button onClick={login} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium">
            Log in
          </button>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <Shield className="w-10 h-10 text-muted-foreground" />
          <h2 className="font-display font-bold text-xl">Access Restricted</h2>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="font-display font-bold text-3xl mb-1">Admin Panel</h1>
          <p className="text-muted-foreground">Manage reports and users on the platform.</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "reports" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertCircle className="w-4 h-4" /> Reports
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-4 h-4" /> Users
          </button>
        </div>

        {activeTab === "reports" && (
          isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : !reports?.length ? (
            <div className="text-center py-16 text-muted-foreground">No reports yet.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Title</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Submitted By</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Confirms</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => {
                      const status = (report.status ?? "open") as Status;
                      const StatusIcon = statusIcon[status];
                      const submitter = (report as typeof report & { submittedBy?: { firstName?: string | null; lastName?: string | null } | null }).submittedBy;
                      const submitterName = submitter ? [submitter.firstName, submitter.lastName].filter(Boolean).join(" ") : "Anonymous";

                      return (
                        <tr key={report.id} className={cn("border-b border-border/50 hover:bg-muted/20 transition-colors", report.isHighlighted && "bg-yellow-50/50")}>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="font-medium truncate">{report.title}</p>
                            {report.isHighlighted && (
                              <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">Featured</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-muted">{report.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={status}
                                onChange={(e) => handleStatusChange(String(report.id), e.target.value as Status)}
                                className={cn(
                                  "text-xs font-semibold rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer",
                                  statusBadge[status]
                                )}
                              >
                                {statusOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <StatusIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{submitterName}</td>
                          <td className="px-4 py-3 text-center font-semibold">{report.confirmationsCount ?? 0}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleHighlightToggle(String(report.id), !!report.isHighlighted)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  report.isHighlighted
                                    ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                                    : "hover:bg-muted text-muted-foreground hover:text-yellow-600"
                                )}
                                title={report.isHighlighted ? "Remove highlight" : "Highlight"}
                              >
                                {report.isHighlighted ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDelete(String(report.id))}
                                disabled={deletingId === String(report.id)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                                title="Delete report"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {activeTab === "users" && (
          usersLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : !users?.length ? (
            <div className="text-center py-16 text-muted-foreground">No users found.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                      const isSelf = u.id === user?.id;
                      return (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            {name}
                            {isSelf && <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              disabled={isSelf}
                              onClick={async () => {
                                await setUserAdmin.mutateAsync({ id: u.id, data: { isAdmin: !u.isAdmin } });
                                refetchUsers();
                              }}
                              className={cn(
                                "px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                                u.isAdmin
                                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                              title={isSelf ? "Cannot change your own admin status" : u.isAdmin ? "Revoke admin" : "Grant admin"}
                            >
                              {u.isAdmin ? "Admin" : "User"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
