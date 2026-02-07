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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Send } from "lucide-react";
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

export default function CreatePrescription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientEmail, setPatientEmail] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...emptyMedicine }]);
  const [submitting, setSubmitting] = useState(false);

  const addMedicine = () => setMedicines([...medicines, { ...emptyMedicine }]);

  const removeMedicine = (index: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
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
      // Find patient by email
      const { data: patient } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", patientEmail)
        .single();

      if (!patient) {
        toast.error("Patient not found with that email");
        setSubmitting(false);
        return;
      }

      // Create prescription
      const { data: prescription, error: prescError } = await supabase
        .from("prescriptions")
        .insert({
          doctor_id: user.id,
          patient_id: patient.id,
          notes,
          reminders_enabled: remindersEnabled,
        })
        .select()
        .single();

      if (prescError) throw prescError;

      // Insert medicines
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

      // Assign to store if email provided
      if (storeEmail) {
        const { data: store } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", storeEmail)
          .single();

        if (store) {
          await supabase.from("store_prescriptions").insert({
            prescription_id: prescription.id,
            store_id: store.id,
          });
        } else {
          toast.warning("Medical store not found, prescription created without store assignment");
        }
      }

      // Create notification for patient
      await supabase.from("notifications").insert({
        user_id: patient.id,
        title: "New Prescription",
        message: `You have a new prescription from your doctor`,
        type: "prescription",
      });

      toast.success("Prescription created successfully!");
      navigate("/doctor");
    } catch (error: any) {
      toast.error(error.message || "Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Prescription</h1>
          <p className="text-muted-foreground">Fill in the details to create a new prescription</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient & Store</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="patientEmail">Patient Email *</Label>
                  <Input
                    id="patientEmail"
                    type="email"
                    placeholder="patient@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Medical Store Email (optional)</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    placeholder="store@example.com"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Medicines</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
                <Plus className="h-4 w-4 mr-1" /> Add Medicine
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
                        placeholder="e.g., Amoxicillin"
                        value={med.medicine_name}
                        onChange={(e) => updateMedicine(index, "medicine_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosage *</Label>
                      <Input
                        placeholder="e.g., 500mg"
                        value={med.dosage}
                        onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={med.frequency}
                        onValueChange={(val) => updateMedicine(index, "frequency", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        placeholder="e.g., 7 days"
                        value={med.duration}
                        onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Timing</Label>
                      <Select
                        value={med.timing}
                        onValueChange={(val) => updateMedicine(index, "timing", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional instructions for the patient..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
                <Label>Enable medicine reminders for patient</Label>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Creating..." : "Create Prescription"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
