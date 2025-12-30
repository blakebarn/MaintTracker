import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        setPassword('');
        fetchRecords(token);
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
  };

  // Fetch records
  const fetchRecords = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/records`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      setError('Failed to fetch records: ' + err.message);
    }
  };

  // Upload and process image
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const { record } = await response.json();
        setRecords([record, ...records]);
        setSelectedFile(null);
        document.getElementById('fileInput').value = '';
      } else {
        const errorData = await response.json();
        setError('Upload failed: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete record
  const deleteRecord = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/records/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setRecords(records.filter(r => r.id !== id));
      }
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    }
  };

  // Check login on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchRecords(token);
    }
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setRecords([]);
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    const vehicleMatch = !filterVehicle || (record.vehicle && record.vehicle.toLowerCase().includes(filterVehicle.toLowerCase()));
    const monthMatch = !filterMonth || (record.date && record.date.startsWith(filterMonth));
    return vehicleMatch && monthMatch;
  });

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🔧 Maintenance Tracker</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit">Login</button>
          </form>
          {error && <p className="error">{error}</p>}
          <p className="hint">Default password: maintenance123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🔧 Maintenance Tracker</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <main className="container">
        {/* Upload Section */}
        <section className="upload-section">
          <h2>Upload Receipt or Invoice</h2>
          <form onSubmit={handleUpload} className="upload-form">
            <input
              id="fileInput"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {selectedFile && <p className="file-name">{selectedFile.name}</p>}
            <button type="submit" disabled={!selectedFile || uploading}>
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>

        {/* Filter Section */}
        <section className="filter-section">
          <h2>Records ({filteredRecords.length})</h2>
          <div className="filters">
            <input
              type="text"
              placeholder="Filter by vehicle..."
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
            />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
        </section>

        {/* Records List */}
        <section className="records-section">
          {filteredRecords.length === 0 ? (
            <p className="empty">No maintenance records yet. Upload a receipt to get started!</p>
          ) : (
            <div className="records-list">
              {filteredRecords.map((record) => (
                <div key={record.id} className="record-card">
                  <div className="record-header">
                    <span className="date">{record.date || 'N/A'}</span>
                    <button
                      onClick={() => deleteRecord(record.id)}
                      className="delete-btn"
                      title="Delete record"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="record-content">
                    <p><strong>Vehicle:</strong> {record.vehicle || 'Not specified'}</p>
                    <p><strong>Service:</strong> {record.serviceType || 'Not specified'}</p>
                    <p><strong>Cost:</strong> ${record.cost ? record.cost.toFixed(2) : 'N/A'}</p>
                    {record.mileage && <p><strong>Mileage:</strong> {record.mileage.toLocaleString()} mi</p>}
                    {record.vendor && <p><strong>Vendor:</strong> {record.vendor}</p>}
                    {record.notes && <p><strong>Notes:</strong> {record.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
