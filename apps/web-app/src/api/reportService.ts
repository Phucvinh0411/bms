export interface ReportSummary {
  service: string;
  status: string;
  generatedAt: string;
  message: string;
}

const REPORT_BASE_URL = 'http://localhost/api/v1/reports/api/reports';

export const reportService = {
  async getSummary(): Promise<ReportSummary> {
    const response = await fetch(`${REPORT_BASE_URL}/summary`);
    if (!response.ok) {
      throw new Error((await response.text()) || 'Lỗi khi gọi report-service');
    }
    return response.json() as Promise<ReportSummary>;
  },
};
