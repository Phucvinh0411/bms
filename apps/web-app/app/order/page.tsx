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
  DollarSign,
  CreditCard,
  Banknote,
  Star
} from 'lucide-react'
import { useAuth } from '@/src/auth/context'
import { getEffectiveUserId } from '@/src/cart/utils/userContext'
import { getOrders, cancelOrder, changeOrderPaymentMethod, confirmOrder } from '@/src/api/checkoutService'
import { bookService } from '@/src/api/bookService'
import type { CheckoutResponse } from '@/src/checkout/types'
import { reviewService } from '@/src/api/reviewService'

interface ResolvedBook {
  id: number
  title: string
  author?: string
  imageUrl?: string
}

export default function OrdersDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoading: authLoading, activeUser } = useAuth()
  
  const [orders, setOrders] = useState<CheckoutResponse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  // Review & Rating State variables
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewBookId, setReviewBookId] = useState<number | null>(null)
  const [reviewBookTitle, setReviewBookTitle] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

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
    onConfirm: () => {},
  })
  
  // Cache để lưu thông tin sách đã load, tránh gọi lại nhiều lần
  const [booksCache, setBooksCache] = useState<Record<number, ResolvedBook>>({})
  const [loadingBooks, setLoadingBooks] = useState<Record<number, boolean>>({})

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Filter by Status
      if (statusFilter !== 'ALL') {
        const orderStatus = o.status?.toUpperCase() || ''
        if (statusFilter === 'CANCELLED') {
          if (orderStatus !== 'CANCELLED' && orderStatus !== 'CANCELED') return false
        } else if (orderStatus !== statusFilter) {
          return false
        }
      }
      
      // 2. Filter by Search Query
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase().trim()
      
      if (String(o.id).includes(query)) return true
      if (o.status?.toLowerCase().includes(query)) return true
      if (o.shippingAddress?.toLowerCase().includes(query)) return true
      
      const hasBookTitle = o.items?.some((item) => {
        const book = booksCache[item.bookId]
        return book?.title?.toLowerCase().includes(query)
      })
      if (hasBookTitle) return true
      
      return false
    })
  }, [orders, searchQuery, statusFilter, booksCache])

  const orderIdParam = searchParams.get('orderId')
  const statusParam = searchParams.get('status')
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

  // Tải lại danh sách đơn hàng khi URL param thay đổi (ví dụ: sau khi redirect thanh toán thành công)
  useEffect(() => {
    if (orderIdParam && isSignedIn) {
      loadOrders(true)
    }
  }, [orderIdParam, isSignedIn])

  // Tự động cập nhật selectedOrderId khi orderIdParam thay đổi
  useEffect(() => {
    if (orderIdParam && orders.length > 0) {
      const matched = orders.find((o) => o.id === Number(orderIdParam))
      if (matched) {
        setSelectedOrderId(matched.id)
      }
    }
  }, [orderIdParam, orders])

  // --- LẮNG NGHE SỰ KIỆN THANH TOÁN THỜI GIAN THỰC (SSE) CHO THANH TOÁN LẠI ---
  useEffect(() => {
    const isSuccessStatus = statusParam === 'success' || statusParam === 'PAID'
    if (isSuccessStatus && orderIdParam && isSignedIn) {
      toast.loading('Đang kết nối tới cổng thanh toán để chờ xác thực chuyển khoản...', { id: 'repayment-validation' })

      let sseBase = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL
      if (!sseBase) {
        const protocol = window.location.protocol
        const host = window.location.hostname
        const port = window.location.port === '3000' ? '' : (window.location.port ? `:${window.location.port}` : '')
        sseBase = `${protocol}//${host}${port}/api/v1/orders`
      }
      
      const eventSource = new EventSource(`${sseBase}/api/payments/sse/${orderIdParam}`)

      eventSource.addEventListener('INIT', (event: MessageEvent) => {
        toast.loading(event.data, { id: 'repayment-validation' })
      })

      eventSource.addEventListener('PAYMENT_STATUS', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          if (data.status === 'PAID') {
            toast.success('Thanh toán thành công qua VietQR!', { id: 'repayment-validation' })
            loadOrders(true)
            router.replace('/order?orderId=' + orderIdParam)
          }
        } catch {
          if (event.data && event.data.includes('PAID')) {
            toast.success('Thanh toán thành công qua VietQR!', { id: 'repayment-validation' })
            loadOrders(true)
            router.replace('/order?orderId=' + orderIdParam)
          }
        }
        eventSource.close()
      })

      eventSource.onerror = () => {
        toast.dismiss('repayment-validation')
        eventSource.close()
      }

      return () => {
        eventSource.close()
        toast.dismiss('repayment-validation')
      }
    }
  }, [statusParam, orderIdParam, isSignedIn, router])

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

  // --- CHUYỂN ĐỔI PHƯƠNG THỨC THANH TOÁN ---
  async function handleSwitchPaymentMethod(method: 'PAYOS' | 'COD') {
    if (!selectedOrderId) return
    setActionLoading(true)
    try {
      const returnUrl = `${window.location.origin}/order?status=success&orderId=${selectedOrderId}`
      const cancelUrl = `${window.location.origin}/order?orderId=${selectedOrderId}`
      const updatedOrder = await changeOrderPaymentMethod(selectedOrderId, method, returnUrl, cancelUrl)
      
      toast.success(
        method === 'PAYOS' 
          ? 'Đã cập nhật cổng thanh toán VietQR! Đang chuyển hướng...' 
          : 'Đã chuyển đổi sang phương thức thanh toán COD thành công!'
      )
      
      // Nếu chọn PAYOS và có checkoutUrl, chuyển hướng trực tiếp trên cùng một tab để tránh bị trình duyệt chặn pop-up
      if (method === 'PAYOS' && updatedOrder.checkoutUrl) {
        window.location.href = updatedOrder.checkoutUrl
      }

      await loadOrders(true) // Tải lại danh sách đơn hàng ngầm để update UI
    } catch (error: unknown) {
      const msg = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : 'Chuyển đổi phương thức thanh toán thất bại'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // --- HỦY ĐƠN HÀNG (CUSTOM CONFIRM MODAL) ---
  function triggerCancelOrder(id: number) {
    setConfirmModal({
      isOpen: true,
      title: 'Hủy đơn hàng',
      message: `Bạn có chắc chắn muốn HỦY đơn hàng #${id} không? Hành động hủy đơn hàng này không thể được hoàn tác sau khi thực thi.`,
      confirmText: 'Xác nhận hủy',
      cancelText: 'Quay lại',
      isDangerous: true,
      onConfirm: async () => {
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
    })
  }

  // --- ADMIN XÁC NHẬN ĐƠN HÀNG (CUSTOM CONFIRM MODAL) ---
  function triggerConfirmOrder(id: number) {
    setConfirmModal({
      isOpen: true,
      title: 'Duyệt đơn hàng (Admin)',
      message: `Bạn có chắc chắn muốn XÁC NHẬN duyệt đơn hàng #${id} không? Trạng thái sẽ cập nhật sang Đã duyệt.`,
      confirmText: 'Duyệt đơn ngay',
      cancelText: 'Hủy bỏ',
      isDangerous: false,
      onConfirm: async () => {
        setActionLoading(true)
        try {
          await confirmOrder(id)
          toast.success(`Đã xác nhận đơn hàng #${id} thành công!`)
          await loadOrders(true) // Tải lại danh sách đơn hàng ngầm
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

  // --- MỞ MODAL ĐÁNH GIÁ ---
  function openReviewModal(bookId: number, title: string) {
    setReviewBookId(bookId)
    setReviewBookTitle(title)
    setReviewRating(5)
    setReviewContent('')
    setIsReviewModalOpen(true)
  }

  // --- GỬI ĐÁNH GIÁ LÊN BACKEND ---
  async function handleSubmittingReview() {
    if (!reviewBookId) return
    if (!reviewContent.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá sản phẩm!')
      return
    }
    setSubmittingReview(true)
    try {
      const userDisplayName = activeUser?.fullName 
        || activeUser?.email 
        || 'Khách hàng BMS'

      await reviewService.addReviewToBook(reviewBookId, {
        content: reviewContent.trim(),
        rating: reviewRating,
        userName: userDisplayName,
        userId: activeUser?.id ? Number(activeUser.id) : 9999
      })

      toast.success('Gửi đánh giá thành công! Cảm ơn phản hồi của bạn.')
      setIsReviewModalOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Đánh giá sản phẩm thất bại')
    } finally {
      setSubmittingReview(false)
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

            {/* Search and Status Filter Container */}
            {orders.length > 0 && (
              <div className="space-y-2 px-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã ĐH, sách, sđt, tên..."
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 pl-9 text-xs shadow-sm transition focus:border-[#a28354] focus:outline-none focus:ring-1 focus:ring-[#a28354] text-slate-900 placeholder-slate-400"
                  />
                  <svg
                    className="absolute left-4 top-2.5 h-3.5 w-3.5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-2 h-4 w-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                  {[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'PENDING', label: 'Chờ duyệt' },
                    { key: 'AWAITING_PAYMENT', label: 'Chờ thanh toán' },
                    { key: 'SHIPPING', label: 'Đang giao' },
                    { key: 'COMPLETED', label: 'Hoàn tất' },
                    { key: 'CANCELLED', label: 'Đã hủy' }
                  ].map((tab) => {
                    const isActive = statusFilter === tab.key
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition duration-150 shadow-sm border ${
                          isActive
                            ? 'bg-[#a28354] text-white border-[#a28354]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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

            {!loading && orders.length > 0 && filteredOrders.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-xs text-slate-500">
                Không tìm thấy đơn hàng phù hợp.
              </div>
            )}

            <div className="space-y-3 max-h-[680px] overflow-y-auto p-1.5">
              {filteredOrders.map((order) => {
                const isSelected = order.id === selectedOrderId
                const date = order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN') : 'Mới'
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 relative ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/50 shadow-md ring-2 ring-amber-400 z-10 scale-[1.01]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm z-0'
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
          <div className="min-w-0 animate-fade-in">
            {selectedOrder ? (() => {
              // Phân tích chuỗi shippingAddress: recipientName, phoneNumber, addressLine
              const addressParts = selectedOrder.shippingAddress ? selectedOrder.shippingAddress.split(', ') : []
              const recipientName = addressParts[0] || 'Người nhận sách'
              const phoneNumber = addressParts[1] || 'Chưa cập nhật số điện thoại'
              const addressLine = addressParts.slice(2).join(', ') || selectedOrder.shippingAddress || 'Chưa cung cấp địa chỉ nhận sách'

              const currentStatus = selectedOrder.status.toUpperCase()
              const isCanceled = currentStatus === 'CANCELED' || currentStatus === 'CANCELLED'
              
              // Cấu hình các bước timeline giao hàng
              const steps = [
                { label: 'Chờ xử lý', key: 'PENDING' },
                { label: 'Xác nhận', key: 'CONFIRMED' },
                { label: 'Đang giao', key: 'SHIPPING' },
                { label: 'Hoàn tất', key: 'COMPLETED' },
              ]

              // Lấy index trạng thái hiện tại để vẽ stepper
              const currentStepIndex = steps.findIndex(s => s.key === currentStatus)

              return (
                <div className="rounded-3xl border border-[#e7dfd1] bg-white/95 p-6 sm:p-8 shadow-[0_24px_60px_rgba(106,78,32,0.12)] backdrop-blur space-y-8 transition-all">
                  
                  {/* Header chi tiết */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6 gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                          Đơn Hàng #{selectedOrder.id}
                        </h2>
                        {orderIdParam && Number(orderIdParam) === selectedOrder.id && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200 animate-pulse">Vừa đặt</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <Calendar size={12} />
                        Ngày đặt mua: {selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleString('vi-VN') : 'Mới tạo'}
                      </p>
                    </div>
                    <div>
                      {renderStatusBadge(selectedOrder.status)}
                    </div>
                  </div>

                  {/* STEPPER / TIMELINE TRẠNG THÁI GIAO HÀNG */}
                  {!isCanceled && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-6 text-center">Trạng thái hành trình đơn hàng</p>
                      
                      <div className="relative flex items-center justify-between">
                        {/* Line bar background */}
                        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-slate-200 z-0"></div>
                        {/* Line bar active */}
                        <div 
                          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-amber-500 z-0 transition-all duration-500"
                          style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / (steps.length - 1)) * 100 : 0}%` }}
                        ></div>

                        {steps.map((step, idx) => {
                          const isCompleted = currentStepIndex > idx
                          const isActive = currentStepIndex === idx
                          const isPending = currentStepIndex < idx

                          return (
                            <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                                isCompleted 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                                  : isActive 
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-md scale-110 ring-4 ring-amber-100' 
                                    : 'bg-white border-slate-300 text-slate-400'
                              }`}>
                                {isCompleted ? <CheckCircle2 size={14} /> : idx + 1}
                              </div>
                              <span className={`text-[10px] font-bold ${
                                isCompleted 
                                  ? 'text-emerald-600 font-semibold' 
                                  : isActive 
                                    ? 'text-amber-700 font-bold' 
                                    : 'text-slate-400'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grid Thông Tin Nhận Hàng & Hóa Đơn */}
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* Cột 1: Thông tin người nhận */}
                    <div className="space-y-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/40 p-5 border border-slate-200/60 shadow-sm text-left">
                      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-200/50 pb-2">
                        <MapPin size={14} className="text-[#a28354]" />
                        Thông tin giao hàng
                      </h3>
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-slate-200/60 p-1.5 text-slate-500 shrink-0">
                            <User size={14} />
                          </div>
                          <span className="font-bold text-slate-800">{recipientName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-slate-200/60 p-1.5 text-slate-500 shrink-0">
                            <Phone size={14} />
                          </div>
                          <span className="font-semibold text-slate-700">{phoneNumber}</span>
                        </div>
                        <div className="flex items-start gap-3 leading-relaxed">
                          <div className="rounded-full bg-slate-200/60 p-1.5 text-slate-500 shrink-0 mt-0.5">
                            <MapPin size={14} />
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{addressLine}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Phương thức Thanh Toán & Trạng thái */}
                    <div className="space-y-4 rounded-2xl bg-gradient-to-br from-[#fafbfa] to-[#f4fbf7]/40 p-5 border border-slate-200/60 shadow-sm flex flex-col justify-between text-left">
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-200/50 pb-2 mb-3">
                          <CreditCard size={14} className="text-emerald-600" />
                          Phương thức thanh toán
                        </h3>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700 border border-emerald-100 shrink-0 shadow-sm">
                            {(selectedOrder.checkoutUrl || selectedOrder.paymentStatus?.includes('VietQR')) ? <CreditCard size={18} /> : <Banknote size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-none">
                              {(selectedOrder.checkoutUrl || selectedOrder.paymentStatus?.includes('VietQR')) ? 'Chuyển khoản VietQR' : 'Thanh toán COD'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                              {(selectedOrder.checkoutUrl || selectedOrder.paymentStatus?.includes('VietQR')) ? 'Hệ thống đối soát & xác nhận tự động qua cổng PayOS' : 'Khách hàng thanh toán tiền mặt trực tiếp cho shipper'}
                            </p>
                          </div>
                        </div>

                        {/* Thay đổi Phương thức thanh toán hoặc Thanh toán tiếp */}
                        {!selectedOrder.paymentStatus?.includes('ĐÃ') && (currentStatus === 'PENDING' || currentStatus === 'AWAITING_PAYMENT') && (
                          <div className="mt-2 pt-2 border-t border-slate-100/60 space-y-2">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#a28354] block">Hành động thanh toán</span>
                            <div className="flex flex-col gap-1.5">
                              {selectedOrder.paymentStatus?.includes('VietQR') ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchPaymentMethod('PAYOS')}
                                    disabled={actionLoading}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition active:scale-[0.98] border border-amber-500 shadow-sm"
                                  >
                                    <CreditCard size={12} /> Thanh toán lại VietQR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchPaymentMethod('COD')}
                                    disabled={actionLoading}
                                    className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition active:scale-[0.98]"
                                  >
                                    Đổi sang thanh toán COD (Tiền mặt)
                                  </button>
                                </>
                              ) : !selectedOrder.paymentStatus?.includes('COD') ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchPaymentMethod('PAYOS')}
                                    disabled={actionLoading}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 transition active:scale-[0.98] shadow-sm"
                                  >
                                    <CreditCard size={12} /> Đổi sang Chuyển khoản VietQR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchPaymentMethod('COD')}
                                    disabled={actionLoading}
                                    className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition active:scale-[0.98]"
                                  >
                                    Đổi sang thanh toán COD (Tiền mặt)
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Trạng thái & Hủy đơn */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Thanh toán</span>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full border ${
                            selectedOrder.paymentStatus?.includes('ĐÃ') 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              selectedOrder.paymentStatus?.includes('ĐÃ') ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                            }`}></span>
                            {selectedOrder.paymentStatus || 'Chưa thanh toán'}
                          </span>
                        </div>

                        {(currentStatus === 'PENDING' || currentStatus === 'AWAITING_PAYMENT') ? (
                          <button
                            type="button"
                            onClick={() => triggerCancelOrder(selectedOrder.id)}
                            disabled={actionLoading}
                            className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 hover:border-rose-200 transition disabled:opacity-50 shadow-sm hover:shadow active:scale-[0.98]"
                          >
                            {actionLoading ? 'Đang hủy...' : 'Hủy đơn'}
                          </button>
                        ) : !isCanceled && (
                          <span 
                            className="cursor-help text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl"
                            title="Chỉ đơn hàng ở trạng thái Chờ xử lý hoặc Chờ thanh toán mới được phép hủy"
                          >
                            Không thể hủy
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Danh Sách Cuốn Sách Đã Mua */}
                  <div className="space-y-4 text-left">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-200/50 pb-2">
                      <BookOpen size={16} className="text-[#a28354]" />
                      Danh sách sách đặt mua ({selectedOrder.items?.reduce((sum, item: any) => sum + item.quantity, 0) || 0} cuốn)
                    </h3>
                    
                    <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                      {selectedOrder.items?.map((item: any) => {
                        const book = booksCache[item.bookId]
                        return (
                          <div key={item.id} className="flex gap-4 py-4 items-center group transition hover:bg-slate-50/40 px-2 rounded-xl">
                            {/* Book Image */}
                            <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-slate-100 border border-slate-200 shadow-sm transition group-hover:scale-105">
                              {book?.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={book.imageUrl} alt={book.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">Book</div>
                              )}
                            </div>

                            {/* Book Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="truncate text-sm font-semibold text-slate-900 leading-tight">
                                {book?.title || `Sách Học Thuật #${item.bookId}`}
                              </h4>
                              <p className="text-xs text-slate-400 truncate mt-1">
                                Tác giả: {book?.author || 'BMS Author'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded inline-block">
                                Số lượng: {item.quantity}
                              </p>
                              
                              {/* Rate/Review button if order is completed */}
                              {currentStatus === 'COMPLETED' && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(item.bookId, book?.title || `Sách #${item.bookId}`)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-full border border-amber-200 hover:bg-amber-100/60 transition shadow-sm active:scale-95"
                                  >
                                    <Star size={11} className="fill-amber-500 text-amber-500" />
                                    Đánh giá sản phẩm
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Price */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-slate-900">
                                {formattedCurrency.format((item.priceAtPurchase ?? 0) * item.quantity)}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                Đơn giá: {formattedCurrency.format(item.priceAtPurchase ?? 0)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tổng hóa đơn thanh toán */}
                  <div className="rounded-3xl border border-dashed border-slate-200 p-5 space-y-3.5 bg-slate-50/40 text-left shadow-inner">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tổng tiền sách:</span>
                      <span className="font-semibold text-slate-800">{formattedCurrency.format(selectedOrder.subtotalAmount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Phí vận chuyển:</span>
                      <span className="font-semibold text-slate-800">{formattedCurrency.format(selectedOrder.baseShippingFee ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Giảm giá vận chuyển:</span>
                      <span className="font-semibold text-emerald-600">-{formattedCurrency.format(selectedOrder.shippingDiscount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Voucher áp dụng:</span>
                      <span className="font-semibold text-emerald-600">-{formattedCurrency.format(selectedOrder.orderDiscount ?? 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200/80 text-slate-900">
                      <span className="text-sm sm:text-base font-extrabold text-slate-800">Tổng thanh toán thực tế:</span>
                      <span className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
                        {formattedCurrency.format(selectedOrder.finalTotal ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* ADMIN CONTROL PANEL */}
                  {activeUser?.role === 'ADMIN' && (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50/20 p-5 space-y-4 text-left shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest text-rose-700 flex items-center gap-2 border-b border-rose-200/50 pb-2">
                        🛡️ Quản trị viên (Admin Tools)
                      </h3>
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                        {/* 1. Xác nhận đơn hàng */}
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">Trạng thái đơn hàng</p>
                          <p className="text-[10px] text-slate-500">Xác nhận đơn hàng mới và chuyển trạng thái thành CONFIRMED.</p>
                        </div>
                        
                        <button
                          type="button"
                          disabled={actionLoading || (selectedOrder.status !== 'PENDING' && selectedOrder.status !== 'AWAITING_PAYMENT')}
                          onClick={() => triggerConfirmOrder(selectedOrder.id)}
                          className="px-4 py-2 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition shrink-0 self-start sm:self-center"
                        >
                          {selectedOrder.status === 'CONFIRMED' ? '✓ Đã xác nhận' : 'Xác nhận đơn hàng'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )
            })() : (
              <div className="rounded-3xl border border-slate-200 bg-white p-24 text-center text-slate-400">
                <FileText size={48} className="mx-auto text-slate-200 mb-3" />
                Vui lòng chọn một đơn hàng bên danh sách để xem chi tiết thông tin thanh toán & giao nhận.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL ĐÁNH GIÁ SẢN PHẨM (PREMIUM RATING INTERFACE) */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 transform scale-100">
            {/* Header */}
            <div className="mb-4 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                Đánh giá chất lượng
              </span>
              <h3 className="mt-2 text-xl font-bold text-slate-950 leading-tight">
                Cảm nhận của bạn về cuốn sách?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium px-4 line-clamp-2">
                &ldquo;{reviewBookTitle}&rdquo;
              </p>
            </div>

            {/* Star Selector */}
            <div className="flex justify-center gap-2.5 my-5 pb-4 border-b border-slate-100">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="transition transform hover:scale-110 active:scale-95 duration-100"
                >
                  <Star
                    size={36}
                    className={`${
                      star <= reviewRating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                        : 'text-slate-200 hover:text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment Area */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Viết nhận xét của bạn
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="Hãy chia sẻ cảm nhận thực tế của bạn khi đọc cuốn sách này để giúp những độc giả khác có lựa chọn phù hợp nhất..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-300 leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={handleSubmittingReview}
                  className="flex-1 rounded-full bg-slate-950 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 shadow-md transition disabled:opacity-50 active:scale-[0.98]"
                >
                  {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition active:scale-[0.98]"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                className={`px-4 py-2 rounded-full text-[11px] font-bold text-white transition shadow ${
                  confirmModal.isDangerous
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
