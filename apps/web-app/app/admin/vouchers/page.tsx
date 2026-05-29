'use client';

import { useEffect, useState } from 'react';
import { Plus, Sparkles, TicketPercent, Edit2, Trash2, Calendar, DollarSign, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { promotionService, type Voucher } from '@/src/api/promotionService';

const emptyForm = {
  code: '',
  discountType: 'FIXED_AMOUNT' as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING',
  discountAmount: 0,
  minOrderValue: 0,
  maxDiscountAmount: 0,
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  description: '',
};

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadVouchers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await promotionService.getVouchers();
      setVouchers(data);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể tải danh sách voucher');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVouchers();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMsg('');

    if (!form.code.trim()) {
      setErrorMsg('Vui lòng nhập mã voucher');
      return;
    }

    try {
      const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      };

      if (editingId) {
        await promotionService.updateVoucher(editingId, payload);
        setMessage(`Đã cập nhật thành công voucher #${editingId}`);
      } else {
        await promotionService.createVoucher(payload);
        setMessage('Đã tạo thành công voucher mới');
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadVouchers();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Lỗi khi xử lý voucher');
    }
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingId(voucher.id ?? null);
    setForm({
      code: voucher.code,
      discountType: (voucher.discountType as any) ?? 'FIXED_AMOUNT',
      discountAmount: voucher.discountAmount,
      minOrderValue: voucher.minOrderValue,
      maxDiscountAmount: voucher.maxDiscountAmount ?? 0,
      startDate: voucher.startDate ? new Date(voucher.startDate).toISOString().slice(0, 16) : '',
      endDate: voucher.endDate ? new Date(voucher.endDate).toISOString().slice(0, 16) : '',
      status: voucher.status,
      description: voucher.description ?? '',
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa voucher này không?')) return;
    setMessage('');
    setErrorMsg('');
    try {
      await promotionService.deleteVoucher(id);
      setMessage('Đã xóa thành công voucher');
      await loadVouchers();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể xóa voucher');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiAnswer('');
    setAiLoading(true);
    try {
      setAiAnswer(await promotionService.askAI(aiQuestion.trim()));
    } catch (error) {
      setAiAnswer(error instanceof Error ? error.message : 'AI chưa sẵn sàng');
    } finally {
      setAiLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="p-1 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TicketPercent className="text-amber-500 h-8 w-8" />
            Cổng Quản Lý Khuyến Mãi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo lập, sửa đổi và kiểm soát các voucher giảm giá và chiến dịch khuyến mãi của hệ thống.
          </p>
        </div>
        <button
          onClick={loadVouchers}
          className="mt-3 sm:mt-0 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Tải lại danh sách
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-medium">
          <CheckCircle className="text-emerald-500 shrink-0" size={18} />
          <span>{message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium">
          <AlertCircle className="text-rose-500 shrink-0" size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Side: Create / Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Plus size={18} className="text-amber-500" />
            {editingId ? 'Cập Nhật Voucher' : 'Thạo Mới Voucher'}
          </h2>

          <div className="space-y-3.5">
            {/* Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mã Voucher</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.trim().toUpperCase() })}
                placeholder="Ví dụ: KM2026, FREESHIP"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Loại Giảm Giá</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="FIXED_AMOUNT">Giảm tiền trực tiếp (VND)</option>
                <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
                <option value="FREE_SHIPPING">Miễn phí vận chuyển (Freeship)</option>
              </select>
            </div>

            {/* Grid of Values */}
            <div className="grid grid-cols-2 gap-3">
              {/* Discount Value */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Giá Trị Giảm</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.discountAmount}
                  onChange={(e) => setForm({ ...form, discountAmount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Min Order Value */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Đơn Hàng Tối Thiểu</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Max Discount Amount */}
            {form.discountType === 'PERCENTAGE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số Tiền Giảm Tối Đa (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: Number(e.target.value) })}
                  placeholder="Để 0 nếu không giới hạn"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Date Active Range */}
            <div className="grid grid-cols-2 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ngày Bắt Đầu</label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ngày Kết Thúc</label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Trạng Thái Hoạt Động</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="ACTIVE">Kích hoạt (ACTIVE)</option>
                <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
                <option value="EXPIRED">Hết hạn (EXPIRED)</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô tả Chiến dịch (AI dùng)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả mục đích voucher để trợ lý AI có thể hiểu rõ nhất..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none min-h-[70px]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
            >
              {editingId ? 'Cập Nhật' : 'Lưu Voucher'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition active:scale-95"
              >
                Hủy
              </button>
            )}
          </div>
        </form>

        {/* Right Side: List & AI Assistant */}
        <div className="space-y-6">
          {/* List of Vouchers */}
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <TicketPercent size={18} className="text-amber-500" />
              Chi Tiết Danh Sách Voucher ({vouchers.length})
            </h2>

            {loading ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2 justify-center">
                <RefreshCw size={24} className="animate-spin text-amber-500" />
                <span>Đang kết nối cơ sở dữ liệu...</span>
              </div>
            ) : vouchers.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
                Chưa có voucher hoạt động nào trong hệ thống.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {vouchers.map((v) => {
                  const isFreeship = v.discountType === 'FREE_SHIPPING';
                  const isPercent = v.discountType === 'PERCENTAGE';
                  return (
                    <div
                      key={v.id ?? v.code}
                      className="p-4 border border-slate-100 bg-slate-50/40 rounded-2xl hover:border-amber-300 hover:bg-white transition relative group flex flex-col justify-between"
                    >
                      <div>
                        {/* Upper Section */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <span className="font-mono text-sm font-black text-slate-800 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-lg">
                              {v.code}
                            </span>
                          </div>
                          
                          {/* Badge Status */}
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              v.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>

                        {/* Mid Details */}
                        <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                          <div>
                            Loại: <span className="font-semibold text-slate-800">
                              {isFreeship ? 'Freeship' : isPercent ? 'Giảm %' : 'Trực tiếp'}
                            </span>
                          </div>
                          <div>
                            Giảm:{' '}
                            <span className="font-semibold text-emerald-600">
                              {isPercent ? `${v.discountAmount}%` : formatCurrency(v.discountAmount)}
                            </span>
                            {isPercent && v.maxDiscountAmount && v.maxDiscountAmount > 0 ? (
                              <span className="text-[10px] text-slate-400 block">
                                (Tối đa: {formatCurrency(v.maxDiscountAmount)})
                              </span>
                            ) : null}
                          </div>
                          <div>
                            Giá trị đơn tối thiểu:{' '}
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(v.minOrderValue)}
                            </span>
                          </div>

                          {(v.startDate || v.endDate) && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                              <Calendar size={10} />
                              <span>
                                {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : 'Mãi mãi'}
                              </span>
                            </div>
                          )}
                        </div>

                        {v.description && (
                          <p className="mt-3 text-xs text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100/50">
                            {v.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons hover display */}
                      <div className="mt-4 flex gap-2 justify-end border-t border-slate-100/80 pt-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(v)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-amber-600 transition"
                        >
                          <Edit2 size={11} />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => v.id && handleDelete(v.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition"
                        >
                          <Trash2 size={11} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* AI Advisor Panel */}
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Sparkles size={18} className="text-amber-500 animate-pulse" />
              Cố Vấn Khuyến Mãi AI Trực Tuyến
            </h2>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Trợ lý AI sẽ tự động phân tích mục tiêu kinh doanh của bạn và đề xuất các cấu hình Voucher tối ưu nhất.
            </p>
            <textarea
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              placeholder="Ví dụ: Đề xuất cho tôi một mã giảm giá để tăng doanh số bán sách mùa hè, nhắm tới các đơn trên 500k..."
              className="w-full min-h-[90px] p-3 text-sm border border-slate-200 rounded-2xl focus:border-amber-500 focus:outline-none leading-relaxed"
            />
            <button
              onClick={askAI}
              disabled={aiLoading || !aiQuestion.trim()}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 disabled:opacity-50 transition active:scale-95 shadow-sm"
            >
              {aiLoading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  AI đang tư duy...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Phát sinh đề xuất AI
                </>
              )}
            </button>
            {aiAnswer && (
              <div className="mt-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-2">Đề xuất từ Cố vấn AI</span>
                <pre className="text-xs text-slate-700 white-space-pre-wrap leading-relaxed font-sans">{aiAnswer}</pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
