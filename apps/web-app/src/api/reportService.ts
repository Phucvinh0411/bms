export interface ReportSummary {
  service: string;
  status: string;
  generatedAt: string;
  message: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  totalBooksSold: number;
}

export interface DailySales {
  dateStr: string;
  revenue: number;
  ordersCount: number;
}

export interface WeeklySales {
  weekNumber: number;
  yearNumber: number;
  revenue: number;
  ordersCount: number;
}

export interface MonthlySales {
  monthNumber: number;
  yearNumber: number;
  revenue: number;
  ordersCount: number;
}

export interface QuarterlySales {
  quarterNumber: number;
  yearNumber: number;
  revenue: number;
  ordersCount: number;
}

export interface YearlySales {
  yearNumber: number;
  revenue: number;
  ordersCount: number;
}

export interface TopBook {
  bookId: number;
  quantitySold: number;
  totalRevenue: number;
}

const reportApiBase = process.env.NEXT_PUBLIC_REPORT_SERVICE_URL || 'http://localhost/api/v1/reports';
const REPORT_BASE_URL = `${reportApiBase}/api/reports`;

// Timeout 30 giây cho mỗi request — đủ cho cold start của JVM
const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(body || `HTTP ${response.status} khi gọi ${url}`);
    }
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout sau ${timeoutMs / 1000}s khi gọi report-service`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const reportService = {
  async getSummary(): Promise<ReportSummary> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/summary`);
    return response.json() as Promise<ReportSummary>;
  },

  async getSalesSummary(): Promise<SalesSummary> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/sales-summary`);
    return response.json() as Promise<SalesSummary>;
  },

  async getDailySales(): Promise<DailySales[]> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/daily-sales`);
    return response.json() as Promise<DailySales[]>;
  },

  async getWeeklySales(): Promise<WeeklySales[]> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/weekly-sales`);
    return response.json() as Promise<WeeklySales[]>;
  },

  async getMonthlySales(): Promise<MonthlySales[]> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/monthly-sales`);
    return response.json() as Promise<MonthlySales[]>;
  },

  async getQuarterlySales(): Promise<QuarterlySales[]> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/quarterly-sales`);
    return response.json() as Promise<QuarterlySales[]>;
  },

  async getYearlySales(): Promise<YearlySales[]> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/yearly-sales`);
    return response.json() as Promise<YearlySales[]>;
  },

  async getTopBooks(limit = 5): Promise<TopBook[]> {
    const response = await fetchWithTimeout(`${REPORT_BASE_URL}/top-books?limit=${limit}`);
    return response.json() as Promise<TopBook[]>;
  },
};
