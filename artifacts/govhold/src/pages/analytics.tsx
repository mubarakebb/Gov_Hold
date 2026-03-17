import { Layout } from "@/components/layout";
import { useGetAnalytics } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, AlertCircle, CheckCircle2, Users } from "lucide-react";

export function Analytics() {
  const { data, isLoading } = useGetAnalytics();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-1">Analytics</h1>
          <p className="text-muted-foreground">Platform-wide statistics and trends.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={FileText} label="Total Reports" value={data?.totalReports ?? 0} color="blue" />
              <StatCard icon={AlertCircle} label="Open Reports" value={data?.openReports ?? 0} color="red" />
              <StatCard icon={CheckCircle2} label="Resolved" value={data?.resolvedReports ?? 0} color="green" />
              <StatCard icon={Users} label="Total Users" value={data?.totalUsers ?? 0} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Reports by Category">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data?.reportsByCategory ?? []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                      cursor={{ fill: "#f0f4ff" }}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Reports by State (Submitters)">
                {(data?.reportsByState?.length ?? 0) === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                    No state data yet — users need to complete their profiles.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={(data?.reportsByState ?? []).slice(0, 10)} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                        cursor={{ fill: "#f0f4ff" }}
                      />
                      <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    red: "bg-red-50 border-red-100 text-red-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    purple: "bg-violet-50 border-violet-100 text-violet-700",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color]}`}>
      <Icon className="w-5 h-5 mb-3 opacity-70" />
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs opacity-70 mt-1 font-medium">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}
