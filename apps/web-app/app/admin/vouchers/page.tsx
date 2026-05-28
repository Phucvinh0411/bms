'use client';

import { useEffect, useState } from 'react';
import { Plus, Sparkles, TicketPercent } from 'lucide-react';
import { promotionService, type Voucher } from '@/src/api/promotionService';

const emptyForm = {
  code: '',
  discountAmount: 0,
  minOrderValue: 0,
  status: 'ACTIVE',
  description: '',
};

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadVouchers = async () => {
    setLoading(true);
    try {
      setVouchers(await promotionService.getVouchers());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVouchers();
  }, []);

  const createVoucher = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    try {
      await promotionService.createVoucher(form);
      setForm(emptyForm);
      setMessage('Đã tạo voucher');
      await loadVouchers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo voucher');
    }
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiAnswer('');
    try {
      setAiAnswer(await promotionService.askAI(aiQuestion.trim()));
    } catch (error) {
      setAiAnswer(error instanceof Error ? error.message : 'AI chưa sẵn sàng');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 700 }}>Voucher</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Quản lý mã khuyến mãi từ promotion-service.</p>
      </div>

      {message && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        <form onSubmit={createVoucher} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 18 }}>
            <Plus size={18} /> Tạo voucher
          </h2>
          {[
            ['code', 'Mã voucher'],
            ['discountAmount', 'Giá trị giảm'],
            ['minOrderValue', 'Giá trị đơn tối thiểu'],
            ['description', 'Mô tả'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'block', marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {label}
              <input
                value={String(form[key as keyof typeof form])}
                type={key.includes('Amount') || key.includes('Value') ? 'number' : 'text'}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  [key]: event.target.type === 'number' ? Number(event.target.value) : event.target.value,
                }))}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
            </label>
          ))}
          <button type="submit" style={{ width: '100%', padding: 12, border: 0, borderRadius: 8, background: '#0f172a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Lưu voucher
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 18 }}>
              <TicketPercent size={18} /> Danh sách voucher
            </h2>
            {loading ? 'Đang tải...' : vouchers.length === 0 ? (
              <p style={{ color: '#64748b' }}>Chưa có voucher nào.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {vouchers.map((voucher) => (
                  <div key={voucher.id ?? voucher.code} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    <strong>{voucher.code}</strong>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                      Giảm: {voucher.discountAmount} | Đơn tối thiểu: {voucher.minOrderValue} | {voucher.status}
                    </div>
                    {voucher.description && <div style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>{voucher.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 18 }}>
              <Sparkles size={18} /> Gợi ý voucher bằng AI
            </h2>
            <textarea
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              placeholder="Nhập yêu cầu để AI gợi ý voucher..."
              style={{ width: '100%', minHeight: 88, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
            />
            <button onClick={askAI} style={{ marginTop: 10, padding: '10px 14px', border: 0, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Hỏi AI
            </button>
            {aiAnswer && <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8 }}>{aiAnswer}</pre>}
          </section>
        </div>
      </div>
    </div>
  );
}
