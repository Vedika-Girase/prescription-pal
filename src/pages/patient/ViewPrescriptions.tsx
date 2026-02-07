import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

interface PrescriptionView {
  id: string;
  doctor_name: string;
  notes: string | null;
  created_at: string;
  medicines: {
    medicine_name: string;
    dosage: string;
    frequency: string;
    timing: string;
    time_of_day: string[];
  }[];
  store_status?: { status: string; store_name: string } | null;
}

export default function ViewPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select(`
          id, notes, created_at, doctor_id,
          prescription_medicines (medicine_name, dosage, frequency, timing, time_of_day),
          store_prescriptions (status, store_id)
        `)
        .eq("patient_id", user.id)
        .not("doctor_id", "is", null)
        .order("created_at", { ascending: false });

      if (data) {
        const enriched: PrescriptionView[] = await Promise.all(
          data.map(async (p) => {
            const { data: doctor } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", p.doctor_id!)
              .single();

            let store_status = null;
            if (p.store_prescriptions?.length > 0) {
              const sp = p.store_prescriptions[0];
              const { data: store } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", sp.store_id)
                .single();
              store_status = { status: sp.status, store_name: store?.full_name || "" };
            }

            return {
              id: p.id,
              doctor_name: doctor?.full_name || "Unknown Doctor",
              notes: p.notes,
              created_at: p.created_at,
              medicines: p.prescription_medicines || [],
              store_status,
            };
          })
        );
        setPrescriptions(enriched);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  const getTimingLabel = (timing: string) => {
    const map: Record<string, string> = {
      before_food: "Before food",
      after_food: "After food",
      with_food: "With food",
      any_time: "Any time",
    };
    return map[timing] || timing;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Prescriptions</h1>
          <p className="text-muted-foreground">Prescriptions from your doctors</p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No prescriptions from doctors yet
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">Dr. {p.doctor_name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {p.store_status && (
                      <div className="text-right">
                        <StatusBadge status={p.store_status.status} />
                        <p className="text-xs text-muted-foreground mt-1">{p.store_status.store_name}</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {p.medicines.map((m, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{m.medicine_name}</span>
                          <span className="text-sm text-muted-foreground">{m.dosage}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.frequency.replace(/_/g, " ")} · {getTimingLabel(m.timing)} · {m.time_of_day.join(", ")}
                        </p>
                      </div>
                    ))}
                    {p.notes && (
                      <p className="text-sm text-muted-foreground italic mt-2">"{p.notes}"</p>
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
