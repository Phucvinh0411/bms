"use client"

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { getCart, removeItem, updateQuantity } from '@/src/cart/services/cartService'
import { bookService } from '@/src/api/bookService'
import { toast } from 'react-hot-toast'
import type { CartResponse } from '@/src/cart/types'
import type { Book } from '@/src/types'
import { getEffectiveUserId } from '@/src/cart/utils/userContext'
import { useAuth } from '@/src/auth/context'

type BookMap = Record<number, Book | null>

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export default function CartPage() {
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartResponse | null>(null)
  const [pendingBookId, setPendingBookId] = useState<number | null>(null)
  const [booksById, setBooksById] = useState<BookMap>({})
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn, isLoading: authLoading } = useAuth()

  const hydrateBookDetails = useCallback(async (nextCart: CartResponse | null) => {
    const ids = Array.from(new Set((nextCart?.items ?? []).map((item) => item.bookId)))
    const missingIds = ids.filter((id) => booksById[id] === undefined)

    if (missingIds.length === 0) {
      return
    }

    const results = await Promise.all(
      missingIds.map(async (id) => {
        try {
          const book = await bookService.getBookById(id)
          return [id, book] as const
        } catch {
          return [id, null] as const
        }
      })
    )

    setBooksById((prev) => {
      const merged: BookMap = { ...prev }
      for (const [id, book] of results) {
        merged[id] = book
      }
      return merged
    })
  }, [booksById])

  const fetchCartData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const userId = getEffectiveUserId()
      const data = await getCart(userId)
      setCart(data)
      await hydrateBookDetails(data)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tải giỏ hàng'))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [hydrateBookDetails])

  useEffect(() => {
    if (authLoading || !isSignedIn) {
      return
    }

    fetchCartData()
  }, [authLoading, isSignedIn, fetchCartData])

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [authLoading, isSignedIn, pathname, router])

  async function handleRemove(bookId: number, quantity: number) {
    const userId = getEffectiveUserId()
    if (!userId) {
      toast.error('Không tìm thấy userId')
      return
    }

    const snapshot = cart
    setCart((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.filter((item) => item.bookId !== bookId),
      }
    })

    try {
      setPendingBookId(bookId)
      await removeItem({ userId, bookId, quantity })
      toast.success('Đã xoá khỏi giỏ hàng')
      await fetchCartData(false)
    } catch (error: unknown) {
      setCart(snapshot)
      toast.error(getErrorMessage(error, 'Xoá sản phẩm thất bại'))
    } finally {
      setPendingBookId(null)
    }
  }

  async function handleUpdateQuantity(bookId: number, nextQuantity: number) {
    if (nextQuantity < 1) {
      return
    }

    const userId = getEffectiveUserId()
    if (!userId) {
      toast.error('Không tìm thấy userId')
      return
    }

    const snapshot = cart
    setCart((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.bookId === bookId ? { ...item, quantity: nextQuantity } : item
        ),
      }
    })

    try {
      setPendingBookId(bookId)
      await updateQuantity({ userId, bookId, quantity: nextQuantity })
      await fetchCartData(false)
    } catch (error: unknown) {
      setCart(snapshot)
      toast.error(getErrorMessage(error, 'Cập nhật số lượng thất bại'))
    } finally {
      setPendingBookId(null)
    }
  }

  const computedSubtotal = (cart?.items ?? []).reduce((sum, item) => {
    const price = Number(booksById[item.bookId]?.price ?? 0)
    return sum + price * item.quantity
  }, 0)

  const backendSubtotal = Number(cart?.totalEstimated ?? 0)
  const subtotal = Number.isFinite(backendSubtotal) && backendSubtotal > 0 ? backendSubtotal : computedSubtotal
  const tax = subtotal * 0.05
  const shipping = subtotal > 0 ? 5 : 0
  const total = subtotal + tax + shipping

  const formatCurrency = (value: number) => `${value.toLocaleString('en-US')}đ`

  if (authLoading || !isSignedIn) {
    return (
      <div className="min-h-[calc(100vh-84px)] bg-gradient-to-b from-[#f8fafc] via-[#f6f8fc] to-[#eef2f7] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-center py-20 text-slate-500">
          Đang chuyển đến trang đăng nhập...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-84px)] bg-gradient-to-b from-[#f8fafc] via-[#f6f8fc] to-[#eef2f7] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Giỏ hàng của bạn</h1>
            <p className="mt-1 text-sm text-slate-500">Quản lý số lượng và kiểm tra tổng đơn trước khi thanh toán.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Tiếp tục mua sắm
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-2xl border border-[#e4e8f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <ShoppingBag className="text-slate-600" size={20} />
                <span className="text-lg font-semibold text-slate-900">Sản phẩm</span>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {(cart?.items ?? []).length} sản phẩm
              </span>
            </div>

            {loading && <p className="py-10 text-center text-slate-500">Đang tải giỏ hàng...</p>}

            {!loading && cart && cart.items.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                <p className="text-base font-medium text-slate-700">Giỏ hàng đang trống</p>
                <p className="mt-1 text-sm text-slate-500">Thêm vài cuốn sách hay để bắt đầu đơn hàng của bạn.</p>
              </div>
            )}

            {!loading && cart && cart.items.length > 0 && (
              <div className="space-y-4">
                {cart.items.map((it) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    {booksById[it.bookId]?.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={booksById[it.bookId]?.imageUrl as string}
                        alt={booksById[it.bookId]?.title ?? `Book ${it.bookId}`}
                        className="h-24 w-16 rounded-lg object-cover"
                      />
                    )}
                    {!booksById[it.bookId]?.imageUrl && (
                      <div className="h-24 w-16 rounded-lg bg-gradient-to-br from-[#dbe5ff] to-[#c8d4f2]" />
                    )}

                    <div className="min-w-0">
                      <Link href={`/detail/${it.bookId}`} className="truncate text-base font-semibold text-slate-900 hover:underline">
                        {booksById[it.bookId]?.title ?? `Sách #${it.bookId}`}
                      </Link>
                      <p className="text-sm text-slate-500">{booksById[it.bookId]?.author ?? 'Đang cập nhật tác giả'}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {formatCurrency(Number(booksById[it.bookId]?.price ?? 0))} x {it.quantity}
                      </p>

                      <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 shadow-sm">
                        <button
                          className="px-3 py-1 text-sm font-semibold text-slate-700 disabled:opacity-40"
                          disabled={pendingBookId === it.bookId || it.quantity <= 1}
                          onClick={() => handleUpdateQuantity(it.bookId, it.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="px-3 text-sm font-semibold text-slate-900">{it.quantity}</span>
                        <button
                          className="px-3 py-1 text-sm font-semibold text-slate-700 disabled:opacity-40"
                          disabled={pendingBookId === it.bookId}
                          onClick={() => handleUpdateQuantity(it.bookId, it.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                      disabled={pendingBookId === it.bookId}
                      onClick={() => handleRemove(it.bookId, it.quantity)}
                    >
                      <Trash2 size={16} />
                      {pendingBookId === it.bookId ? 'Đang xử lý...' : 'Xoá'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-[#e4e8f0] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">Tóm tắt đơn hàng</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              {/* <div className="flex justify-between text-slate-600">
                <span>Thuế</span>
                <span className="font-medium text-slate-900">{formatCurrency(tax)}</span>
              </div> */}
              {/* <div className="flex justify-between text-slate-600">
                <span>Phí giao hàng</span>
                <span className="font-medium text-slate-900">{formatCurrency(shipping)}</span>
              </div> */}
            </div>

            <hr className="my-5 border-slate-200" />

            <div className="mb-5 flex justify-between text-lg font-semibold text-slate-900">
              <span>Tổng cộng</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <Link
              href="/checkout"
              className="block w-full rounded-full bg-slate-900 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
            >
              Tiến hành thanh toán
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
