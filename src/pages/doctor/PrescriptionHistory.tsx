import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search } from "lucide-react";

interface PrescriptionRow {
  id: string;
  notes: string | null;
  created_at: string;
  reminders_enabled: boolean;
  patient: { full_name: string; email: string | null } | null;
  medicines: { medicine_name: string; dosage: string }[];
  store_status: { status: string; store_name: string } | null;
}

export default function PrescriptionHistory() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPrescriptions = async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select(`
          id, notes, created_at, reminders_enabled, patient_id,
          prescription_medicines (medicine_name, dosage),
          store_prescriptions (status, store_id)
        `)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        const enriched: PrescriptionRow[] = await Promise.all(
          data.map(async (p) => {
            const { data: patient } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", p.patient_id)
              .single();

            let store_status = null;
            if (p.store_prescriptions?.length > 0) {
              const sp = p.store_prescriptions[0];
              const { data: storeProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", sp.store_id)
                .single();
              store_status = { status: sp.status, store_name: storeProfile?.full_name || "" };
            }

            return {
              id: p.id,
              notes: p.notes,
              created_at: p.created_at,
              reminders_enabled: p.reminders_enabled,
              patient,
              medicines: p.prescription_medicines || [],
              store_status,
            };
          })
        );
        setPrescriptions(enriched);
      }
      setLoading(false);
    };

    fetchPrescriptions();
  }, [user]);

  const filtered = prescriptions.filter(
    (p) =>
      p.patient?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.medicines.some((m) => m.medicine_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Prescription History</h1>
          <p className="text-muted-foreground">All prescriptions you've created</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {search ? "No matching prescriptions found" : "No prescriptions yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {p.patient?.full_name || "Unknown Patient"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {p.store_status && <StatusBadge status={p.store_status.status} />}
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {p.medicines.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{m.medicine_name}</span>
                        <span className="text-muted-foreground">— {m.dosage}</span>
                      </div>
                    ))}
                    {p.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">"{p.notes}"</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
