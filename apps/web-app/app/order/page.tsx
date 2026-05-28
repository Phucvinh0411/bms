"use client"

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  ShoppingBag, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft, 
  RefreshCw, 
  FileText, 
  MapPin, 
  User, 
  Phone, 
  BookOpen,
  DollarSign
} from 'lucide-react'
import { useAuth } from '@/src/auth/context'
import { getEffectiveUserId } from '@/src/cart/utils/userContext'
import { getOrders, cancelOrder } from '@/src/api/checkoutService'
import { bookService } from '@/src/api/bookService'
import type { CheckoutResponse } from '@/src/checkout/types'

interface ResolvedBook {
  id: number
  title: string
  author?: string
  imageUrl?: string
}

export default function OrdersDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoading: authLoading } = useAuth()
  
  const [orders, setOrders] = useState<CheckoutResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  
  // Cache để lưu thông tin sách đã load, tránh gọi lại nhiều lần
  const [booksCache, setBooksCache] = useState<Record<number, ResolvedBook>>({})
  const [loadingBooks, setLoadingBooks] = useState<Record<number, boolean>>({})

  const orderIdParam = searchParams.get('orderId')
  const userId = getEffectiveUserId()

  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    []
  )

  // --- TẢI DANH SÁCH ĐƠN HÀNG ---
  async function loadOrders(silent = false) {
    if (!userId) return
    if (!silent) setLoading(true)
    try {
      const allOrders = await getOrders()
      // Lọc các đơn hàng của User hiện tại
      const userOrders = allOrders
        .filter((o) => o.userId === userId)
        .sort((a, b) => b.id - a.id) // Đơn mới nhất lên đầu
      
      setOrders(userOrders)

      // Tự động chọn đơn hàng đầu tiên hoặc đơn hàng từ URL
      if (userOrders.length > 0) {
        if (orderIdParam) {
          const matched = userOrders.find((o) => o.id === Number(orderIdParam))
          setSelectedOrderId(matched ? matched.id : userOrders[0].id)
        } else {
          setSelectedOrderId((prev) => prev ?? userOrders[0].id)
        }
      }
    } catch (error: unknown) {
      toast.error(
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Không tải được danh sách đơn hàng'
      )
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Khởi động load đơn hàng khi auth đã sẵn sàng
  useEffect(() => {
    if (!authLoading && isSignedIn) {
      loadOrders()
    }
  }, [authLoading, isSignedIn])

  // Tự động cập nhật selectedOrderId khi orderIdParam thay đổi
  useEffect(() => {
    if (orderIdParam && orders.length > 0) {
      const matched = orders.find((o) => o.id === Number(orderIdParam))
      if (matched) {
        setSelectedOrderId(matched.id)
      }
    }
  }, [orderIdParam, orders])

  // Tự động chuyển trang đăng nhập nếu chưa authenticate
  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.replace(`/auth/login?redirect=/order`)
    }
  }, [authLoading, isSignedIn, router])

  // Lấy đối tượng đơn hàng đang được chọn
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) ?? null
  }, [orders, selectedOrderId])

  // --- TẢI THÔNG TIN SÁCH CHO CÁC SẢN PHẨM TRONG ĐƠN HÀNG ĐANG CHỌN ---
  useEffect(() => {
    if (!selectedOrder) return

    selectedOrder.items?.forEach((item: any) => {
      const bookId = item.bookId
      if (booksCache[bookId] || loadingBooks[bookId]) return

      setLoadingBooks((prev) => ({ ...prev, [bookId]: true }))

      bookService.getBookById(bookId)
        .then((book) => {
          if (book) {
            setBooksCache((prev) => ({
              ...prev,
              [bookId]: {
                id: bookId,
                title: book.title,
                author: book.author,
                imageUrl: book.imageUrl,
              },
            }))
          }
        })
        .catch(() => {
          // Fallback nếu không tải được sách
          setBooksCache((prev) => ({
            ...prev,
            [bookId]: {
              id: bookId,
              title: `Sách học thuật #${bookId}`,
              author: 'BMS Author',
            },
          }))
        })
        .finally(() => {
          setLoadingBooks((prev) => ({ ...prev, [bookId]: false }))
        })
    })
  }, [selectedOrder, booksCache, loadingBooks])

  // --- HỦY ĐƠN HÀNG ---
  async function handleCancelOrder(id: number) {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn HỦY đơn hàng #${id} không?`)
    if (!confirmed) return

    setActionLoading(true)
    try {
      await cancelOrder(id)
      toast.success(`Đã hủy đơn hàng #${id} thành công!`)
      await loadOrders(true) // Tải lại danh sách đơn hàng ngầm
    } catch (error: unknown) {
      const msg = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : 'Hủy đơn hàng thất bại'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
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

  if (authLoading || !isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] px-4 py-12">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-[1240px] items-center justify-center text-slate-500">
          Đang tải thông tin tài khoản và đơn hàng...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-84px)] bg-[radial-gradient(circle_at_top,_#fff5e6_0%,_#f8fafc_40%,_#e9eef6_100%)] px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-[1240px] space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#a28354]">Bảng điều khiển</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              Quản lý đơn hàng của bạn
            </h1>
            <p className="text-sm text-slate-500">Xem lịch sử đặt sách, theo dõi hành trình giao nhận và quản lý trạng thái.</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => loadOrders()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Tải lại
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 shadow-md transition"
            >
              <ArrowLeft size={14} />
              Tiếp tục mua sách
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          
          {/* SIDEBAR: Danh sách đơn hàng bên trái */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1">
              <ShoppingBag size={18} className="text-[#a28354]" />
              Lịch sử đặt hàng ({orders.length})
            </h2>

            {loading && (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
                Đang tải danh sách đơn hàng...
              </div>
            )}

            {!loading && orders.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-slate-500 space-y-3">
                <ShoppingBag size={36} className="mx-auto text-slate-300" />
                <p className="text-sm">Bạn chưa có đơn đặt sách nào trong hệ thống.</p>
                <Link href="/" className="inline-block rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white uppercase hover:bg-amber-500 transition">
                  Mua sắm ngay
                </Link>
              </div>
            )}

            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {orders.map((order) => {
                const isSelected = order.id === selectedOrderId
                const date = order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN') : 'Mới'
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/50 shadow-md ring-1 ring-amber-400 scale-[1.01]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">ĐƠN HÀNG #{order.id}</span>
                      {renderStatusBadge(order.status)}
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>Ngày đặt: {date}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {formattedCurrency.format(order.finalTotal ?? 0)}
                      </span>
                    </div>

                    {order.items && (
                      <div className="mt-2 text-xs text-slate-400 truncate">
                        Sản phẩm: {order.items.reduce((sum, item: any) => sum + item.quantity, 0)} cuốn sách
                      </div>
                    )}

                    {order.paymentStatus && (
                      <div className="mt-2 flex items-center justify-between text-xs border-t border-slate-100/60 pt-2">
                        <span className="text-slate-400">Thanh toán:</span>
                        <span className={`font-bold ${
                          order.paymentStatus.includes('ĐÃ') ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* DETAIL PANEL: Chi tiết đơn hàng được chọn bên phải */}
          <div className="min-w-0">
            {selectedOrder ? (
              <div className="rounded-3xl border border-[#e7dfd1] bg-white/90 p-6 sm:p-8 shadow-[0_18px_40px_rgba(106,78,32,0.1)] backdrop-blur space-y-6">
                
                {/* Header chi tiết */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                        Chi tiết đơn hàng #{selectedOrder.id}
                      </h2>
                      {orderIdParam && Number(orderIdParam) === selectedOrder.id && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">VỪA ĐẶT</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Đặt lúc: {selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleString('vi-VN') : 'Không rõ'}
                    </p>
                  </div>
                  <div>
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                </div>

                {/* Grid Thông Tin Nhận Hàng & Hóa Đơn */}
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Cột 1: Thông tin người nhận */}
                  <div className="space-y-3 rounded-2xl bg-slate-50/70 p-4 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={16} className="text-[#a28354]" />
                      Thông tin nhận hàng
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {selectedOrder.shippingAddress?.split(',')[0] || 'Người nhận'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 leading-relaxed">
                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-xs">{selectedOrder.shippingAddress || 'Chưa cung cấp địa chỉ'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Trạng thái Thanh Toán */}
                  <div className="space-y-3 rounded-2xl bg-[#fafbfa] p-4 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-emerald-600" />
                        Trạng thái thanh toán
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Phương thức thanh toán được chọn để đối soát giao dịch:
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {selectedOrder.checkoutUrl ? 'Thanh toán trực tuyến VietQR' : 'Thanh toán khi nhận hàng (COD)'}
                      </p>
                    </div>

                    {/* Nút hủy đơn hàng nếu là PENDING */}
                    {selectedOrder.status.toUpperCase() === 'PENDING' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(selectedOrder.id)}
                          disabled={actionLoading}
                          className="w-full rounded-xl bg-rose-50 border border-rose-200 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition disabled:opacity-50"
                        >
                          {actionLoading ? 'Đang thực hiện hủy...' : 'Hủy đơn hàng này'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danh Sách Cuốn Sách Đã Mua */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={16} className="text-[#a28354]" />
                    Sách đã đặt
                  </h3>
                  
                  <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                    {selectedOrder.items?.map((item: any) => {
                      const book = booksCache[item.bookId]
                      return (
                        <div key={item.id} className="flex gap-4 py-4 items-center">
                          {/* Book Image */}
                          <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-slate-100 border border-slate-200">
                            {book?.imageUrl ? (
                              <img src={book.imageUrl} alt={book.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">Book</div>
                            )}
                          </div>

                          {/* Book Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="truncate text-sm font-semibold text-slate-900">
                              {book?.title || `Sách Mã #${item.bookId}`}
                            </h4>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {book?.author || 'Tác giả BMS'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Số lượng: {item.quantity}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-slate-900">
                              {formattedCurrency.format((item.priceAtPurchase ?? 0) * item.quantity)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Đơn giá: {formattedCurrency.format(item.priceAtPurchase ?? 0)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Tổng hóa đơn thanh toán */}
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 space-y-3 bg-[#fafafa]">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Tổng tiền sách:</span>
                    <span className="font-semibold text-slate-800">{formattedCurrency.format(selectedOrder.subtotalAmount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold text-slate-800">{formattedCurrency.format(selectedOrder.baseShippingFee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Giảm giá vận chuyển:</span>
                    <span className="font-semibold text-emerald-600">-{formattedCurrency.format(selectedOrder.shippingDiscount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Voucher áp dụng:</span>
                    <span className="font-semibold text-emerald-600">-{formattedCurrency.format(selectedOrder.orderDiscount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-slate-900">
                    <span className="text-base font-bold">Thành tiền thực tế:</span>
                    <span className="text-xl font-extrabold text-amber-700">{formattedCurrency.format(selectedOrder.finalTotal ?? 0)}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-24 text-center text-slate-400">
                <FileText size={48} className="mx-auto text-slate-200 mb-3" />
                Vui lòng chọn một đơn hàng bên danh sách để xem chi tiết thông tin thanh toán & giao nhận.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
