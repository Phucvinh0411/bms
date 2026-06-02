import axios from "axios";
import type { ShippingAddress, ShippingAddressRequest } from "@/src/checkout/types";
import { getAuthToken } from "./client";

const configuredBase = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/orders` : process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || process.env.BACKEND_API_BASE_URL;
const DEFAULT_BASES = ["http://localhost/api/v1/orders"];
const BACKEND_BASE_CANDIDATES = Array.from(
  new Set([...(configuredBase ? [configuredBase] : []), ...DEFAULT_BASES])
);
const FALLBACK_STATUSES = new Set([404, 502, 503, 504]);

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildShippingAddressBase(base: string) {
  const normalized = trimSlash(base);
  if (normalized.endsWith("/api/v1/orders")) {
    return `${normalized}/api`;
  }
  if (normalized.endsWith("/api") || normalized.endsWith("/api/orders")) {
    return normalized;
  }
  return `${normalized}/api`;
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers: Record<string, string> = { 
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function tryCandidates<T>(fn: (base: string) => Promise<T>): Promise<T> {
  let lastError: any = null;
  for (let i = 0; i < BACKEND_BASE_CANDIDATES.length; i += 1) {
    const base = BACKEND_BASE_CANDIDATES[i];
    try {
      return await fn(base);
    } catch (err: any) {
      lastError = err;
      const isLast = i === BACKEND_BASE_CANDIDATES.length - 1;
      if (FALLBACK_STATUSES.has(err.response?.status) && !isLast) continue;
      if (err.response) throw err;
    }
  }
  throw lastError;
}

export async function getShippingAddresses(userId: number): Promise<ShippingAddress[]> {
  const headers = getAuthHeaders();
  return tryCandidates(async (base) => {
    const apiBase = buildShippingAddressBase(base);
    const res = await axios.get(`${apiBase}/shipping-addresses`, { headers, params: { userId } });
    return res.data;
  });
}

export async function createShippingAddress(payload: ShippingAddressRequest): Promise<ShippingAddress> {
  const headers = getAuthHeaders();
  return tryCandidates(async (base) => {
    const apiBase = buildShippingAddressBase(base);
    const res = await axios.post(`${apiBase}/shipping-addresses`, payload, { headers });
    return res.data;
  });
}

export async function updateShippingAddress(id: number, payload: ShippingAddressRequest): Promise<ShippingAddress> {
  const headers = getAuthHeaders();
  return tryCandidates(async (base) => {
    const apiBase = buildShippingAddressBase(base);
    const res = await axios.put(`${apiBase}/shipping-addresses/${id}`, payload, { headers });
    return res.data;
  });
}

export async function setDefaultShippingAddress(id: number, userId: number): Promise<ShippingAddress> {
  const headers = getAuthHeaders();
  return tryCandidates(async (base) => {
    const apiBase = buildShippingAddressBase(base);
    const res = await axios.patch(`${apiBase}/shipping-addresses/${id}/default`, null, {
      headers,
      params: { userId },
    });
    return res.data;
  });
}

export async function deleteShippingAddress(id: number, userId: number): Promise<void> {
  const headers = getAuthHeaders();
  await tryCandidates(async (base) => {
    const apiBase = buildShippingAddressBase(base);
    await axios.delete(`${apiBase}/shipping-addresses/${id}`, { headers, params: { userId } });
  });
}
