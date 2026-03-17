import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateReport,
  useUploadReportImage,
  getListReportsQueryKey,
  ReportCategory,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  AlertTriangle,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { cn, formatCoordinate } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  description: z.string().min(10, "Please provide more details (at least 10 characters)"),
  category: z.nativeEnum(ReportCategory, { required_error: "Please select a category" }),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type DuplicateReport = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  imageUrl?: string | null;
  reportersCount?: number;
  submittedBy?: { firstName?: string | null; lastName?: string | null } | null;
};

function formatReporterLabel(report: DuplicateReport): string {
  const name = report.submittedBy?.firstName ?? "Someone";
  const total = report.reportersCount ?? 1;
  if (total === 1) return `Reported by ${name}`;
  return `${name} and ${total - 1} other${total - 1 !== 1 ? "s" : ""}`;
}

export function SubmitReport() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Duplicate detection state
  const [duplicates, setDuplicates] = useState<DuplicateReport[]>([]);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [escalatingId, setEscalatingId] = useState<number | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<{ data: FormValues; imageUrl?: string } | null>(null);

  const createReport = useCreateReport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        toast({ title: "Report Submitted Successfully", description: "Thank you for helping improve your community." });
        setLocation("/");
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Failed to submit report", description: error.message || "An unexpected error occurred." });
      },
    },
  });

  const uploadImage = useUploadReportImage();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", latitude: null, longitude: null },
  });

  const lat = watch("latitude");
  const lng = watch("longitude");
  const watchedTitle = watch("title");
  const watchedCategory = watch("category");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be less than 5MB." });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const captureLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("latitude", position.coords.latitude);
        setValue("longitude", position.coords.longitude);
        setIsLocating(false);
        toast({ title: "Location Captured", description: "Your coordinates have been added to the report." });
      },
      (error) => {
        setIsLocating(false);
        let msg = "Failed to get location.";
        if (error.code === 1) msg = "Location permission denied.";
        else if (error.code === 2) msg = "Position unavailable.";
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  async function checkDuplicates(data: FormValues): Promise<DuplicateReport[]> {
    const params = new URLSearchParams({ category: data.category });
    if (data.latitude) params.set("lat", String(data.latitude));
    if (data.longitude) params.set("lng", String(data.longitude));
    if (data.title) params.set("title", data.title);
    try {
      const res = await fetch(`/api/reports/check-duplicate?${params}`, { credentials: "include" });
      const json = await res.json() as { duplicates: DuplicateReport[] };
      return json.duplicates ?? [];
    } catch {
      return [];
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (!isAuthenticated) {
      login();
      return;
    }

    // Upload image first
    let imageUrl: string | undefined;
    if (selectedFile) {
      try {
        const uploadRes = await uploadImage.mutateAsync({ data: { file: selectedFile } });
        imageUrl = uploadRes.url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to upload image";
        toast({ variant: "destructive", title: "Image upload failed", description: msg });
        return;
      }
    }

    // Check for duplicates
    const found = await checkDuplicates(data);
    if (found.length > 0) {
      setDuplicates(found);
      setPendingSubmitData({ data, imageUrl });
      setShowDuplicatePrompt(true);
      return;
    }

    // No duplicates — submit normally
    await createReport.mutateAsync({ data: { ...data, imageUrl } });
  };

  async function handleEscalate(reportId: number) {
    setEscalatingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/escalate`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json() as { reportersCount?: number; alreadyEscalated?: boolean };
      queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      if (json.alreadyEscalated) {
        toast({ title: "Already escalated", description: "You've already added yourself as a reporter on this issue." });
      } else {
        toast({ title: "Escalated successfully", description: "You've been added as a reporter on this existing issue." });
      }
      setShowDuplicatePrompt(false);
      setLocation("/");
    } catch {
      toast({ variant: "destructive", title: "Escalation failed", description: "Please try again." });
    } finally {
      setEscalatingId(null);
    }
  }

  function handleDiscard() {
    setShowDuplicatePrompt(false);
    setPendingSubmitData(null);
    setDuplicates([]);
  }

  async function handleSubmitAnyway() {
    if (!pendingSubmitData) return;
    setShowDuplicatePrompt(false);
    await createReport.mutateAsync({ data: { ...pendingSubmitData.data, imageUrl: pendingSubmitData.imageUrl } });
  }

  const isWorking = isSubmitting || createReport.isPending || uploadImage.isPending;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Report an Issue</h1>
          <p className="text-muted-foreground">
            Provide details about the infrastructure problem so authorities can address it.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Issue Title</label>
                <input
                  {...register("title")}
                  placeholder="e.g. Deep pothole on Main St"
                  className={cn(
                    "w-full px-4 py-3 bg-secondary/30 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                    errors.title ? "border-destructive" : "border-border"
                  )}
                />
                {errors.title && <p className="mt-1.5 text-sm text-destructive font-medium">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Category</label>
                  <select
                    {...register("category")}
                    className={cn(
                      "w-full px-4 py-3 bg-secondary/30 border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none",
                      errors.category ? "border-destructive" : "border-border"
                    )}
                  >
                    <option value="">Select a category...</option>
                    {Object.values(ReportCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1.5 text-sm text-destructive font-medium">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Location</label>
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={isLocating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all border border-border"
                  >
                    {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    {lat && lng ? "Update Location" : "Use My Location"}
                  </button>
                  {lat && lng ? (
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {formatCoordinate(lat)}, {formatCoordinate(lng)}
                    </p>
                  ) : locationError ? (
                    <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {locationError}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Required for map placement</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  {...register("description")}
                  rows={4}
                  placeholder="Describe the issue, potential hazards, and how long it's been there..."
                  className={cn(
                    "w-full px-4 py-3 bg-secondary/30 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y",
                    errors.description ? "border-destructive" : "border-border"
                  )}
                />
                {errors.description && <p className="mt-1.5 text-sm text-destructive font-medium">{errors.description.message}</p>}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold mb-2">Evidence Photo (Optional)</label>
              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/30 hover:border-primary/50 transition-all group"
                >
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-semibold mb-1">Click to upload photo</h4>
                  <p className="text-xs text-muted-foreground">JPEG, PNG up to 5MB</p>
                </div>
              ) : (
                <div className="relative w-full sm:w-64 aspect-video rounded-xl overflow-hidden border border-border shadow-sm">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
            </div>

            <div className="pt-4 border-t border-border">
              <button
                type="submit"
                disabled={isWorking}
                className="w-full md:w-auto px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2"
              >
                {isWorking ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />{uploadImage.isPending ? "Uploading image..." : "Submitting Report..."}</>
                ) : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Detection Modal */}
      {showDuplicatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-amber-900">This issue may already exist</h2>
                  <p className="text-sm text-amber-700">We found {duplicates.length} similar report{duplicates.length !== 1 ? "s" : ""} in the same area.</p>
                </div>
              </div>
            </div>

            {/* Existing reports list */}
            <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
              {duplicates.map((dup) => (
                <div key={dup.id} className="flex gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                  {dup.imageUrl ? (
                    <img src={dup.imageUrl} alt={dup.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight line-clamp-1">{dup.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dup.description}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatReporterLabel(dup)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEscalate(dup.id)}
                    disabled={escalatingId === dup.id}
                    className="flex-shrink-0 self-center flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {escalatingId === dup.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    Escalate
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <p className="text-xs text-muted-foreground">Escalating adds you as a co-reporter on the existing issue.</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDiscard}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Discard
                </button>
                <button
                  onClick={handleSubmitAnyway}
                  disabled={createReport.isPending}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
