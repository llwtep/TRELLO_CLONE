import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Board from './components/Board.jsx';
import axios from 'axios';

// Set global axios defaults (optional, but good for cookies)
axios.defaults.withCredentials = true;
// axios.defaults.baseURL = 'http://localhost:5173/api'; // CAUSES 404, removed.
// Note: We use proxy at vite level, so request to /api/... is redirected?
// Wait, my vite proxy maps '/auth' -> 'http://localhost:8000/auth'.
// If I set baseURL to /api, I need proxy /api.
// My proxy setup: '/auth': '...', '/boards': '...'
// So I should just make requests to relative paths '/auth/...' directly, NOT /api/auth/... unless I verify proxy.

// In Login.jsx I used '/auth/login'.
// In Dashboard.jsx I used '/boards'.
// This matches my proxy config.
// So I don't need baseURL to include /api, just relative is fine OR default to empty.
// But wait, axios.defaults.baseURL might be empty by default.
// Let's NOT set baseURL to avoid confusion, or set it to "/" if needed.

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/board/:id" element={<Board />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
