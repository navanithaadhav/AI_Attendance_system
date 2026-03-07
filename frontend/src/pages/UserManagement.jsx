import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const r = await axios.get(`${API_URL}/users`);
      setUsers(r.data);
    } catch {
      showMsg('Failed to fetch users', 'error');
    }
  };

  const showMsg = (msg, type) => {
    setMessage(msg); setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return showMsg('Please fill in all fields', 'error');
    try {
      setLoading(true);
      const r = await axios.post(`${API_URL}/users/register`, { name: name.trim(), email: email.trim() });
      showMsg('✓ User registered! Now upload their face photo.', 'success');
      setRegisteredUserId(r.data.id);
      setName(''); setEmail('');
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Failed to register user', 'error');
    } finally { setLoading(false); }
  };

  const handleUploadFace = async (e) => {
    e.preventDefault();
    if (!selectedFile || !registeredUserId) return showMsg('Please select a photo first', 'error');
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('user_id', registeredUserId);
      fd.append('file', selectedFile);
      await axios.post(`${API_URL}/users/register-face`, fd);
      showMsg('✓ Face registered successfully!', 'success');
      setSelectedFile(null); setPreviewUrl(''); setRegisteredUserId(null); setShowForm(false);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Failed to register face', 'error');
    } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId, uname) => {
    if (!window.confirm(`Delete "${uname}"? This removes all their attendance records.`)) return;
    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      showMsg('✓ User deleted', 'success');
      fetchUsers();
    } catch { showMsg('Failed to delete user', 'error'); }
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.put(`${API_URL}/users/${user.id}?is_active=${!user.is_active}`);
      showMsg(`✓ User ${!user.is_active ? 'activated' : 'deactivated'}`, 'success');
      fetchUsers();
    } catch { showMsg('Failed to update user', 'error'); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const alertClass = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error:   'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
  }[messageType] || 'bg-gray-50 border-gray-200 text-gray-700';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">👥 User Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setRegisteredUserId(null); setMessage(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showForm ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {showForm ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Alert */}
      {message && (
        <div className={`border rounded-lg px-4 py-3 text-sm ${alertClass}`}>{message}</div>
      )}

      {/* Registration form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">➕ Register New User</h3>
          {!registeredUserId ? (
            <form onSubmit={handleRegisterUser}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input
                    type="text" placeholder="e.g. Navanitha" value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                  <input
                    type="email" placeholder="e.g. nav@example.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Registering…' : '✓ Register User'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUploadFace}>
              <p className="text-sm text-gray-500 mb-4">Upload a clear front-facing photo for face recognition.</p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Face Photo</label>
                <input type="file" accept="image/*" onChange={e => {
                  setSelectedFile(e.target.files[0]);
                  setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                }} className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg border-2 border-indigo-200 mb-4" />
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Uploading…' : '📸 Register Face'}
                </button>
                <button type="button" onClick={() => setRegisteredUserId(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  ← Back
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <span className="font-semibold text-gray-700">📋 Registered Users</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {['ID', 'Name', 'Email', 'Face', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">#{user.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.face_encoding ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.face_encoding ? '✓ Registered' : '✕ None'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {user.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${user.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <span className="text-4xl mb-3">👤</span>
            <p className="text-sm">{search ? `No users matching "${search}"` : 'No users registered yet. Click "+ Add User" to start.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
