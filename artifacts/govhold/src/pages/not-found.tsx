import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center px-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-border shadow-xl shadow-black/5 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">404</h1>
          <h2 className="text-xl font-bold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The civic page or report you are looking for doesn't exist or has been removed.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
}
