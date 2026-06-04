import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import ProjectSetup from './pages/ProjectSetup';
import ManageCourses from './pages/ManageCourses';
import ManageVenues from './pages/ManageVenues';
import ManageStudents from './pages/ManageStudents';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import CompareAlgorithms from './pages/CompareAlgorithms';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-project"
        element={
          <ProtectedRoute>
            <NewProject />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/setup"
        element={
          <ProtectedRoute>
            <ProjectSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage/courses"
        element={
          <ProtectedRoute>
            <ManageCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage/venues"
        element={
          <ProtectedRoute>
            <ManageVenues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage/students"
        element={
          <ProtectedRoute>
            <ManageStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/compare"
        element={
          <ProtectedRoute>
            <CompareAlgorithms />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
