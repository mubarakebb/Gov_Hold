import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import { useUpdateProfile } from "@workspace/api-client-react";
import { Shield, CheckCircle2 } from "lucide-react";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

export function ProfileSetup() {
  const { isAuthenticated, isLoading, user, login } = useAuth();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: "",
    state: "",
    lga: "",
  });
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useUpdateProfile();

  if (isLoading) {
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
          <p className="text-muted-foreground">Please log in to complete your profile.</p>
          <button onClick={login} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium">
            Log in
          </button>
        </div>
      </Layout>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.phone.trim() || !form.state || !form.lga.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    try {
      await updateProfile.mutateAsync({ data: form });
      navigate("/profile");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground text-sm">
            Help us route your reports to the right officials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name <span className="text-destructive">*</span></label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Emeka"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Okafor"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number <span className="text-destructive">*</span></label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="+234 800 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">State <span className="text-destructive">*</span></label>
            <select
              name="state"
              value={form.state}
              onChange={handleChange}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">Select your state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">LGA <span className="text-destructive">*</span></label>
            <input
              name="lga"
              value={form.lga}
              onChange={handleChange}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Surulere"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {updateProfile.isPending ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Save Profile
          </button>
        </form>
      </div>
    </Layout>
  );
}
