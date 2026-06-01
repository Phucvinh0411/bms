'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, RefreshCw, DollarSign, ShoppingBag, BookOpen,
  AlertCircle, CheckCircle2, TrendingUp, Calendar, Inbox,
  Download, FileSpreadsheet, ListFilter, Table
} from 'lucide-react';
import { 
  reportService, 
  type SalesSummary, 
  type DailySales, 
  type WeeklySales, 
  type MonthlySales, 
  type QuarterlySales, 
  type YearlySales, 
  type TopBook, 
  type ReportSummary 
} from '@/src/api/reportService';
import { bookService } from '@/src/api/bookService';
import type { Book } from '@/src/types';

interface ResolvedTopBook extends TopBook {
  title?: string;
  author?: string;
  imageUrl?: string;
  price?: number;
}

type PeriodTab = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<PeriodTab>('daily');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [weeklySales, setWeeklySales] = useState<WeeklySales[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [quarterlySales, setQuarterlySales] = useState<QuarterlySales[]>([]);
  const [yearlySales, setYearlySales] = useState<YearlySales[]>([]);
  const [topBooks, setTopBooks] = useState<ResolvedTopBook[]>([]);
  const [serviceSummary, setServiceSummary] = useState<ReportSummary | null>(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Helper: fetch with retry for cold-start resilience
  const fetchWithRetry = async <T,>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const msg = err?.message || '';
        const isRetryable = msg.includes('504') || msg.includes('502') || msg.includes('fetch') || msg.includes('Failed');
        if (isRetryable && attempt < retries - 1) {
          await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    return null;
  };

  const loadData = async () => {
    setError('');
    try {
      // 1. Fetch statistics from report-service in parallel (with retry + partial failure tolerance)
      const results = await Promise.allSettled([
        fetchWithRetry(() => reportService.getSalesSummary()),
        fetchWithRetry(() => reportService.getDailySales()),
        fetchWithRetry(() => reportService.getWeeklySales()),
        fetchWithRetry(() => reportService.getMonthlySales()),
        fetchWithRetry(() => reportService.getQuarterlySales()),
        fetchWithRetry(() => reportService.getYearlySales()),
        fetchWithRetry(() => reportService.getTopBooks(5)),
        fetchWithRetry(() => reportService.getSummary())
      ]);

      // Extract values, using defaults for failed requests
      const getValue = <T,>(r: PromiseSettledResult<T | null>, fallback: T): T =>
        r.status === 'fulfilled' && r.value !== null ? r.value : fallback;

      const salesSum = getValue(results[0], { totalRevenue: 0, totalOrders: 0, totalBooksSold: 0 } as SalesSummary);
      const dailyS = getValue(results[1], [] as DailySales[]);
      const weeklyS = getValue(results[2], [] as WeeklySales[]);
      const monthlyS = getValue(results[3], [] as MonthlySales[]);
      const quarterlyS = getValue(results[4], [] as QuarterlySales[]);
      const yearlyS = getValue(results[5], [] as YearlySales[]);
      const topB = getValue(results[6], [] as TopBook[]);
      const svcSum = getValue(results[7], null as ReportSummary | null);

      // Count how many calls failed
      const failedCount = results.filter(r => r.status === 'rejected').length;

      setSummary(salesSum);
      setDailySales(dailyS || []);
      setWeeklySales(weeklyS || []);
      setMonthlySales(monthlyS || []);
      setQuarterlySales(quarterlyS || []);
      setYearlySales(yearlyS || []);
      setServiceSummary(svcSum);

      // If ALL requests failed, show error
      if (failedCount === results.length) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        throw firstError.reason;
      }

      // 2. Fetch book details to resolve book metadata for Top Books
      if (topB && topB.length > 0) {
        try {
          const allBooks = await bookService.getAllBooks();
          const booksMap = new Map<number, Book>();
          allBooks.forEach(b => booksMap.set(b.id, b));

          const resolved = topB.map((tb): ResolvedTopBook => {
            const book = booksMap.get(Number(tb.bookId));
            return {
              ...tb,
              title: book?.title || `Sách #${tb.bookId}`,
              author: book?.author || 'Chưa rõ tác giả',
              imageUrl: book?.imageUrl,
              price: book?.price
            };
          });
          setTopBooks(resolved);
        } catch (bookErr) {
          console.error('Không thể phân giải thông tin sách:', bookErr);
          // Fallback if book service fails
          setTopBooks(topB.map(tb => ({
            ...tb,
            title: `Sách #${tb.bookId}`,
            author: 'Chưa rõ tác giả'
          })));
        }
      } else {
        setTopBooks([]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Không thể kết nối với Report Service. Hãy thử bấm "Làm mới dữ liệu".');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    void loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper to format the period name for hover details and tables
  const getPeriodLabel = (item: any, tab: PeriodTab) => {
    if (tab === 'daily') {
      return new Date(item.dateStr).toLocaleDateString('vi-VN');
    }
    if (tab === 'weekly') {
      return `Tuần ${item.weekNumber}/${item.yearNumber}`;
    }
    if (tab === 'monthly') {
      return `Tháng ${item.monthNumber}/${item.yearNumber}`;
    }
    if (tab === 'quarterly') {
      return `Quý ${item.quarterNumber}/${item.yearNumber}`;
    }
    if (tab === 'yearly') {
      return `Năm ${item.yearNumber}`;
    }
    return '';
  };

  // Helper to format x-axis label for charts
  const getPeriodXLabel = (item: any, tab: PeriodTab) => {
    if (tab === 'daily') {
      return formatDate(item.dateStr);
    }
    if (tab === 'weekly') {
      return `T${item.weekNumber}`;
    }
    if (tab === 'monthly') {
      return `Th${item.monthNumber}`;
    }
    if (tab === 'quarterly') {
      return `Q${item.quarterNumber}`;
    }
    if (tab === 'yearly') {
      return `${item.yearNumber}`;
    }
    return '';
  };

  // Get active data array based on the selected tab
  const getActiveData = (): any[] => {
    switch (activeTab) {
      case 'weekly': return weeklySales;
      case 'monthly': return monthlySales;
      case 'quarterly': return quarterlySales;
      case 'yearly': return yearlySales;
      case 'daily':
      default:
        return dailySales;
    }
  };

  // CSV Exporter
  const exportToCSV = () => {
    const dataList = getActiveData();
    if (dataList.length === 0) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM to prevent Vietnamese characters displaying incorrectly in Excel
    csvContent += 'Thời gian,Doanh thu (VND),Số đơn hàng\n';

    dataList.forEach(item => {
      const label = getPeriodLabel(item, activeTab);
      const revenue = Math.round(item.revenue);
      const orders = item.ordersCount;
      csvContent += `"${label}",${revenue},${orders}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const timeStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Bao_cao_doanh_thu_${activeTab}_${timeStamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeData = getActiveData();

  // SVG Chart Calculations
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Max value calculation for chart scaling
  const maxRevenue = activeData.length > 0 
    ? Math.max(...activeData.map(d => d.revenue), 100000) 
    : 100000;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #e2e8f0',
          borderTopColor: '#1e293b', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Đang tải báo cáo thống kê...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Keyframe animation for premium feel */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .stat-card { transition: all 0.2s ease-in-out; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02); }
        .chart-bar { transition: fill 0.2s, opacity 0.2s; cursor: pointer; }
        .chart-bar:hover { fill: #2563eb !important; }
        .action-btn { transition: all 0.15s; }
        .action-btn:hover { background-color: #f1f5f9; }
        .tab-btn { transition: all 0.2s; cursor: pointer; border: none; font-size: 13px; font-weight: 600; }
        .tab-btn:hover { color: #0f172a; }
        .data-table th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .data-table td { padding: 14px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
        .data-table tr:hover { background-color: #f8fafc; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26, fontWeight: 700 }}>Thống kê & Báo cáo</h1>
            {serviceSummary && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, padding: '2px 8px', borderRadius: 12,
                background: '#ecfdf5', color: '#047857', fontWeight: 600
              }}>
                <CheckCircle2 size={12} /> Live
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            Theo dõi doanh thu bán hàng và dữ liệu sách bán chạy nhất của BookHaven.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Export Report Button */}
          <button 
            onClick={exportToCSV}
            disabled={activeData.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', border: '1px solid #10b981',
              borderRadius: 10, background: '#10b981', color: '#fff',
              fontWeight: 600, cursor: activeData.length === 0 ? 'not-allowed' : 'pointer', fontSize: 14,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: activeData.length === 0 ? 0.6 : 1,
              transition: 'all 0.15s'
            }}
          >
            <Download size={15} />
            Xuất báo cáo (CSV)
          </button>

          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', border: '1px solid #e2e8f0',
              borderRadius: 10, background: '#fff', color: '#1e293b',
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            className="action-btn"
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {error ? (
        <div style={{
          background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12,
          padding: '20px 24px', display: 'flex', gap: 12, alignItems: 'flex-start',
          color: '#991b1b', marginBottom: 24
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15 }}>Lỗi kết nối cơ sở dữ liệu báo cáo</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{error}</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626', opacity: 0.8 }}>
              Hãy chắc chắn rằng container <code>report-service</code> và RabbitMQ đang hoạt động ổn định.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
            {[
              {
                label: 'Tổng doanh thu',
                value: summary ? formatVND(summary.totalRevenue) : '0đ',
                icon: DollarSign,
                color: '#8b5cf6',
                bgColor: '#f5f3ff',
                subText: 'Doanh số thực nhận từ đơn hoàn thành'
              },
              {
                label: 'Số đơn thành công',
                value: summary ? summary.totalOrders : 0,
                icon: ShoppingBag,
                color: '#3b82f6',
                bgColor: '#eff6ff',
                subText: 'Đơn hàng được ACK qua RabbitMQ'
              },
              {
                label: 'Tổng sách đã bán',
                value: summary ? summary.totalBooksSold : 0,
                icon: BookOpen,
                color: '#10b981',
                bgColor: '#ecfdf5',
                subText: 'Số bản sao sách đã giao thành công'
              }
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div 
                  key={i} 
                  style={{
                    background: '#fff', borderRadius: 16, padding: '24px 20px',
                    border: '1px solid #e2e8f0', display: 'flex', gap: 18,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  className="stat-card"
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: card.bgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={22} style={{ color: card.color }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{card.label}</span>
                    <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: '4px 0 2px' }}>{card.value}</h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{card.subText}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts and Lists Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 28 }}>
            
            {/* Sales Chart Section */}
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
              padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column'
            }}>
              
              {/* Header inside Chart with Filters */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Biểu đồ doanh thu</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Xem doanh số và số đơn hàng theo chu kỳ</p>
                </div>
                
                {/* Period Selector Tabs */}
                <div style={{
                  display: 'flex', padding: 3, background: '#f1f5f9', borderRadius: 8, gap: 2
                }}>
                  {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as PeriodTab[]).map(tab => {
                    const isActive = activeTab === tab;
                    const tabLabels: Record<PeriodTab, string> = {
                      daily: 'Ngày',
                      weekly: 'Tuần',
                      monthly: 'Tháng',
                      quarterly: 'Quý',
                      yearly: 'Năm'
                    };
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setHoveredBarIndex(null);
                        }}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          background: isActive ? '#fff' : 'transparent',
                          color: isActive ? '#0f172a' : '#64748b',
                          boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                        }}
                        className="tab-btn"
                      >
                        {tabLabels[tab]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeData.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: 200, color: '#94a3b8'
                }}>
                  <Inbox size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 13, margin: 0 }}>Chưa có dữ liệu giao dịch cho khoảng thời gian này</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Interactive SVG Bar Chart */}
                  <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                    {/* Y-axis Ticks */}
                    {yTicks.map((tick, i) => {
                      const y = paddingTop + graphHeight - tick * graphHeight;
                      const tickValue = Math.round(tick * maxRevenue);
                      return (
                        <g key={i}>
                          <line 
                            x1={paddingLeft} 
                            y1={y} 
                            x2={chartWidth - paddingRight} 
                            y2={y} 
                            stroke="#f1f5f9" 
                            strokeWidth={1} 
                          />
                          <text 
                            x={paddingLeft - 8} 
                            y={y + 4} 
                            textAnchor="end" 
                            fill="#94a3b8" 
                            style={{ fontSize: 10, fontFamily: 'sans-serif' }}
                          >
                            {tickValue >= 1000000 
                              ? `${(tickValue / 1000000).toFixed(1)}M` 
                              : tickValue >= 1000 
                                ? `${(tickValue / 1000).toFixed(0)}k` 
                                : tickValue}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {activeData.map((data, i) => {
                      // Adjust bar width dynamically based on dataset size
                      const totalBars = activeData.length;
                      const barWidth = Math.max(Math.min(32, Math.floor(graphWidth / (totalBars * 1.5))), 8);
                      const barSpacing = (graphWidth - barWidth * totalBars) / (totalBars + 1);
                      const x = paddingLeft + barSpacing + i * (barWidth + barSpacing);
                      
                      const barHeight = (data.revenue / maxRevenue) * graphHeight;
                      const y = paddingTop + graphHeight - barHeight;

                      const isHovered = hoveredBarIndex === i;

                      return (
                        <g 
                          key={i}
                          onMouseEnter={() => setHoveredBarIndex(i)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                        >
                          {/* Main bar background */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(barHeight, 4)} // at least 4px for tiny values
                            rx={2}
                            fill={isHovered ? '#2563eb' : '#3b82f6'}
                            opacity={hoveredBarIndex === null || isHovered ? 1 : 0.6}
                            className="chart-bar"
                          />
                          
                          {/* Label X (only display alternating labels if dataset is too dense) */}
                          {(totalBars < 15 || i % Math.ceil(totalBars / 12) === 0) && (
                            <text
                              x={x + barWidth / 2}
                              y={chartHeight - 8}
                              textAnchor="middle"
                              fill="#64748b"
                              style={{ fontSize: 10, fontWeight: 500, fontFamily: 'sans-serif' }}
                            >
                              {getPeriodXLabel(data, activeTab)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Dynamic Tooltip Detail Box */}
                  <div style={{
                    padding: '12px 16px', background: '#f8fafc',
                    borderRadius: 10, border: '1px solid #f1f5f9',
                    minHeight: 58, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    {hoveredBarIndex !== null ? (
                      <>
                        <div>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                            Chi tiết: {getPeriodLabel(activeData[hoveredBarIndex], activeTab)}
                          </span>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                            {formatVND(activeData[hoveredBarIndex].revenue)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>SỐ ĐƠN HÀNG</span>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6', marginTop: 2 }}>
                            {activeData[hoveredBarIndex].ordersCount} đơn
                          </div>
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                        💡 Di chuột qua các cột của biểu đồ để xem doanh thu chi tiết.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Top Books Section */}
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
              padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Sách bán chạy</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Top 5 cuốn sách dẫn đầu doanh thu</p>
                </div>
                <TrendingUp size={18} style={{ color: '#10b981' }} />
              </div>

              {topBooks.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: 200, color: '#94a3b8'
                }}>
                  <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 13, margin: 0 }}>Chưa có số liệu bán sách</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {topBooks.map((book, idx) => (
                    <div 
                      key={book.bookId} 
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        paddingBottom: 12,
                        borderBottom: idx < topBooks.length - 1 ? '1px solid #f8fafc' : 'none'
                      }}
                    >
                      {/* Rank Indicator */}
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f8fafc',
                        color: idx === 0 ? '#d97706' : idx === 1 ? '#475569' : idx === 2 ? '#ea580c' : '#64748b',
                        fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>

                      {/* Cover Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={book.imageUrl || '/placeholder-book.png'} 
                        alt={book.title} 
                        style={{
                          width: 36, height: 50, objectFit: 'cover',
                          borderRadius: 6, background: '#f1f5f9', flexShrink: 0
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 50"><rect fill="%23f1f5f9" width="36" height="50"/><text x="18" y="29" text-anchor="middle" fill="%2394a3b8" font-size="10">📖</text></svg>'; }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {book.title}
                        </p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                          Tác giả: {book.author}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {formatVND(book.totalRevenue)}
                        </p>
                        <p style={{ fontSize: 11, color: '#10b981', fontWeight: 600, margin: '2px 0 0' }}>
                          Đã bán: {book.quantitySold}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Data Table */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
            padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: 28
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Table size={20} style={{ color: '#475569' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Bảng số liệu chi tiết ({activeTab === 'daily' ? 'Ngày' : activeTab === 'weekly' ? 'Tuần' : activeTab === 'monthly' ? 'Tháng' : activeTab === 'quarterly' ? 'Quý' : 'Năm'})
              </h3>
            </div>

            {activeData.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, fontStyle: 'italic' }}>Chưa có dữ liệu chi tiết.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Thời gian</th>
                      <th style={{ width: '35%' }}>Doanh thu thu về (VND)</th>
                      <th style={{ width: '25%' }}>Số lượng đơn hàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.slice().reverse().map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{getPeriodLabel(item, activeTab)}</td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>{formatVND(item.revenue)}</td>
                        <td>{item.ordersCount} đơn</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Info footer */}
      {serviceSummary && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px', background: '#fafafa', borderRadius: 12,
          border: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8'
        }}>
          <span>Dịch vụ kết nối: <strong>{serviceSummary.service}</strong></span>
          <span>Cập nhật lần cuối: {new Date(serviceSummary.generatedAt).toLocaleString('vi-VN')}</span>
        </div>
      )}
    </div>
  );
}

