import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001';

function fmtTime(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtAvg(t) {
  if (!t) return '--';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
}

const KPI_CARDS = [
  { key: 'total_users',   label: 'Total Users',      icon: '👥', bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  { key: 'present_today', label: 'Present Today',     icon: '✅', bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200' },
  { key: 'absent_today',  label: 'Absent Today',      icon: '❌', bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
  { key: 'avg',           label: 'Avg Arrival',       icon: '⏰', bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200' },
  { key: 'rate',          label: 'Attendance Rate',   icon: '📈', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
];

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  }, []);

  const fetchAll = async () => {
    try {
      const [s, l] = await Promise.all([
        axios.get(`${API_URL}/attendance/stats`),
        axios.get(`${API_URL}/attendance/logs`)
      ]);
      setStats(s.data);
      setLogs(l.data.slice(0, 10));
      setError('');
    } catch {
      setError('Could not reach backend');
    } finally {
      setLoading(false);
    }
  };

  const attendanceRate = stats && stats.total_users > 0
    ? Math.round((stats.present_today / stats.total_users) * 100) : 0;

  const kpiValues = {
    total_users: stats?.total_users ?? '—',
    present_today: stats?.present_today ?? '—',
    absent_today: stats?.absent_today ?? '—',
    avg: fmtAvg(stats?.average_arrival_time),
    rate: `${attendanceRate}%`,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p>Loading Dashboard…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">Real-time attendance overview · auto-refreshes every 15s</p>
        </div>
        <button onClick={fetchAll} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">↻ Refresh</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map(card => (
          <div key={card.key} className={`bg-white rounded-xl border ${card.border} p-4 shadow-sm`}>
            <div className={`w-10 h-10 ${card.bg} ${card.text} rounded-lg flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-gray-800">{kpiValues[card.key]}</div>
            <div className="text-xs text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance rate bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>Today's Attendance Rate</span>
          <span className="text-indigo-600 font-bold">{attendanceRate}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${attendanceRate}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{stats?.present_today ?? 0} present</span>
          <span>{stats?.total_users ?? 0} total</span>
        </div>
      </div>

      {/* Recent check-ins table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <span className="font-semibold text-gray-700">📋 Recent Check-ins</span>
          <span className="text-xs text-gray-400">Last {logs.length} records</span>
        </div>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {['#', 'User', 'Check-in', 'Check-out', 'Confidence', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log, i) => {
                  const conf = log.confidence;
                  const confColor = conf >= 0.85 ? 'bg-green-100 text-green-700' : conf >= 0.7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                  const statusColor = log.status === 'checked_in' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{log.user_name}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtTime(log.check_in_time)}</td>
                      <td className="px-4 py-3 text-gray-400">{log.check_out_time ? fmtTime(log.check_out_time) : '—'}</td>
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
            <span className="text-4xl mb-3">📭</span>
            <p className="text-sm">No check-ins recorded today</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
