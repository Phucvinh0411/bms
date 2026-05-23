'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/auth/context';
import {
  BookOpen, LayoutDashboard, Library, PlusCircle,
  ShoppingCart, Users, Settings, ChevronLeft, ChevronRight,
  Search, Bell, LogOut, ArrowLeft
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Quản lý sách', href: '/admin/books', icon: Library },
  { label: 'Thêm sách mới', href: '/add-book', icon: PlusCircle },
  { label: 'Quản lý đơn hàng', href: '/admin/orders', icon: ShoppingCart, disabled: true },
  { label: 'Người dùng', href: '/admin/users', icon: Users, disabled: true },
  { label: 'Cài đặt', href: '/admin/settings', icon: Settings, disabled: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!isSignedIn || user?.role !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isLoading, isSignedIn, user, mounted, router]);

  if (!mounted || isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f8fafc'
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #e2e8f0',
          borderTopColor: '#1e293b', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isSignedIn || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 72 : 250,
        background: '#fff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40,
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: collapsed ? '20px 12px' : '20px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 72,
        }}>
          <BookOpen size={26} strokeWidth={2.5} style={{ color: '#1e293b', flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', fontFamily: 'serif', whiteSpace: 'nowrap' }}>
              BookHaven Admin
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href) && item.href !== '/admin';

            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                onClick={(e) => item.disabled && e.preventDefault()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '12px 0' : '12px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: item.disabled ? '#cbd5e1' : isActive ? '#1e293b' : '#64748b',
                  background: isActive ? '#f1f5f9' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  opacity: item.disabled ? 0.5 : 1,
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10, width: '100%', padding: '10px 16px',
              border: '1px solid #e2e8f0', borderRadius: 10,
              background: '#fafafa', color: '#64748b',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && 'Thu gọn'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Admin Top Bar */}
        <header style={{
          height: 72,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link
              href="/"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: '#64748b', fontSize: 13, fontWeight: 500,
                textDecoration: 'none', transition: 'color 0.15s',
              }}
              title="Quay về trang chủ"
            >
              <ArrowLeft size={16} />
              Trang chủ
            </Link>
            <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
            <div style={{ position: 'relative', width: 360 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm kiếm sách, đơn hàng, người dùng..."
                style={{
                  width: '100%', padding: '10px 14px 10px 40px',
                  border: '1px solid #e2e8f0', borderRadius: 10,
                  fontSize: 13, background: '#f8fafc', outline: 'none',
                  color: '#334155',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{
              position: 'relative', background: 'none', border: 'none',
              cursor: 'pointer', color: '#64748b', padding: 8,
              borderRadius: 8,
            }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, background: '#ef4444',
                borderRadius: '50%', border: '2px solid #fff',
              }} />
            </button>

            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e293b, #475569)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}>
                {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {user?.fullName || user?.username}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Administrator</span>
              </div>
            </div>

            <button
              onClick={() => { logout(); router.push('/'); }}
              title="Đăng xuất"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', padding: 8, borderRadius: 8,
                transition: 'color 0.15s',
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
