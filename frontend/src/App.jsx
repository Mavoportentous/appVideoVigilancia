import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Camera from './pages/Camera.jsx';
import Viewer from './pages/Viewer.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/camera" element={<Camera />} />
      <Route path="/viewer" element={<Viewer />} />
      <Route path="/viewer/:code" element={<Viewer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
