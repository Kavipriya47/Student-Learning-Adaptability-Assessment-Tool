import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const AdminDashboard = lazy(() => import('./modules/Admin/AdminDashboard'));
const DataImport = lazy(() => import('./modules/Admin/DataImport'));
const StaffManagement = lazy(() => import('./modules/Admin/StaffManagement'));
const DepartmentManagement = lazy(() => import('./modules/Admin/DepartmentManagement'));
const BatchManagement = lazy(() => import('./modules/Admin/BatchManagement'));
const SubjectManagement = lazy(() => import('./modules/Admin/SubjectManagement'));
const MappingManagement = lazy(() => import('./modules/Admin/MappingManagement'));
const BatchDetail = lazy(() => import('./modules/Admin/BatchDetail'));
const FacultyDashboard = lazy(() => import('./modules/Faculty/FacultyDashboard'));
const MentorDashboard = lazy(() => import('./modules/Mentor/MentorDashboard'));
const StudentDashboard = lazy(() => import('./modules/Student/StudentDashboard'));
const StudentDetail = lazy(() => import('./modules/Mentor/StudentDetail'));



const Unauthorized = () => <div>Unauthorized Access</div>;
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-bg-base text-primary">
    <Loader2 className="h-12 w-12 animate-spin" />
  </div>
);

function App() {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);

  useEffect(() => {
    if (token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token]);

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />



            {/* Shared Dashboard Layout for protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['Admin']} />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="imports" element={<DataImport />} />
                  <Route path="staff" element={<StaffManagement />} />
                  <Route path="departments" element={<DepartmentManagement />} />
                  <Route path="batches" element={<BatchManagement />} />
                  <Route path="batches/:batchId" element={<BatchDetail />} />
                  <Route path="subjects" element={<SubjectManagement />} />
                  <Route path="mappings" element={<MappingManagement />} />
                </Route>

                <Route path="/faculty/*" element={<ProtectedRoute allowedRoles={['Faculty', 'Mentor']} />}>
                  <Route index element={<FacultyDashboard />} />
                </Route>

                <Route path="/mentor/*" element={<ProtectedRoute allowedRoles={['Mentor']} />}>
                  <Route index element={<MentorDashboard />} />
                  <Route path="student/:roll_no" element={<StudentDetail />} />
                </Route>

                <Route path="/student/*" element={<ProtectedRoute allowedRoles={['Student']} />}>
                  <Route index element={<StudentDashboard />} />
                </Route>

                {/* Default redirect based on role could be handled in more detail */}
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}
export default App;
