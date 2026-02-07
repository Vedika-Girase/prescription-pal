import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PrescriptionStatus = Database["public"]["Enums"]["prescription_status"];

interface StorePrescription {
  id: string;
  prescription_id: string;
  status: PrescriptionStatus;
  assigned_at: string;
  doctor_name: string;
  patient_name: string;
  medicines: { medicine_name: string; dosage: string; frequency: string }[];
}

export default function StoreDashboard() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<StorePrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("store_prescriptions")
      .select(`
        id, prescription_id, status, assigned_at,
        prescriptions (
          doctor_id, patient_id, notes,
          prescription_medicines (medicine_name, dosage, frequency)
        )
      `)
      .eq("store_id", user.id)
      .order("assigned_at", { ascending: false });

    if (data) {
      const enriched: StorePrescription[] = await Promise.all(
        data.map(async (sp) => {
          const presc = sp.prescriptions as any;
          const [doctorRes, patientRes] = await Promise.all([
            presc?.doctor_id
              ? supabase.from("profiles").select("full_name").eq("id", presc.doctor_id).single()
              : Promise.resolve({ data: null }),
            presc?.patient_id
              ? supabase.from("profiles").select("full_name").eq("id", presc.patient_id).single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            id: sp.id,
            prescription_id: sp.prescription_id,
            status: sp.status,
            assigned_at: sp.assigned_at,
            doctor_name: doctorRes.data?.full_name || "Unknown",
            patient_name: patientRes.data?.full_name || "Unknown",
            medicines: presc?.prescription_medicines || [],
          };
        })
      );
      setPrescriptions(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [user]);

  const updateStatus = async (id: string, newStatus: PrescriptionStatus) => {
    const { error } = await supabase
      .from("store_prescriptions")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${newStatus}`);
      fetchPrescriptions();
    }
  };

  const pendingCount = prescriptions.filter((p) => p.status === "pending").length;
  const readyCount = prescriptions.filter((p) => p.status === "ready").length;
  const givenCount = prescriptions.filter((p) => p.status === "given").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Medical Store Dashboard</h1>
          <p className="text-muted-foreground">Manage incoming prescriptions</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ready</CardTitle>
              <Package className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{readyCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Given</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{givenCount}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No prescriptions assigned yet</div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((sp) => (
              <Card key={sp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">Patient: {sp.patient_name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Dr. {sp.doctor_name} · {new Date(sp.assigned_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={sp.status} />
                      <Select
                        value={sp.status}
                        onValueChange={(val) => updateStatus(sp.id, val as PrescriptionStatus)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">🟡 Pending</SelectItem>
                          <SelectItem value="ready">🟢 Ready</SelectItem>
                          <SelectItem value="given">✅ Given</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {sp.medicines.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{m.medicine_name}</span>
                        <span className="text-muted-foreground">— {m.dosage}, {m.frequency}</span>
                      </div>
                    ))}
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
