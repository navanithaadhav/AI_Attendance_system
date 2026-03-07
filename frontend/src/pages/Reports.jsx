import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001';

function fmt(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtAvg(t) {
  if (!t) return '--';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
}

function duration(checkIn, checkOut) {
  if (!checkOut) return '--';
  const mins = Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function Reports() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, logsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/attendance/logs`),
        axios.get(`${API_URL}/attendance/stats`),
      ]);
      const logsData = logsRes.data;
      setUsers(usersRes.data);
      setLogs(logsData);
      setStats(statsRes.data);
      // Chart: last 7 days
      const counts = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        counts[d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })] = 0;
      }
      logsData.forEach(l => {
        const k = new Date(l.check_in_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        if (k in counts) counts[k]++;
      });
      setChartData(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedUserId) params.append('user_id', selectedUserId);
      if (selectedDate) params.append('date', selectedDate);
      const r = await axios.get(`${API_URL}/attendance/logs?${params}`);
      setLogs(r.data);
    } catch (err) {
      console.error('Filter failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilter = () => { setSelectedUserId(''); setSelectedDate(''); fetchData(); };

  const exportToCSV = () => {
    const csv = [
      ['User Name', 'Check-in', 'Check-out', 'Duration', 'Confidence', 'Status'],
      ...logs.map(l => [
        l.user_name, fmt(l.check_in_time), l.check_out_time ? fmt(l.check_out_time) : 'Not yet',
        duration(l.check_in_time, l.check_out_time),
        (l.confidence * 100).toFixed(2) + '%', l.status,
      ]),
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading && !stats) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Loading Reports…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📈 Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">{logs.length} record{logs.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={exportToCSV} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          📥 Export CSV
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Present Today', value: stats.present_today, icon: '✅', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
            { label: 'Absent Today',  value: stats.absent_today,  icon: '❌', bg: 'bg-red-50',   text: 'text-red-600',   border: 'border-red-200' },
            { label: 'Avg Arrival',   value: fmtAvg(stats.average_arrival_time), icon: '⏰', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
          ].map(c => (
            <div key={c.label} className={`bg-white rounded-xl border ${c.border} p-4 shadow-sm`}>
              <div className={`w-9 h-9 ${c.bg} ${c.text} rounded-lg flex items-center justify-center text-lg mb-2`}>{c.icon}</div>
              <div className="text-2xl font-bold text-gray-800">{c.value}</div>
              <div className="text-xs text-gray-400 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">📊 Daily Check-ins (Last 7 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Check-ins" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-3">🔍 Filter Logs</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Apply</button>
            <button onClick={resetFilter} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Reset</button>
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="font-semibold text-gray-700">📋 Attendance Logs</span>
        </div>
        {loading ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Loading records…</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {['Name', 'Check-in', 'Check-out', 'Duration', 'Confidence', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const conf = log.confidence;
                  const confColor = conf >= 0.85 ? 'bg-green-100 text-green-700' : conf >= 0.70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                  const statusColor = log.status === 'checked_in' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{log.user_name}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(log.check_in_time)}</td>
                      <td className="px-4 py-3 text-gray-400">{log.check_out_time ? fmt(log.check_out_time) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{duration(log.check_in_time, log.check_out_time)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confColor}`}>{(conf * 100).toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {log.status === 'checked_in' ? '● In' : '○ Out'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-sm">No records found for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
