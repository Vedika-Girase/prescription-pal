import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Pill, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface TodayMedicine {
  id: string;
  medicine_name: string;
  dosage: string;
  timing: string;
  time_of_day: string[];
  prescription_id: string;
  dose_tracking_id?: string;
  dose_status?: string | null;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [todayMeds, setTodayMeds] = useState<TodayMedicine[]>([]);
  const [stats, setStats] = useState({ prescriptions: 0, taken: 0, missed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    // Fetch active prescriptions with medicines
    const { data: prescriptions } = await supabase
      .from("prescriptions")
      .select(`
        id,
        prescription_medicines (id, medicine_name, dosage, timing, time_of_day)
      `)
      .eq("patient_id", user.id);

    // Fetch today's dose tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: doses } = await supabase
      .from("dose_tracking")
      .select("*")
      .eq("patient_id", user.id)
      .gte("scheduled_time", today.toISOString())
      .lt("scheduled_time", tomorrow.toISOString());

    if (prescriptions) {
      const allMeds: TodayMedicine[] = [];
      prescriptions.forEach((p) => {
        (p.prescription_medicines || []).forEach((m) => {
          const dose = doses?.find((d) => d.prescription_medicine_id === m.id);
          allMeds.push({
            ...m,
            prescription_id: p.id,
            dose_tracking_id: dose?.id,
            dose_status: dose?.status,
          });
        });
      });
      setTodayMeds(allMeds);
      setStats({
        prescriptions: prescriptions.length,
        taken: doses?.filter((d) => d.status === "taken").length || 0,
        missed: doses?.filter((d) => d.status === "missed").length || 0,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const trackDose = async (medicineId: string, status: "taken" | "missed") => {
    if (!user) return;

    const existing = todayMeds.find((m) => m.id === medicineId);

    if (existing?.dose_tracking_id) {
      await supabase
        .from("dose_tracking")
        .update({ status, taken_at: status === "taken" ? new Date().toISOString() : null })
        .eq("id", existing.dose_tracking_id);
    } else {
      await supabase.from("dose_tracking").insert({
        prescription_medicine_id: medicineId,
        patient_id: user.id,
        scheduled_time: new Date().toISOString(),
        status,
        taken_at: status === "taken" ? new Date().toISOString() : null,
      });
    }

    toast.success(status === "taken" ? "Marked as taken ✅" : "Marked as missed");
    fetchData();
  };

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
          <h1 className="text-2xl font-bold">Patient Dashboard</h1>
          <p className="text-muted-foreground">Today's medicines and reminders</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Prescriptions</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.prescriptions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taken Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.taken}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Missed Today</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.missed}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Today's Medicines</h2>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : todayMeds.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No medicines scheduled today</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {todayMeds.map((med) => (
                <Card key={med.id} className={med.dose_status === "taken" ? "border-success/30 bg-success/5" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Pill className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">{med.medicine_name}</p>
                          <p className="text-sm text-muted-foreground">{med.dosage}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getTimingLabel(med.timing)} · {med.time_of_day.join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {med.dose_status ? (
                          <StatusBadge status={med.dose_status} />
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-success border-success/30 hover:bg-success/10"
                              onClick={() => trackDose(med.id, "taken")}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Taken
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => trackDose(med.id, "missed")}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Missed
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
