import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing';
import PatientLogin from '../pages/auth/PatientLogin';
import PatientRegister from '../pages/auth/PatientRegister';
import DoctorLogin from '../pages/auth/DoctorLogin';
import DoctorHome from '../pages/DoctorHome';
import PatientHome from '../pages/PatientHome';
import DoctorProfile from '../pages/DoctorProfile';
import PatientProfile from '../pages/PatientProfile';
import NewConsultation from '../pages/consultation/NewConsultation';
import MyConsultations from '../pages/MyConsultations';
import DoctorConsultations from '../pages/DoctorConsultations';
import ConsultationDetail from '../pages/ConsultationDetail';
import Prescriptions from '../pages/Prescriptions';
import ProtectedRoute from './ProtectedRoute';
import AppShell from '../components/layout/AppShell';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login/patient" element={<PatientLogin />} />
      <Route path="/register/patient" element={<PatientRegister />} />
      <Route path="/login/doctor" element={<DoctorLogin />} />

      <Route
        element={
          <ProtectedRoute role="patient">
            <AppShell role="patient" />
          </ProtectedRoute>
        }
      >
        <Route path="/patient" element={<PatientHome />} />
        <Route path="/patient/profile" element={<PatientProfile />} />
        <Route path="/patient/consultations/new" element={<NewConsultation />} />
        <Route path="/patient/consultations" element={<MyConsultations />} />
        <Route path="/patient/consultations/:id" element={<ConsultationDetail />} />
        <Route path="/patient/prescriptions" element={<Prescriptions />} />
      </Route>

      <Route
        element={
          <ProtectedRoute role="doctor">
            <AppShell role="doctor" />
          </ProtectedRoute>
        }
      >
        <Route path="/doctor" element={<DoctorHome />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/doctor/consultations" element={<DoctorConsultations />} />
        <Route path="/doctor/consultations/:id" element={<ConsultationDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
