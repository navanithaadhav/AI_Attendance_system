import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import CheckOutFace from './pages/CheckOutFace';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';

// ────────── Role Picker ──────────
function RolePicker() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
       
        <h1 className="text-3xl font-bold text-white mt-3 tracking-tight">AttendAI</h1>
        <p className="text-indigo-300 mt-1 text-sm">Face Recognition Attendance System</p>
      </div>

      <p className="text-indigo-200 mb-6 font-medium">Who are you logging in as?</p>

      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-sm">
        <button
          onClick={() => navigate('/user')}
          className="flex-1 bg-white text-indigo-900 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 font-semibold"
        >
          <span className="text-4xl">👤</span>
          <span className="text-lg">User</span>
          <span className="text-xs text-indigo-400 font-normal">Check in / Check out</span>
        </button>

        <button
          onClick={() => navigate('/admin')}
          className="flex-1 bg-indigo-600 text-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 font-semibold border border-indigo-400"
        >
          <span className="text-4xl">🛡️</span>
          <span className="text-lg">Admin</span>
          <span className="text-xs text-indigo-200 font-normal">Manage users & reports</span>
        </button>
      </div>
    </div>
  );
}

// ────────── Shared Sidebar ──────────
function Sidebar({ navItems, collapsed, setCollapsed, onClose, backPath }) {
  return (
    <aside className={`flex flex-col h-full bg-indigo-950 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-indigo-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-lg tracking-tight">AttendAI</span>
          </div>
        )}
        {collapsed && <span className="text-xl mx-auto">🎯</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-indigo-300 hover:text-white hover:bg-indigo-800 rounded p-1 transition-colors text-sm hidden md:block"
        >
          {collapsed ? '»' : '«'}
        </button>
        <button onClick={onClose} className="text-indigo-300 hover:text-white md:hidden ml-auto">✕</button>
      </div>

      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
               ${isActive ? 'bg-indigo-600 text-white shadow' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`
            }
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-indigo-800">
        <NavLink
          to={backPath}
          className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
        >
          <span>←</span>
          {!collapsed && <span>Switch Role</span>}
        </NavLink>
        {!collapsed && (
          <div className="flex items-center gap-2 mt-2 text-xs text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            System Online
          </div>
        )}
      </div>
    </aside>
  );
}

// ────────── Shared Layout wrapper ──────────
function AppLayout({ navItems, children, backPath }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPage = navItems.find(n => n.to === location.pathname)?.label || navItems[0]?.label || '';

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="hidden md:flex flex-col flex-shrink-0">
        <Sidebar navItems={navItems} collapsed={collapsed} setCollapsed={setCollapsed} onClose={() => {}} backPath={backPath} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-56">
            <Sidebar navItems={navItems} collapsed={false} setCollapsed={() => {}} onClose={() => setMobileOpen(false)} backPath={backPath} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button className="text-gray-500 hover:text-gray-900 md:hidden" onClick={() => setMobileOpen(true)}>☰</button>
          <h1 className="text-base font-semibold text-gray-700">{currentPage}</h1>
          <div className="ml-auto text-xs text-gray-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

// ────────── User Layout ──────────
const USER_NAV = [
  { to: '/user',            icon: '▣', label: 'Dashboard', end: true },
  { to: '/user/check-in',   icon: '↓', label: 'Check In',  end: false },
  { to: '/user/check-out',  icon: '↑', label: 'Check Out', end: false },
];

function UserApp() {
  return (
    <AppLayout navItems={USER_NAV} backPath="/">
      <Routes>
        <Route index              element={<Dashboard />} />
        <Route path="check-in"   element={<CheckIn />} />
        <Route path="check-out"  element={<CheckOutFace />} />
        <Route path="*"          element={<Navigate to="/user" replace />} />
      </Routes>
    </AppLayout>
  );
}

// ────────── Admin Layout ──────────
const ADMIN_NAV = [
  { to: '/admin',          icon: '▣',  label: 'Dashboard', end: true },
  { to: '/admin/users',    icon: '👥', label: 'Users',     end: false },
  { to: '/admin/reports',  icon: '📈', label: 'Reports',   end: false },
  { to: '/admin/check-in', icon: '↓',  label: 'Check In',  end: false },
];

function AdminApp() {
  return (
    <AppLayout navItems={ADMIN_NAV} backPath="/">
      <Routes>
        <Route index              element={<Dashboard />} />
        <Route path="users"       element={<UserManagement />} />
        <Route path="reports"     element={<Reports />} />
        <Route path="check-in"    element={<CheckIn />} />
        <Route path="*"           element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppLayout>
  );
}

// ────────── Root App ──────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"        element={<RolePicker />} />
        <Route path="/user/*"  element={<UserApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
