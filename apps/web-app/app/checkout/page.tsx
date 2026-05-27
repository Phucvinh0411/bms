"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MapPin, Plus, Sparkles, Star, CreditCard, Banknote, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/src/auth/context'
import { getEffectiveUserId } from '@/src/cart/utils/userContext'
import { previewCheckout, submitCheckout } from '@/src/checkout/services/checkoutService'
import type { CheckoutPreviewResponse, CheckoutRequest, ShippingAddress, ShippingAddressRequest } from '@/src/checkout/types'
import { getCart } from '@/src/cart/services/cartService'
import { bookService } from '@/src/api/bookService'
import type { CartItem } from '@/src/cart/types'
import {
  createShippingAddress,
  deleteShippingAddress,
  getShippingAddresses,
  setDefaultShippingAddress,
  updateShippingAddress,
} from '@/src/api/shippingAddressService'
import { searchVietnamAddress } from '@/src/api/geocodingService'
import { getDistrictsByProvinceCode, getProvinces, type District, type Province } from '@/src/api/vnAddressService'

const emptyForm = {
  recipientName: '',
  phoneNumber: '',
  detailAddress: '',
  provinceCode: '',
  districtCode: '',
}

function normalizeAdministrativeName(value: string) {
  return value
    .replace(/^(quan|huyen|thi xa|thanh pho)\s+/i, '')
    .replace(/^(tinh|thanh pho)\s+/i, '')
    .trim()
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

export default function CheckoutPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoading: authLoading } = useAuth()
  
  const canLoadCheckoutData = !authLoading && isSignedIn
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null)
  const [subtotalFallback, setSubtotalFallback] = useState(0)
  const [voucherCode, setVoucherCode] = useState('')

  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [addressLoading, setAddressLoading] = useState(false)

  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState(emptyForm)

  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  // State phương thức thanh toán: COD hoặc PAYOS (VietQR)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'PAYOS'>('PAYOS')

  // Trạng thái Server-Sent Events (SSE) để theo dõi thanh toán thời gian thực
  const [sseStatus, setSseStatus] = useState<'IDLE' | 'PENDING' | 'PAID' | 'ERROR'>('IDLE')
  const [sseMessage, setSseMessage] = useState('')

  const statusParam = searchParams.get('status')
  const orderIdParam = searchParams.get('orderId')

  const formattedCurrency = useMemo(
    () =>
      new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    []
  )

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  )

  async function resolveCoordinates(districtName: string, provinceName: string) {
    const normalizedDistrict = normalizeAdministrativeName(districtName)
    const normalizedProvince = normalizeAdministrativeName(provinceName)

    const queries = [
      `${districtName}, ${provinceName}, Viet Nam`,
      `${normalizedDistrict}, ${provinceName}, Viet Nam`,
      `${districtName}, ${normalizedProvince}, Viet Nam`,
      `${normalizedDistrict}, ${normalizedProvince}, Viet Nam`,
      `${provinceName}, Viet Nam`,
      `${normalizedProvince}, Viet Nam`,
    ]

    for (const query of queries) {
      const results = await searchVietnamAddress(query)
      if (results.length > 0) {
        return results[0]
      }
    }
    return null
  }

  // --- LẮNG NGHE SỰ KIỆN THANH TOÁN THỜI GIAN THỰC (SSE) ---
  useEffect(() => {
    if (statusParam === 'success' && orderIdParam) {
      setSseStatus('PENDING')
      setSseMessage('Đang kết nối tới cổng thanh toán để chờ xác thực chuyển khoản...')

      // Gọi qua gateway Nginx trỏ vào order-service
      const sseBase = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || 'http://localhost/api/v1/orders'
      const eventSource = new EventSource(`${sseBase}/api/payments/sse/${orderIdParam}`)

      eventSource.addEventListener('INIT', (event: MessageEvent) => {
        setSseMessage(event.data)
      })

      eventSource.addEventListener('PAYMENT_STATUS', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          if (data.status === 'PAID') {
            setSseStatus('PAID')
            setSseMessage('Thành công! Đơn hàng đã được thanh toán. Đang chuyển hướng sang chi tiết đơn hàng...')
            toast.success('Thanh toán thành công qua VietQR!')
            setTimeout(() => {
              router.push(`/order?orderId=${orderIdParam}`)
            }, 1500)
          }
        } catch {
          if (event.data && event.data.includes('PAID')) {
            setSseStatus('PAID')
            setSseMessage('Thành công! Đơn hàng đã được thanh toán. Đang chuyển hướng sang chi tiết đơn hàng...')
            toast.success('Thanh toán thành công qua VietQR!')
            setTimeout(() => {
              router.push(`/order?orderId=${orderIdParam}`)
            }, 1500)
          }
        }
        eventSource.close()
      })

      eventSource.onerror = () => {
        // Fallback nhẹ nếu ngrok đứt kết nối tạm thời hoặc sự cố SSE
        setSseStatus('ERROR')
        setSseMessage('Kết nối gián đoạn. Nếu bạn đã chuyển khoản thành công, xin hãy F5 tải lại trang để kiểm tra trạng thái đơn.')
        eventSource.close()
      }

      return () => {
        eventSource.close()
      }
    }
  }, [statusParam, orderIdParam])

  useEffect(() => {
    if (!canLoadCheckoutData) {
      return
    }
    ;(async () => {
      try {
        const result = await getProvinces()
        setProvinces(result)
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Không tải được tỉnh/thành phố'))
      }
    })()
  }, [canLoadCheckoutData])

  useEffect(() => {
    if (!canLoadCheckoutData) {
      return
    }
    const provinceCode = Number(addressForm.provinceCode)
    if (!Number.isFinite(provinceCode) || provinceCode <= 0) {
      setDistricts([])
      return
    }
    ;(async () => {
      try {
        const result = await getDistrictsByProvinceCode(provinceCode)
        setDistricts(result)
      } catch {
        setDistricts([])
      }
    })()
  }, [addressForm.provinceCode, canLoadCheckoutData])

  async function loadAddresses() {
    const userId = getEffectiveUserId()
    if (!userId) return

    setAddressLoading(true)
    try {
      const list = await getShippingAddresses(userId)
      setAddresses(list)
      const defaultAddress = list.find((item) => item.isDefault)
      setSelectedAddressId((prev) => prev ?? defaultAddress?.id ?? list[0]?.id ?? null)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không tải được danh sách địa chỉ'))
    } finally {
      setAddressLoading(false)
    }
  }

  useEffect(() => {
    if (!canLoadCheckoutData) {
      return
    }
    loadAddresses()
  }, [canLoadCheckoutData])

  useEffect(() => {
    if (!canLoadCheckoutData) {
      return
    }
    ;(async () => {
      try {
        const userId = getEffectiveUserId()
        const cart = await getCart(userId)
        const ids: number[] = Array.from(
          new Set<number>((cart.items ?? []).map((item: CartItem) => item.bookId))
        )
        const entries = await Promise.all(
          ids.map(async (id: number) => {
            try {
              return [id, await bookService.getBookById(id)] as const
            } catch {
              return [id, null] as const
            }
          })
        )
        const priceMap = new Map<number, number>()
        for (const [id, book] of entries) {
          priceMap.set(id, Number(book?.price ?? 0))
        }
        const subtotal = (cart.items ?? []).reduce((sum: number, item: CartItem) => {
          return sum + (priceMap.get(item.bookId) ?? 0) * item.quantity
        }, 0)
        setSubtotalFallback(subtotal)
      } catch {
        setSubtotalFallback(0)
      }
    })()
  }, [canLoadCheckoutData])

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [authLoading, isSignedIn, pathname, router])

  function openCreateForm() {
    setEditingAddressId(null)
    setAddressForm(emptyForm)
    setShowAddressForm(true)
  }

  function openEditForm(address: ShippingAddress) {
    setEditingAddressId(address.id)
    setAddressForm({
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      detailAddress: address.addressLine,
      provinceCode: '',
      districtCode: '',
    })
    setDistricts([])
    setShowAddressForm(true)
  }

  async function handleSaveAddress() {
    const userId = getEffectiveUserId()
    if (!userId) {
      toast.error('Không tìm thấy mã người dùng')
      return
    }

    const provinceCode = Number(addressForm.provinceCode)
    const districtCode = Number(addressForm.districtCode)
    const province = provinces.find((item) => item.code === provinceCode)
    const district = districts.find((item) => item.code === districtCode)

    if (!addressForm.recipientName.trim() || !addressForm.phoneNumber.trim() || !addressForm.detailAddress.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ')
      return
    }

    if (!province || !district) {
      toast.error('Vui lòng chọn tỉnh/thành và quận/huyện')
      return
    }

    const fullAddress = `${addressForm.detailAddress.trim()}, ${district.name}, ${province.name}, Viet Nam`

    setLoading(true)
    try {
      const best = await resolveCoordinates(district.name, province.name)
      if (!best) {
        throw new Error('Không tìm thấy tọa độ. Vui lòng thử quận/huyện khác.')
      }

      const payload: ShippingAddressRequest = {
        userId,
        recipientName: addressForm.recipientName.trim(),
        phoneNumber: addressForm.phoneNumber.trim(),
        addressLine: fullAddress,
        latitude: best.latitude,
        longitude: best.longitude,
        isDefault: addresses.length === 0,
      }

      const saved = editingAddressId
        ? await updateShippingAddress(editingAddressId, payload)
        : await createShippingAddress(payload)

      toast.success(editingAddressId ? 'Đã cập nhật địa chỉ thành công' : 'Đã thêm địa chỉ giao hàng mới')
      setShowAddressForm(false)
      await loadAddresses()
      setSelectedAddressId(saved.id)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lưu địa chỉ giao hàng thất bại'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSetDefault(addressId: number) {
    const userId = getEffectiveUserId()
    if (!userId) return

    setLoading(true)
    try {
      await setDefaultShippingAddress(addressId, userId)
      await loadAddresses()
      setSelectedAddressId(addressId)
      toast.success('Đã chọn địa chỉ làm mặc định')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Đổi địa chỉ mặc định thất bại'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAddress(addressId: number) {
    const userId = getEffectiveUserId()
    if (!userId) return

    setLoading(true)
    try {
      await deleteShippingAddress(addressId, userId)
      await loadAddresses()
      toast.success('Xóa địa chỉ giao hàng thành công')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Xóa địa chỉ thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const buildCheckoutPayload = useCallback((): CheckoutRequest | null => {
    const userId = getEffectiveUserId()
    if (!userId) {
      toast.error('Không tìm thấy mã người dùng')
      return null
    }

    if (!selectedAddressId) {
      toast.error('Vui lòng chọn địa chỉ giao nhận sách')
      return null
    }

    return {
      userId,
      shippingAddressId: selectedAddressId,
      voucherCode: voucherCode.trim() || undefined,
    }
  }, [selectedAddressId, voucherCode])

  useEffect(() => {
    if (!selectedAddressId) {
      setPreview(null)
      return
    }

    const timer = window.setTimeout(async () => {
      const payload = buildCheckoutPayload()
      if (!payload) return

      setPreviewLoading(true)
      try {
        const data = await previewCheckout(payload)
        setPreview(data)
      } catch {
        // silent: preview tự động tải lại khi đổi địa chỉ hoặc voucher
      } finally {
        setPreviewLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [selectedAddressId, voucherCode, canLoadCheckoutData, buildCheckoutPayload])

  // --- XỬ LÝ THANH TOÁN VÀ ĐẶT HÀNG ---
  async function handleCheckout() {
    const payload = buildCheckoutPayload()
    if (!payload) return

    // Đính kèm phương thức thanh toán được chọn cùng URL chuyển hướng động
    const finalPayload = {
      ...payload,
      paymentMethod,
      returnUrl: `${window.location.origin}/checkout?status=success`,
      cancelUrl: `${window.location.origin}/cart`,
    }

    setLoading(true)
    try {
      const data = await submitCheckout(finalPayload)
      
      if (paymentMethod === 'PAYOS' && data.checkoutUrl) {
        toast.success('Đang chuyển hướng sang cổng thanh toán VietQR PayOS...')
        // Chuyển hướng trình duyệt sang trang thanh toán PayOS
        window.location.href = data.checkoutUrl
      } else {
        toast.success(`Đặt hàng thành công! Mã đơn hàng: #${data.id}`)
        setPreview(data)
        router.push(`/order?orderId=${data.id}`)
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Quá trình đặt hàng thất bại'))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] px-4 py-12">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-[1240px] items-center justify-center text-slate-500">
          Đang chuyển đến trang đăng nhập...
        </div>
      </div>
    )
  }

  // --- RENDERING MÀN HÌNH SSE KIỂM TRA THANH TOÁN THỰC TẾ ---
  if (statusParam === 'success' && orderIdParam) {
    const isCOD = searchParams.get('method') === 'COD'

    return (
      <div className="min-h-[calc(100vh-84px)] bg-[radial-gradient(circle_at_top,_#fff5e6_0%,_#f8fafc_40%,_#e9eef6_100%)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-[#e7dfd1] bg-white/90 p-8 text-center shadow-[0_24px_50px_rgba(106,78,32,0.15)] backdrop-blur transition-all">
          
          {/* GIAO DIỆN CHỜ THANH TOÁN (PAYOS + SSE) */}
          {!isCOD && sseStatus === 'PENDING' && (
            <div className="space-y-6">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-50">
                <span className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin"></span>
                <Sparkles size={36} className="text-amber-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  Đang Chờ Quét Mã VietQR...
                </h2>
                <p className="text-sm text-slate-500">Hệ thống đang đồng bộ với cổng ngân hàng thời gian thực qua Webhook & SSE.</p>
              </div>
              
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200 text-left">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 text-amber-700 shrink-0" size={18} />
                  <p className="text-xs font-medium text-amber-800 leading-relaxed">{sseMessage}</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p>💡 Vui lòng quét mã QR chuyển tiền <strong>1,000đ</strong> thật.</p>
                <p>Hệ thống tự động phát hiện và chuyển tiếp ngay khi giao dịch thành công!</p>
              </div>
            </div>
          )}

          {/* GIAO DIỆN THANH TOÁN THÀNH CÔNG (SSE kích hoạt) */}
          {(isCOD || sseStatus === 'PAID') && (
            <div className="space-y-6 animate-fade-in">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_12px_24px_rgba(16,185,129,0.2)]">
                <CheckCircle2 size={48} className="animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  Đặt Hàng Thành Công!
                </h2>
                <p className="text-sm text-emerald-600 font-semibold uppercase tracking-wider">Cảm ơn bạn đã lựa chọn bms bookstore</p>
              </div>
              
              <div className="rounded-2xl bg-emerald-50/40 p-5 border border-emerald-200 text-left space-y-3 text-sm text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">Mã hóa đơn:</span><span className="font-bold text-slate-900">#{orderIdParam}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phương thức:</span><span className="font-semibold text-slate-900">{isCOD ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản VietQR (PayOS)'}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái giao dịch:</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    {isCOD ? 'CHỜ XỬ LÝ (COD)' : 'ĐÃ THANH TOÁN'}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => router.push(`/order?orderId=${orderIdParam}`)} className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold uppercase tracking-widest text-white hover:bg-slate-800 shadow-md transition">
                  Xem chi tiết đơn hàng
                </button>
                <button onClick={() => router.push('/order')} className="w-full rounded-full border border-slate-300 py-3 text-sm font-semibold uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition">
                  Danh sách đơn hàng
                </button>
              </div>
            </div>
          )}

          {/* GIAO DIỆN LỖI KẾT NỐI */}
          {sseStatus === 'ERROR' && (
            <div className="space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg className="h-12 w-12 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  Kết nối gián đoạn
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">{sseMessage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button onClick={() => window.location.reload()} className="flex-1 rounded-full bg-amber-600 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-amber-500 shadow-sm">
                  Tải lại trang (F5)
                </button>
                <button onClick={() => router.push('/')} className="flex-1 rounded-full border border-slate-300 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50">
                  Về trang chủ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- RENDERING GIAO DIỆN CHECKOUT CHÍNH ---
  return (
    <div className="min-h-[calc(100vh-84px)] bg-[radial-gradient(circle_at_top,_#fff5e6_0%,_#f8fafc_40%,_#e9eef6_100%)] px-4 py-8 sm:px-8">
      <div className="mx-auto grid w-full max-w-[1240px] gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        
        <section className="rounded-3xl border border-[#e7dfd1] bg-white/85 p-6 shadow-[0_18px_40px_rgba(106,78,32,0.12)] backdrop-blur">
          
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#a28354]">Thanh toán</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                Chọn địa chỉ giao hàng
              </h1>
              <p className="mt-2 text-sm text-slate-600">Chọn địa chỉ đã lưu hoặc thêm địa chỉ mới.</p>
            </div>
            <Link href="/cart" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300">
              <ArrowLeft size={16} />
              Về giỏ hàng
            </Link>
          </div>

          {/* Danh Sách Địa Chỉ */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-[#fff9ef] to-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MapPin size={16} className="text-amber-600" />
                Địa chỉ đã lưu
              </div>
              <button type="button" onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-800">
                <Plus size={14} />
                Thêm địa chỉ
              </button>
            </div>

            {addressLoading && <p className="text-sm text-slate-500">Đang tải địa chỉ...</p>}
            {!addressLoading && addresses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Vui lòng thêm địa chỉ nhận hàng.</div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {addresses.map((item) => {
                const selected = item.id === selectedAddressId
                return (
                  <button key={item.id} type="button" onClick={() => setSelectedAddressId(item.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-amber-400 bg-amber-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">{item.recipientName}</div>
                      {item.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><Star size={10} /> Mặc định</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.phoneNumber}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{item.addressLine}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      {!item.isDefault && <span onClick={(e) => { e.stopPropagation(); handleSetDefault(item.id) }} className="cursor-pointer rounded-full border border-emerald-300 px-2 py-1 text-emerald-700">Đặt mặc định</span>}
                      <span onClick={(e) => { e.stopPropagation(); openEditForm(item) }} className="cursor-pointer rounded-full border border-slate-300 px-2 py-1 text-slate-700">Sửa</span>
                      <span onClick={(e) => { e.stopPropagation(); handleDeleteAddress(item.id) }} className="cursor-pointer rounded-full border border-rose-300 px-2 py-1 text-rose-700">Xóa</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Thêm/Sửa Địa Chỉ */}
          {showAddressForm && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">{editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input value={addressForm.recipientName} onChange={(e) => setAddressForm((p) => ({ ...p, recipientName: e.target.value }))} placeholder="Tên người nhận" className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400" />
                <input value={addressForm.phoneNumber} onChange={(e) => setAddressForm((p) => ({ ...p, phoneNumber: e.target.value }))} placeholder="Số điện thoại" className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400" />
                <select
                  value={addressForm.provinceCode}
                  onChange={(e) => setAddressForm((p) => ({ ...p, provinceCode: e.target.value, districtCode: '' }))}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                  <option value="">Chọn tỉnh/thành phố</option>
                  {provinces.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
                <select
                  value={addressForm.districtCode}
                  onChange={(e) => setAddressForm((p) => ({ ...p, districtCode: e.target.value }))}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                  <option value="">Chọn quận/huyện</option>
                  {districts.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              </div>

              <input
                value={addressForm.detailAddress}
                onChange={(e) => setAddressForm((p) => ({ ...p, detailAddress: e.target.value }))}
                placeholder="Số nhà, tên đường, xã/phường..."
                className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
              />

              <div className="mt-3 flex gap-2">
                <button type="button" onClick={handleSaveAddress} className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-amber-500">Lưu địa chỉ</button>
                <button type="button" onClick={() => setShowAddressForm(false)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Đóng</button>
              </div>
            </div>
          )}

          {/* VÙNG CHỌN PHƯƠNG THỨC THANH TOÁN (PREMIUM DESIGN) */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-[#fafcfd] p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-slate-700" />
              Phương thức thanh toán
            </h3>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Option PayOS VietQR */}
              <button
                type="button"
                onClick={() => setPaymentMethod('PAYOS')}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                  paymentMethod === 'PAYOS'
                    ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-400'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`mt-0.5 rounded-full p-2 ${paymentMethod === 'PAYOS' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Sparkles size={18} className={paymentMethod === 'PAYOS' ? 'animate-pulse' : ''} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900">Quét mã VietQR (PayOS)</span>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">TỰ ĐỘNG</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Xử lý tự động ngay khi chuyển tiền 1k thực. An toàn và không mất thời gian chờ đợi.
                  </p>
                </div>
              </button>

              {/* Option COD */}
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-400'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`mt-0.5 rounded-full p-2 ${paymentMethod === 'COD' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Banknote size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-900">Thanh toán khi nhận hàng (COD)</span>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Nhận sách tận nơi, kiểm tra hàng đầy đủ rồi mới gửi tiền mặt cho shipper.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Voucher */}
          <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Sparkles size={16} />Voucher giảm giá</div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Nhập mã giảm giá của bạn" className="w-full flex-1 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-amber-400 focus:outline-none" />
            </div>
          </div>
        </section>

        {/* Aside bill review */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"Space Grotesk", "Trebuchet MS", sans-serif' }}>Hóa đơn tạm tính</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Tiền sách</span><span className="font-semibold text-slate-900">{formattedCurrency.format(preview?.subtotalAmount ?? subtotalFallback)}</span></div>
              <div className="flex items-center justify-between"><span>Phí vận chuyển</span><span className="font-semibold text-slate-900">{formattedCurrency.format(preview?.baseShippingFee ?? 0)}</span></div>
              <div className="flex items-center justify-between"><span>Giảm phí ship</span><span className="font-semibold text-emerald-600">-{formattedCurrency.format(preview?.shippingDiscount ?? 0)}</span></div>
              <div className="flex items-center justify-between"><span>Khuyến mãi</span><span className="font-semibold text-emerald-600">-{formattedCurrency.format(preview?.orderDiscount ?? 0)}</span></div>
              <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-base font-semibold text-slate-900"><span>Tổng thanh toán</span><span>{formattedCurrency.format(preview?.finalTotal ?? 0)}</span></div>
              {previewLoading && <div className="text-xs text-slate-500">Đang tính toán lại hóa đơn...</div>}
            </div>

            <div className="mt-6 space-y-3">
              <button type="button" onClick={handleCheckout} disabled={loading || !selectedAddress} className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? 'Đang tạo đơn hàng...' : paymentMethod === 'PAYOS' ? 'Đặt hàng & Thanh toán QR' : 'Đặt hàng COD'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#334155] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Địa chỉ giao hàng</p>
            <h3 className="mt-2 text-xl font-semibold" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>{selectedAddress?.recipientName ?? 'Chưa chọn địa chỉ'}</h3>
            <p className="mt-2 text-sm text-slate-200">{selectedAddress?.addressLine ?? 'Vui lòng thêm hoặc chọn địa chỉ nhận sách ở cột bên để tiếp tục.'}</p>
            <p className="mt-3 text-xs text-slate-300">{selectedAddress ? selectedAddress.phoneNumber : ''}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
