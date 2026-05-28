'use client';

import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { reportService, type ReportSummary } from '@/src/api/reportService';

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await reportService.getSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 700 }}>Báo cáo</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Màn hình báo cáo kết nối với report-service.</p>
        </div>
        <button onClick={loadSummary} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 0, borderRadius: 8, background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 18 }}>
          <BarChart3 size={20} /> Tổng quan dịch vụ
        </h2>
        {loading ? (
          <p style={{ color: '#64748b' }}>Đang tải...</p>
        ) : error ? (
          <p style={{ color: '#dc2626' }}>{error}</p>
        ) : summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              ['Dịch vụ', summary.service],
              ['Trạng thái', summary.status],
              ['Thời điểm tạo', summary.generatedAt],
              ['Thông báo', summary.message],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
                <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ marginTop: 8, color: '#0f172a', fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
