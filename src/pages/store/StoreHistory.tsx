import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search } from "lucide-react";

interface HistoryItem {
  id: string;
  patient_name: string;
  doctor_name: string;
  status: string;
  assigned_at: string;
  medicines: { medicine_name: string; dosage: string }[];
}

export default function StoreHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("store_prescriptions")
        .select(`
          id, status, assigned_at,
          prescriptions (
            doctor_id, patient_id,
            prescription_medicines (medicine_name, dosage)
          )
        `)
        .eq("store_id", user.id)
        .eq("status", "given")
        .order("assigned_at", { ascending: false });

      if (data) {
        const enriched: HistoryItem[] = await Promise.all(
          data.map(async (sp) => {
            const presc = sp.prescriptions as any;
            const [dr, pt] = await Promise.all([
              presc?.doctor_id
                ? supabase.from("profiles").select("full_name").eq("id", presc.doctor_id).single()
                : Promise.resolve({ data: null }),
              presc?.patient_id
                ? supabase.from("profiles").select("full_name").eq("id", presc.patient_id).single()
                : Promise.resolve({ data: null }),
            ]);
            return {
              id: sp.id,
              patient_name: pt.data?.full_name || "Unknown",
              doctor_name: dr.data?.full_name || "Unknown",
              status: sp.status,
              assigned_at: sp.assigned_at,
              medicines: presc?.prescription_medicines || [],
            };
          })
        );
        setItems(enriched);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  const filtered = items.filter(
    (i) =>
      i.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      i.doctor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Prescription History</h1>
          <p className="text-muted-foreground">Completed prescriptions</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient or doctor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {search ? "No matching records" : "No completed prescriptions yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{item.patient_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Dr. {item.doctor_name}</p>
                </CardHeader>
                <CardContent>
                  {item.medicines.map((m, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{m.medicine_name}</span>
                      <span className="text-muted-foreground"> — {m.dosage}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
