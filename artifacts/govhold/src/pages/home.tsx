import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListReports } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ReportCard } from "@/components/report-card";
import { ReportDetailModal } from "@/components/report-detail-modal";
import { Search, Filter, AlertCircle, RefreshCw, ArrowUpDown } from "lucide-react";

const CATEGORIES = ["All", "Road", "Water", "Electricity", "School", "Hospital", "Other"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "confirmations", label: "Most Confirmed" },
];

type ReportWithMeta = ReturnType<typeof useListReports>["data"] extends Array<infer T> ? T : never;

export function Home() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [selectedReport, setSelectedReport] = useState<ReportWithMeta | null>(null);

  const { data: reports, isLoading, isError, refetch } = useListReports({
    category: filterCategory !== "All" ? filterCategory : undefined,
    sort,
  });

  const filteredReports = (reports ?? []).filter((report) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return report.title.toLowerCase().includes(q) || report.description.toLowerCase().includes(q);
  });

  return (
    <Layout>
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-800 opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-4 text-white leading-tight">
              Track Issues. Hold Leaders Accountable.
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 mb-8 max-w-xl leading-relaxed">
              GovHold connects Nigerian citizens with government. Report infrastructure problems, confirm others' reports, and track progress together.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="px-5 py-2.5 bg-white text-primary font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all hover:-translate-y-0.5 text-sm"
              >
                Submit a Report
              </Link>
              <Link
                href="/map"
                className="px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-sm"
              >
                View Map
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-display font-bold">
            {filterCategory !== "All" ? `${filterCategory} Reports` : "All Reports"}
            {reports?.length ? (
              <span className="ml-2 text-base font-normal text-muted-foreground">({filteredReports.length})</span>
            ) : null}
          </h2>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 pl-9 pr-4 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full sm:w-44 pl-9 pr-3 py-2 bg-white border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full sm:w-44 pl-9 pr-3 py-2 bg-white border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-border overflow-hidden">
                <div className="h-48 bg-muted w-full" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-border border-dashed">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-bold mb-2">Failed to load reports</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              We couldn't connect to the GovHold server. Please try again.
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No reports found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {search || filterCategory !== "All"
                ? "No reports match your current filters."
                : "No reports yet. Be the first to submit one!"}
            </p>
            {!search && filterCategory === "All" && (
              <Link href="/submit" className="mt-5 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm">
                Submit a Report
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
              >
                <ReportCard
                  report={report}
                  onClick={(r) => setSelectedReport(r as ReportWithMeta)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <ReportDetailModal
        report={selectedReport as Parameters<typeof ReportDetailModal>[0]["report"]}
        onClose={() => setSelectedReport(null)}
      />
    </Layout>
  );
}
