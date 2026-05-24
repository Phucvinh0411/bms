import type { AddToCartRequest, CartMutationRequest } from '../types'
import { getEffectiveUserId } from '../utils/userContext'
import { cartApiService } from '@/src/api/cartApiService'
import { getAuthToken as getActiveAuthToken } from '@/src/api/client'

function emitCartChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cart:changed'))
  }
}

function getAuthToken() {
  const token = getActiveAuthToken()
  return token ? `Bearer ${token}` : null
}

function toClientError(e: any) {
  if (e.response) {
    const retryAfter = e.response.headers?.['retry-after'] ?? e.response.data?.retryAfter
    const message = e.response.data?.message ?? e.response.data?.error ?? 'Lỗi server'
    const err: any = new Error(message)
    err.status = e.response.status
    err.retryAfter = retryAfter
    return err
  }
  return e
}

export async function addItem(payload: AddToCartRequest) {
  try {
    const token = getAuthToken()
    const uid = payload.userId ?? getEffectiveUserId()
    const data = await cartApiService.add({ ...payload, userId: uid }, token)
    emitCartChanged()
    return data
  } catch (e: any) {
    throw toClientError(e)
  }
}

export async function getCart(userId?: number) {
  try {
    const token = getAuthToken()
    // prefer explicit userId; fallback to local/mock user context
    const uid = userId ?? getEffectiveUserId()
    if (!uid) {
      // no user context — return empty cart shape for client
      return { id: null, userId: null, totalEstimated: 0, items: [] }
    }

    const data = await cartApiService.get(uid.toString(), token)
    return data
  } catch (e: any) {
    throw toClientError(e)
  }
}

export async function removeItem(payload: CartMutationRequest) {
  try {
    const token = getAuthToken()
    const data = await cartApiService.remove(payload, token)
    emitCartChanged()
    return data
  } catch (e: any) {
    throw toClientError(e)
  }
}

export async function updateQuantity(payload: CartMutationRequest) {
  try {
    const token = getAuthToken()
    const data = await cartApiService.updateQuantity(payload, token)
    emitCartChanged()
    return data
  } catch (e: any) {
    throw toClientError(e)
  }
}

