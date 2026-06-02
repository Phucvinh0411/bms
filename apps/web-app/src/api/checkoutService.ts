import axios from 'axios'
import type { CheckoutRequest, CheckoutPreviewResponse, CheckoutResponse } from '@/src/checkout/types'

const configuredBase = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || process.env.BACKEND_API_BASE_URL
const DEFAULT_BASES = ['http://localhost/api/v1/orders']
const BACKEND_BASE_CANDIDATES = Array.from(
  new Set([...(configuredBase ? [configuredBase] : []), ...DEFAULT_BASES])
)
const FALLBACK_STATUSES = new Set([404, 502, 503, 504])

function trimSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function buildOrderApiCandidates(base: string) {
  const normalized = trimSlash(base)
  if (normalized.endsWith('/api/orders')) {
    return {
      previewUrls: [`${normalized}/preview`],
      submitUrls: [normalized],
    }
  }
  if (normalized.endsWith('/api/v1/orders')) {
    return {
      previewUrls: [`${normalized}/api/orders/preview`],
      submitUrls: [`${normalized}/api/orders`],
    }
  }
  return {
    previewUrls: [`${normalized}/api/orders/preview`, `${normalized}/preview`],
    submitUrls: [`${normalized}/api/orders`, normalized],
  }
}

const RETRYABLE_ERRORS = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'])
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function postWithRetry(url: string, body: any, headers: Record<string, string>) {
  let lastError: any = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await axios.post(url, body, { headers })
    } catch (err: any) {
      lastError = err
      const isRetryable = !err.response && RETRYABLE_ERRORS.has(err.code)
      if (!isRetryable || attempt === 3) {
        throw err
      }
      await delay(400 * attempt)
    }
  }
  throw lastError
}

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function previewOrder(payload: CheckoutRequest): Promise<CheckoutPreviewResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { previewUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < previewUrls.length; j++) {
      const previewUrl = previewUrls[j]
      try {
        const res = await postWithRetry(previewUrl, payload, headers)
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === previewUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function submitOrder(payload: CheckoutRequest): Promise<CheckoutResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const submitUrl = submitUrls[j]
      try {
        const res = await postWithRetry(submitUrl, payload, headers)
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function getOrders(): Promise<CheckoutResponse[]> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const url = submitUrls[j]
      try {
        const res = await axios.get(url, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function getOrderById(id: number | string): Promise<CheckoutResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const url = `${submitUrls[j]}/${id}`
      try {
        const res = await axios.get(url, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function cancelOrder(id: number | string): Promise<CheckoutResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const url = `${submitUrls[j]}/${id}/cancel`
      try {
        const res = await axios.post(url, {}, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function changeOrderPaymentMethod(
  id: number | string,
  paymentMethod: string,
  returnUrl?: string,
  cancelUrl?: string
): Promise<CheckoutResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const url = `${submitUrls[j]}/${id}/payment-method`
      try {
        const res = await axios.put(url, null, {
          headers,
          params: { paymentMethod, returnUrl, cancelUrl }
        })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function confirmOrder(id: number | string): Promise<CheckoutResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const url = `${submitUrls[j]}/${id}/confirm`
      try {
        const res = await axios.post(url, {}, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function updateShippingFee(id: number | string, shippingFee: number): Promise<CheckoutResponse> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const { submitUrls } = buildOrderApiCandidates(base)
    for (let j = 0; j < submitUrls.length; j++) {
      const url = `${submitUrls[j]}/${id}/shipping-fee`
      try {
        const res = await axios.put(url, null, {
          headers,
          params: { shippingFee }
        })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === submitUrls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

function buildShippingRulesUrlCandidates(base: string) {
  const normalized = trimSlash(base)
  if (normalized.endsWith('/orders')) {
    return [normalized.replace(/\/orders$/, '/shipping-rules')]
  }
  return [
    `${normalized}/api/shipping-rules`,
    `${normalized}/shipping-rules`
  ]
}

export interface ShippingRule {
  id?: number
  minDistance: number
  maxDistance: number | null
  fee: number
}

export async function getShippingRules(): Promise<ShippingRule[]> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const urls = buildShippingRulesUrlCandidates(base)
    for (let j = 0; j < urls.length; j++) {
      const url = urls[j]
      try {
        const res = await axios.get(url, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === urls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function createShippingRule(rule: ShippingRule): Promise<ShippingRule> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const urls = buildShippingRulesUrlCandidates(base)
    for (let j = 0; j < urls.length; j++) {
      const url = urls[j]
      try {
        const res = await axios.post(url, rule, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === urls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function updateShippingRule(id: number | string, rule: ShippingRule): Promise<ShippingRule> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const urls = buildShippingRulesUrlCandidates(base)
    for (let j = 0; j < urls.length; j++) {
      const url = `${urls[j]}/${id}`
      try {
        const res = await axios.put(url, rule, { headers })
        return res.data
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === urls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}

export async function deleteShippingRule(id: number | string): Promise<void> {
  let lastError: any = null
  const headers = getAuthHeaders()

  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i++) {
    const base = BACKEND_BASE_CANDIDATES[i]
    const urls = buildShippingRulesUrlCandidates(base)
    for (let j = 0; j < urls.length; j++) {
      const url = `${urls[j]}/${id}`
      try {
        await axios.delete(url, { headers })
        return
      } catch (err: any) {
        lastError = err
        const isLastBase = i === BACKEND_BASE_CANDIDATES.length - 1
        const isLastUrl = j === urls.length - 1
        if (FALLBACK_STATUSES.has(err.response?.status) && (!isLastBase || !isLastUrl)) continue
        if (err.response && isLastBase && isLastUrl) throw err
      }
    }
  }
  throw lastError
}
