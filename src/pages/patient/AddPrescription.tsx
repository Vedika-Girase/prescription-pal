import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Medicine {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  time_of_day: string[];
}

const emptyMedicine: Medicine = {
  medicine_name: "",
  dosage: "",
  frequency: "once_daily",
  duration: "",
  timing: "after_food",
  time_of_day: ["morning"],
};

export default function AddPrescription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...emptyMedicine }]);
  const [submitting, setSubmitting] = useState(false);

  const addMedicine = () => setMedicines([...medicines, { ...emptyMedicine }]);
  const removeMedicine = (i: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, idx) => idx !== i));
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string | string[]) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const toggleTimeOfDay = (index: number, time: string) => {
    const current = medicines[index].time_of_day;
    const updated = current.includes(time)
      ? current.filter((t) => t !== time)
      : [...current, time];
    if (updated.length > 0) updateMedicine(index, "time_of_day", updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const { data: prescription, error } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: user.id,
          doctor_id: null,
          notes,
          reminders_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      const { error: medError } = await supabase
        .from("prescription_medicines")
        .insert(
          medicines.map((m) => ({
            prescription_id: prescription.id,
            medicine_name: m.medicine_name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            timing: m.timing,
            time_of_day: m.time_of_day,
          }))
        );

      if (medError) throw medError;

      toast.success("Prescription added!");
      navigate("/patient");
    } catch (err: any) {
      toast.error(err.message || "Failed to add prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Add Prescription</h1>
          <p className="text-muted-foreground">Manually add medicines you're taking</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Medicines</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {medicines.map((med, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg relative">
                  {medicines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => removeMedicine(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Medicine Name *</Label>
                      <Input
                        placeholder="e.g., Vitamin D"
                        value={med.medicine_name}
                        onChange={(e) => updateMedicine(index, "medicine_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosage *</Label>
                      <Input
                        placeholder="e.g., 1000 IU"
                        value={med.dosage}
                        onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={med.frequency} onValueChange={(val) => updateMedicine(index, "frequency", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once_daily">Once daily</SelectItem>
                          <SelectItem value="twice_daily">Twice daily</SelectItem>
                          <SelectItem value="thrice_daily">Thrice daily</SelectItem>
                          <SelectItem value="as_needed">As needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duration *</Label>
                      <Input
                        placeholder="e.g., 30 days"
                        value={med.duration}
                        onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Timing</Label>
                      <Select value={med.timing} onValueChange={(val) => updateMedicine(index, "timing", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before_food">Before food</SelectItem>
                          <SelectItem value="after_food">After food</SelectItem>
                          <SelectItem value="with_food">With food</SelectItem>
                          <SelectItem value="any_time">Any time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Time of Day</Label>
                      <div className="flex gap-2 flex-wrap">
                        {["morning", "afternoon", "evening", "night"].map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant={med.time_of_day.includes(time) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleTimeOfDay(index, time)}
                          >
                            {time.charAt(0).toUpperCase() + time.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? "Saving..." : "Save Prescription"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
