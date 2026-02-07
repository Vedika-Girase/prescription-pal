import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";

interface DoseDay {
  date: string;
  doses: { medicine_name: string; status: string | null }[];
}

export default function DoseHistory() {
  const { user } = useAuth();
  const [days, setDays] = useState<DoseDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallAdherence, setOverallAdherence] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data: tracking } = await supabase
        .from("dose_tracking")
        .select(`
          id, scheduled_time, status,
          prescription_medicines (medicine_name)
        `)
        .eq("patient_id", user.id)
        .order("scheduled_time", { ascending: false })
        .limit(100);

      if (tracking) {
        const groupedByDate = new Map<string, DoseDay>();

        tracking.forEach((d) => {
          const date = new Date(d.scheduled_time).toLocaleDateString();
          if (!groupedByDate.has(date)) {
            groupedByDate.set(date, { date, doses: [] });
          }
          const med = d.prescription_medicines as any;
          groupedByDate.get(date)!.doses.push({
            medicine_name: med?.medicine_name || "Unknown",
            status: d.status,
          });
        });

        const daysList = Array.from(groupedByDate.values());
        setDays(daysList);

        const total = tracking.length;
        const taken = tracking.filter((d) => d.status === "taken").length;
        setOverallAdherence(total > 0 ? Math.round((taken / total) * 100) : 0);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dose History</h1>
          <p className="text-muted-foreground">Track your medicine adherence</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Adherence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={overallAdherence} className="flex-1" />
              <span className="text-2xl font-bold text-primary">{overallAdherence}%</span>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : days.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No dose tracking history yet
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day) => (
              <Card key={day.date}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">{day.date}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {day.doses.map((dose, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{dose.medicine_name}</span>
                        {dose.status ? (
                          <StatusBadge status={dose.status} />
                        ) : (
                          <span className="text-muted-foreground text-xs">Not tracked</span>
                        )}
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
