import { Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IntegrationList from './pages/IntegrationList';
import ProjectDetails from './pages/ProjectDetails';
import LogsExplorer from './pages/LogsExplorer';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Provider store={store}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/integrations" element={<IntegrationList />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/logs" element={<LogsExplorer />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Provider>
  );
}
