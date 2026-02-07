import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Auth from "./pages/Auth";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import CreatePrescription from "./pages/doctor/CreatePrescription";
import PrescriptionHistory from "./pages/doctor/PrescriptionHistory";
import StoreDashboard from "./pages/store/StoreDashboard";
import StoreHistory from "./pages/store/StoreHistory";
import PatientDashboard from "./pages/patient/PatientDashboard";
import ViewPrescriptions from "./pages/patient/ViewPrescriptions";
import AddPrescription from "./pages/patient/AddPrescription";
import DoseHistory from "./pages/patient/DoseHistory";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { session, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  switch (userRole) {
    case "doctor": return <Navigate to="/doctor" replace />;
    case "medical_store": return <Navigate to="/store" replace />;
    case "patient": return <Navigate to="/patient" replace />;
    default: return <Navigate to="/auth" replace />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />

            {/* Doctor routes */}
            <Route path="/doctor" element={<ProtectedRoute requiredRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/prescribe" element={<ProtectedRoute requiredRole="doctor"><CreatePrescription /></ProtectedRoute>} />
            <Route path="/doctor/history" element={<ProtectedRoute requiredRole="doctor"><PrescriptionHistory /></ProtectedRoute>} />

            {/* Medical Store routes */}
            <Route path="/store" element={<ProtectedRoute requiredRole="medical_store"><StoreDashboard /></ProtectedRoute>} />
            <Route path="/store/history" element={<ProtectedRoute requiredRole="medical_store"><StoreHistory /></ProtectedRoute>} />

            {/* Patient routes */}
            <Route path="/patient" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
            <Route path="/patient/prescriptions" element={<ProtectedRoute requiredRole="patient"><ViewPrescriptions /></ProtectedRoute>} />
            <Route path="/patient/add" element={<ProtectedRoute requiredRole="patient"><AddPrescription /></ProtectedRoute>} />
            <Route path="/patient/history" element={<ProtectedRoute requiredRole="patient"><DoseHistory /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
