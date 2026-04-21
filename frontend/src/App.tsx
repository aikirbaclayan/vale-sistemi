import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerPage from './pages/CustomerPage';
import ValetDashboard from './pages/ValetDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <Routes>
          {/* Müşteri QR Sayfası */}
          <Route path="/" element={<CustomerPage />} />
          <Route path="/customer/:qrCode?" element={<CustomerPage />} />
          
          {/* Vale Paneli */}
          <Route path="/valet" element={<ValetDashboard />} />
          
          {/* İşletme Sahibi Paneli */}
          <Route path="/owner" element={<OwnerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;