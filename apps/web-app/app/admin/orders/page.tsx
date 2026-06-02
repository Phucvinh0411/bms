'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  MapPin,
  User,
  Phone,
  CreditCard,
  Banknote,
  Calendar,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Filter
} from 'lucide-react'
import { useAuth } from '@/src/auth/context'
import { getOrders, cancelOrder, confirmOrder } from '@/src/api/checkoutService'
import { bookService } from '@/src/api/bookService'
import type { CheckoutResponse } from '@/src/checkout/types'

interface ResolvedBook {
  id: number
  title: string
  coverImage?: string
}

export default function AdminOrdersPage() {
  const { user: activeUser, isSignedIn, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam = searchParams.get('orderId')

  // State quản lý danh sách và trạng thái tải
  const [orders, setOrders] = useState<CheckoutResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  // Cache thông tin sách để hiển thị tên sách thay vì chỉ ID
  const [booksCache, setBooksCache] = useState<Record<number, ResolvedBook>>({})

  // State cho Tìm kiếm và Lọc trạng thái
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELED'>('ALL')

  // State cho Hộp thoại Xác nhận (Custom Confirm Modal)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
    isDangerous?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  })

  // Chuyển đổi định dạng tiền tệ VND
  const formattedCurrency = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  })

  // Bảo vệ Router: Chỉ cho phép ADMIN truy cập
  useEffect(() => {
    if (!authLoading) {
      if (!isSignedIn || activeUser?.role !== 'ADMIN') {
        router.push('/')
      }
    }
  }, [authLoading, isSignedIn, activeUser, router])

  // Tải danh sách đơn hàng từ Server
  async function loadOrders(isSilent = false) {
    if (!isSilent) setLoading(true)
    try {
      const data = await getOrders()
      // Sắp xếp đơn hàng mới nhất lên trên
      const sorted = [...data].sort((a, b) => (b.id || 0) - (a.id || 0))
      setOrders(sorted)

      // Tự động chọn đơn hàng đầu tiên hoặc theo Query Param orderId
      if (sorted.length > 0) {
        if (orderIdParam) {
          const matched = sorted.find(o => o.id === Number(orderIdParam))
          if (matched) setSelectedOrderId(matched.id)
          else setSelectedOrderId(sorted[0].id)
        } else if (!selectedOrderId || !sorted.find(o => o.id === selectedOrderId)) {
          setSelectedOrderId(sorted[0].id)
        }
      }
    } catch (error: unknown) {
      console.error(error)
      toast.error('Lấy danh sách đơn hàng thất bại!')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSignedIn && activeUser?.role === 'ADMIN') {
      loadOrders()
    }
  }, [isSignedIn, activeUser])

  // --- TRA CỨU CHI TIẾT SÁCH (CACHE) ---
  useEffect(() => {
    if (orders.length === 0) return

    const missingIds: number[] = []
    orders.forEach(ord => {
      ord.items?.forEach(item => {
        if (item.bookId && !missingIds.includes(item.bookId)) {
          missingIds.push(item.bookId)
        }
      })
    })

    if (missingIds.length === 0) return

    missingIds.forEach((id) => {
      setBooksCache(prev => {
        if (prev[id]) return prev;

        bookService.getBookById(id).then(book => {
          if (book) {
            setBooksCache(latest => {
              if (latest[id]) return latest;
              return {
                ...latest,
                [id]: { id, title: book.title, coverImage: book.coverImage as string | undefined }
              };
            });
          }
        }).catch(err => {
          console.warn(`Không lấy được thông tin sách ID: ${id}`, err);
        });

        return prev;
      });
    });
  }, [orders])

  // --- XỬ LÝ ADMIN XÁC NHẬN ĐƠN HÀNG (CUSTOM MODAL DIALOG) ---
  function triggerConfirmOrder(id: number) {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận duyệt đơn hàng',
      message: `Bạn có chắc muốn XÁC NHẬN duyệt đơn hàng #${id} không? Hệ thống sẽ cập nhật trạng thái đơn thành Đã xác nhận và tiến hành quy trình đóng gói.`,
      confirmText: 'Duyệt đơn hàng',
      cancelText: 'Quay lại',
      isDangerous: false,
      onConfirm: async () => {
        setActionLoading(true)
        try {
          await confirmOrder(id)
          toast.success(`Đã xác nhận đơn hàng #${id} thành công!`)
          await loadOrders(true)
        } catch (error: unknown) {
          const msg = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : 'Xác nhận đơn hàng thất bại'
          toast.error(msg)
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  // --- XỬ LÝ ADMIN HỦY ĐƠN HÀNG (CUSTOM MODAL DIALOG) ---
  function triggerCancelOrder(id: number) {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy đơn hàng này?',
      message: `Bạn có chắc chắn muốn HỦY đơn hàng #${id} không? Hành động hủy đơn hàng này không thể được hoàn tác sau khi thực thi.`,
      confirmText: 'Hủy đơn ngay',
      cancelText: 'Không hủy',
      isDangerous: true,
      onConfirm: async () => {
        setActionLoading(true)
        try {
          await cancelOrder(id)
          toast.success(`Đã hủy đơn hàng #${id} thành công!`)
          await loadOrders(true)
        } catch (error: unknown) {
          const msg = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : 'Hủy đơn hàng thất bại'
          toast.error(msg)
        } finally {
          setActionLoading(false)
        }
      }
    })
  }

  // --- ĐỊNH NGHĨA BADGE TRẠNG THÁI ---
  function renderStatusBadge(status: string) {
    const cleanStatus = status.toUpperCase()
    switch (cleanStatus) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
            <AlertCircle size={12} className="animate-pulse" /> Chờ xử lý
          </span>
        )
      case 'AWAITING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-800 border border-violet-200">
            <AlertCircle size={12} className="animate-pulse" /> Chờ thanh toán
          </span>
        )
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
            <CheckCircle2 size={12} /> Đã xác nhận
          </span>
        )
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 border border-indigo-200">
            <Truck size={12} className="animate-bounce" /> Đang giao hàng
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} /> Hoàn tất
          </span>
        )
      case 'CANCELED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
            <XCircle size={12} /> Đã hủy
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 border border-slate-200">
            {status}
          </span>
        )
    }
  }

  // --- LỌC ĐƠN HÀNG THEO TỪ KHÓA & TRẠNG THÁI ---
  const filteredOrders = orders.filter((order) => {
    // 1. Lọc theo trạng thái
    const statusMatch =
      statusFilter === 'ALL' || order.status.toUpperCase() === statusFilter.toUpperCase()

    // 2. Lọc theo từ khóa tìm kiếm (Mã đơn hàng, Địa chỉ, Số điện thoại, Tên người nhận)
    const term = searchTerm.toLowerCase().trim()
    const idMatch = String(order.id).includes(term)
    const addressMatch = order.shippingAddress?.toLowerCase().includes(term)

    // Tìm tên sách tương ứng trong items
    const bookTitleMatch = order.items?.some(item => {
      const bookObj = booksCache[item.bookId]
      return bookObj?.title.toLowerCase().includes(term)
    })

    return statusMatch && (idMatch || addressMatch || bookTitleMatch || term === '')
  })

  const selectedOrder = orders.find((o) => o.id === selectedOrderId)

  if (authLoading || !isSignedIn) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500 text-sm font-semibold">
        Đang xác thực thông tin quyền quản trị...
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Quản lý Đơn hàng
          </h1>
          <p className="text-xs text-slate-500 mt-1">Dành cho Quản trị viên: Xem chi tiết toàn bộ đơn hàng của hệ thống, thực hiện duyệt đơn và hủy đơn hàng.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => loadOrders()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Tải lại danh sách
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* CỘT TRÁI: DANH SÁCH ĐƠN HÀNG (Sidebar) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Thanh tìm kiếm & lọc nhanh */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm ID đơn hàng, tên sách, địa chỉ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-[#1e293b] focus:bg-white transition"
              />
            </div>

            {/* Trạng thái Tabs */}
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELED'] as const).map((status) => {
                const isActive = statusFilter === status
                const label =
                  status === 'ALL' ? 'Tất cả' :
                    status === 'PENDING' ? 'Chờ duyệt' :
                      status === 'AWAITING_PAYMENT' ? 'Chờ thanh toán' :
                        status === 'CONFIRMED' ? 'Đã duyệt' :
                          status === 'SHIPPING' ? 'Đang giao' :
                            status === 'COMPLETED' ? 'Hoàn tất' : 'Đã hủy'

                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition ${isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hộp danh sách đơn hàng */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách đơn hàng...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">Không tìm thấy đơn hàng nào phù hợp!</div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = order.id === selectedOrderId
                const itemsCount = order.items?.reduce((acc, curr) => acc + curr.quantity, 0) || 0
                const firstBookId = order.items?.[0]?.bookId
                const firstBookName = firstBookId ? booksCache[firstBookId]?.title : null

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 text-left cursor-pointer transition flex items-center justify-between ${isSelected ? 'bg-slate-50/80 border-l-4 border-slate-900' : 'hover:bg-slate-50/40'
                      }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">#Đơn hàng {order.id}</span>
                        {renderStatusBadge(order.status)}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN') : ''} • {itemsCount} sản phẩm
                      </p>
                      {firstBookName && (
                        <p className="text-[11px] font-semibold text-slate-600 truncate max-w-[200px]">
                          {firstBookName} {order.items && order.items.length > 1 ? `và ${order.items.length - 1} cuốn khác` : ''}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="text-xs font-black text-slate-800">
                        {formattedCurrency.format(order.finalTotal ?? 0)}
                      </span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT ĐƠN HÀNG (Admin Action Detail Panel) */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            (() => {
              // Tách thông tin nhận hàng
              const addressParts = selectedOrder.shippingAddress ? selectedOrder.shippingAddress.split(', ') : []
              const recipientName = addressParts[0] || 'Người nhận'
              const phoneNumber = addressParts[1] || 'Không có số điện thoại'
              const addressLine = addressParts.slice(2).join(', ') || selectedOrder.shippingAddress || 'Chưa cung cấp địa chỉ'

              const currentStatus = selectedOrder.status.toUpperCase()

              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">

                  {/* Top Bar Detail */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-2">
                    <div className="text-left">
                      <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                        Chi Tiết Đơn Hàng #{selectedOrder.id}
                      </h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Ngày đặt: {selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleString('vi-VN') : ''}
                      </p>
                    </div>
                    <div>
                      {renderStatusBadge(selectedOrder.status)}
                    </div>
                  </div>

                  {/* SẢN PHẨM TRONG ĐƠN HÀNG */}
                  <div className="space-y-3 text-left">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Danh sách sản phẩm</h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
                      {selectedOrder.items?.map((item) => {
                        const bookObj = booksCache[item.bookId]
                        return (
                          <div key={item.id} className="p-3 flex gap-3 items-center justify-between text-xs">
                            <div className="flex gap-3 items-center">
                              {bookObj?.coverImage ? (
                                <img
                                  src={bookObj.coverImage}
                                  alt={bookObj.title}
                                  className="h-10 w-8 object-cover rounded shadow-sm shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-8 bg-slate-200 rounded flex items-center justify-center shrink-0">
                                  <FileText size={14} className="text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 truncate max-w-[240px]">{bookObj?.title || `Sách ID: ${item.bookId}`}</p>
                                <p className="text-[10px] text-slate-400">Số lượng: {item.quantity}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-800">
                                {formattedCurrency.format((item.priceAtPurchase ?? 0) * item.quantity)}
                              </p>
                              <p className="text-[9px] text-slate-400">Đơn giá: {formattedCurrency.format(item.priceAtPurchase ?? 0)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* THÔNG TIN KHÁCH HÀNG & PHƯƠNG THỨC THANH TOÁN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">

                    {/* Thông tin giao hàng */}
                    <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Người nhận & Địa chỉ</p>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5"><User size={12} /> {recipientName}</p>
                        <p className="flex items-center gap-1.5"><Phone size={12} /> {phoneNumber}</p>
                        <p className="text-[11px] leading-relaxed flex items-start gap-1.5"><MapPin size={12} className="shrink-0 mt-0.5" /> {addressLine}</p>
                      </div>
                    </div>

                    {/* Phương thức thanh toán */}
                    <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Thanh toán</p>
                      <div className="flex gap-2 items-start text-xs">
                        <div className="mt-0.5 p-1 rounded bg-slate-200 text-slate-700">
                          {selectedOrder.paymentStatus?.includes('VietQR') ? <CreditCard size={14} /> : <Banknote size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {selectedOrder.paymentStatus?.includes('VietQR') ? 'Chuyển khoản VietQR' : 'Thanh toán COD'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{selectedOrder.paymentStatus}</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* TỔNG HÓA ĐƠN CHI TIẾT */}
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/20 text-left space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Tạm tính tiền sách:</span>
                      <span className="font-semibold text-slate-800">{formattedCurrency.format(selectedOrder.subtotalAmount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Phí vận chuyển cơ bản:</span>
                      <span className="font-semibold text-slate-800">{formattedCurrency.format(selectedOrder.baseShippingFee ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Giảm giá vận chuyển:</span>
                      <span className="font-semibold text-emerald-600">-{formattedCurrency.format(selectedOrder.shippingDiscount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Voucher áp dụng:</span>
                      <span className="font-semibold text-emerald-600">-{formattedCurrency.format(selectedOrder.orderDiscount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-slate-900 text-sm font-black">
                      <span>Tổng thanh toán thực tế:</span>
                      <span className="text-base text-amber-700">{formattedCurrency.format(selectedOrder.finalTotal ?? 0)}</span>
                    </div>
                  </div>

                  {/* BẢNG CÔNG CỤ QUẢN TRỊ VIÊN (ADMIN CONTROL PANEL) */}
                  <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/20 text-left space-y-4 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5 border-b border-rose-200/50 pb-2">
                      🛡️ Bảng điều khiển quản trị (Admin Actions)
                    </h3>

                    {/* 1. Trạng thái & Xác nhận/Hủy */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">Trạng thái đơn hàng</p>
                        <p className="text-[10px] text-slate-400">Xác nhận đơn hàng mới duyệt hoặc Hủy đơn trực tiếp.</p>
                      </div>

                      <div className="flex gap-2">
                        {/* Nút Xác nhận đơn */}
                        <button
                          type="button"
                          disabled={actionLoading || (currentStatus !== 'PENDING' && currentStatus !== 'AWAITING_PAYMENT')}
                          onClick={() => triggerConfirmOrder(selectedOrder.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0"
                        >
                          {currentStatus === 'CONFIRMED' ? '✓ Đã duyệt' : 'Xác nhận đơn'}
                        </button>

                        {/* Nút Hủy đơn */}
                        <button
                          type="button"
                          disabled={actionLoading || currentStatus === 'CANCELED' || currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED'}
                          onClick={() => triggerCancelOrder(selectedOrder.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0"
                        >
                          Hủy đơn hàng
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              )
            })()
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-24 text-center text-slate-400">
              <FileText size={48} className="mx-auto text-slate-200 mb-3" />
              Chọn một đơn hàng bên danh sách để xem chi tiết & thực hiện các thao tác quản trị.
            </div>
          )}
        </div>

      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all border border-slate-100 animate-scale-up text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${confirmModal.isDangerous ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-full text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition border border-slate-200"
              >
                {confirmModal.cancelText || 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm()
                  setConfirmModal(prev => ({ ...prev, isOpen: false }))
                }}
                className={`px-4 py-2 rounded-full text-[11px] font-bold text-white transition shadow ${confirmModal.isDangerous
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
              >
                {confirmModal.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
