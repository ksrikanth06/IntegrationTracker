import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IntegrationList from './pages/IntegrationList';
import ProjectDetails from './pages/ProjectDetails';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { IntegrationsProvider } from './context/IntegrationsContext';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <IntegrationsProvider>
              <Layout />
            </IntegrationsProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/integrations" element={<IntegrationList />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
