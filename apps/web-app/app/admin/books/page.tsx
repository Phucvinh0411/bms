'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bookService } from '@/src/api/bookService';
import { categoryService } from '@/src/api/categoryService';
import type { Book, Category } from '@/src/types';
import {
  Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, BookOpen, Filter
} from 'lucide-react';

interface RawCategory extends Category {
  parentId: number | null;
}

export default function AdminBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<RawCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksData, catsData] = await Promise.all([
          bookService.getAllBooks(),
          categoryService.getAllCategories() as Promise<RawCategory[]>,
        ]);
        setBooks(booksData || []);
        setCategories(catsData || []);
      } catch (err) {
        console.error('Error loading books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build category name map
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach(c => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const parentCategories = useMemo(() =>
    categories.filter(c => c.parentId === null),
    [categories]
  );

  const childCategories = useMemo(() => {
    if (!filterCategory) return [];
    const catId = Number(filterCategory);
    return categories.filter(c => c.parentId === catId);
  }, [filterCategory, categories]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    let result = [...books].sort((a, b) => b.id - a.id);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.title?.toLowerCase().includes(term) ||
        b.author?.toLowerCase().includes(term) ||
        b.publisher?.toLowerCase().includes(term)
      );
    }

    if (filterSubCategory) {
      const subCatId = Number(filterSubCategory);
      result = result.filter(b => {
        const bookCatId = b.categoryId || b.category?.id;
        return bookCatId === subCatId;
      });
    } else if (filterCategory) {
      const catId = Number(filterCategory);
      // Include books in this category or any child category
      const childIds = categories.filter(c => c.parentId === catId).map(c => c.id);
      const allCatIds = [catId, ...childIds];
      result = result.filter(b => {
        const bookCatId = b.categoryId || b.category?.id;
        return bookCatId !== undefined && allCatIds.includes(bookCatId);
      });
    }

    if (filterStatus === 'deleted') {
      result = result.filter(b => b.isDeleted);
    } else if (filterStatus === 'low') {
      result = result.filter(b => !b.isDeleted && (b.stockQuantity ?? 0) > 0 && (b.stockQuantity ?? 0) <= 10);
    } else if (filterStatus === 'available') {
      result = result.filter(b => !b.isDeleted && (b.stockQuantity ?? 0) > 10);
    } else if (filterStatus === 'out') {
      result = result.filter(b => !b.isDeleted && (b.stockQuantity ?? 0) === 0);
    }

    return result;
  }, [books, searchTerm, filterCategory, filterSubCategory, filterStatus, categories]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBooks.length / pageSize);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterSubCategory, filterStatus, pageSize]);

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await bookService.deleteBook(id);
      setBooks(prev => prev.map(b => b.id === id ? { ...b, isDeleted: true } : b));
      setMessage({ type: 'success', text: 'Đã ngừng kinh doanh sách thành công!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting book:', err);
      setMessage({ type: 'error', text: 'Lỗi khi xóa sách. Vui lòng thử lại.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getCategoryName = (book: Book) => {
    if (book.category?.name) return book.category.name;
    return categoryMap.get(book.categoryId) || '—';
  };

  const getStatusBadge = (book: Book) => {
    if (book.isDeleted) return { label: 'Ngừng bán', bg: '#fef2f2', color: '#991b1b' };
    const stock = book.stockQuantity ?? 0;
    if (stock === 0) return { label: 'Hết hàng', bg: '#fef2f2', color: '#dc2626' };
    if (stock <= 10) return { label: 'Sắp hết', bg: '#fffbeb', color: '#d97706' };
    return { label: 'Còn hàng', bg: '#f0fdf4', color: '#16a34a' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #e2e8f0',
          borderTopColor: '#1e293b', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 }}>Quản lý sách</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>
            Danh sách tất cả sách trong hệ thống
          </p>
        </div>
        <Link href="/add-book" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          background: '#10b981', color: '#fff',
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
          transition: 'all 0.15s',
        }}>
          <Plus size={18} /> Thêm sách
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', borderRadius: 12,
          marginBottom: 20, fontSize: 14, fontWeight: 500,
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Filters Bar */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
        padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, tác giả..."
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              border: '1px solid #e2e8f0', borderRadius: 10,
              fontSize: 13, background: '#f8fafc', outline: 'none',
              color: '#334155',
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} style={{ color: '#94a3b8' }} />
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setFilterSubCategory(''); // Reset sub-category khi đổi parent
            }}
            style={{
              padding: '10px 32px 10px 12px', border: '1px solid #e2e8f0',
              borderRadius: 10, fontSize: 13, background: '#f8fafc',
              outline: 'none', color: '#334155', cursor: 'pointer',
              appearance: 'none' as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="">Tất cả danh mục cha</option>
            {parentCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Sub-category filter (chỉ hiện khi đã chọn danh mục cha) */}
          {filterCategory && childCategories.length > 0 && (
            <select
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              style={{
                padding: '10px 32px 10px 12px', border: '1px solid #e2e8f0',
                borderRadius: 10, fontSize: 13, background: '#f8fafc',
                outline: 'none', color: '#334155', cursor: 'pointer',
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">Tất cả danh mục con</option>
              {childCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 32px 10px 12px', border: '1px solid #e2e8f0',
            borderRadius: 10, fontSize: 13, background: '#f8fafc',
            outline: 'none', color: '#334155', cursor: 'pointer',
            appearance: 'none' as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="available">Còn hàng</option>
          <option value="low">Sắp hết hàng</option>
          <option value="out">Hết hàng</option>
          <option value="deleted">Ngừng bán</option>
        </select>

        {/* Result count */}
        <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 'auto' }}>
          Hiển thị {filteredBooks.length} sách
        </span>
      </div>

      {/* Books Table */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 150px 120px 80px 130px 100px 100px',
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          background: '#fafbfc', fontSize: 12, fontWeight: 600,
          color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <span>Ảnh</span>
          <span>Tên sách</span>
          <span>Tác giả</span>
          <span>Giá</span>
          <span>Kho</span>
          <span>Danh mục</span>
          <span>Trạng thái</span>
          <span style={{ textAlign: 'center' }}>Thao tác</span>
        </div>

        {/* Table Body */}
        {paginatedBooks.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Không tìm thấy sách nào</p>
            <p style={{ fontSize: 13, margin: '4px 0 0' }}>Thử thay đổi bộ lọc hoặc thêm sách mới</p>
          </div>
        ) : (
          paginatedBooks.map((book) => {
            const status = getStatusBadge(book);
            return (
              <div
                key={book.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 150px 120px 80px 130px 100px 100px',
                  padding: '14px 20px',
                  borderBottom: '1px solid #f8fafc',
                  alignItems: 'center',
                  fontSize: 14,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                {/* Cover */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.imageUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56"><rect fill="%23f1f5f9" width="40" height="56" rx="4"/></svg>'}
                  alt={book.title}
                  style={{
                    width: 40, height: 56, objectFit: 'cover',
                    borderRadius: 6, background: '#f1f5f9',
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.background = '#f1f5f9'; }}
                />

                {/* Title */}
                <div style={{ minWidth: 0, paddingRight: 12 }}>
                  <Link
                    href={`/detail/${book.id}`}
                    style={{
                      fontSize: 14, fontWeight: 600, color: '#1e293b', textDecoration: 'none',
                      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {book.title}
                  </Link>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                    {book.publisher || '—'}
                  </p>
                </div>

                {/* Author */}
                <span style={{ color: '#475569', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {book.author || '—'}
                </span>

                {/* Price */}
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                  {new Intl.NumberFormat('vi-VN').format(book.price)}đ
                </span>

                {/* Stock */}
                <span style={{
                  fontWeight: 600, fontSize: 13,
                  color: (book.stockQuantity ?? 0) <= 10 ? '#d97706' : '#475569',
                }}>
                  {book.stockQuantity ?? 0}
                </span>

                {/* Category */}
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  padding: '4px 10px', borderRadius: 20,
                  background: '#f1f5f9', color: '#475569',
                  display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 120,
                }}>
                  {getCategoryName(book)}
                </span>

                {/* Status */}
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '4px 10px', borderRadius: 20,
                  background: status.bg, color: status.color,
                  display: 'inline-block',
                }}>
                  {status.label}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <button
                    onClick={() => router.push(`/admin/books/edit/${book.id}`)}
                    title="Sửa"
                    style={{
                      width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff',
                      cursor: 'pointer', color: '#3b82f6', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => !book.isDeleted && setDeleteId(book.id)}
                    title={book.isDeleted ? "Sách đã ngừng bán" : "Ngừng bán"}
                    disabled={book.isDeleted}
                    style={{
                      width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: book.isDeleted ? '1px solid #e2e8f0' : '1px solid #fecaca', 
                      borderRadius: 8, 
                      background: book.isDeleted ? '#f8fafc' : '#fff',
                      cursor: book.isDeleted ? 'not-allowed' : 'pointer', 
                      color: book.isDeleted ? '#94a3b8' : '#ef4444', 
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { 
                      if (!book.isDeleted) {
                        e.currentTarget.style.background = '#fef2f2'; 
                        e.currentTarget.style.borderColor = '#f87171'; 
                      }
                    }}
                    onMouseLeave={(e) => { 
                      if (!book.isDeleted) {
                        e.currentTarget.style.background = '#fff'; 
                        e.currentTarget.style.borderColor = '#fecaca'; 
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        {filteredBooks.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid #f1f5f9',
            fontSize: 13, color: '#64748b',
          }}>
            <span>
              Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredBooks.length)} trên {filteredBooks.length} sách
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8,
                  background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.4 : 1, fontSize: 13, color: '#475569',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ChevronLeft size={14} /> Trước
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: currentPage === pageNum ? '1px solid #1e293b' : '1px solid #e2e8f0',
                      borderRadius: 8, fontSize: 13, fontWeight: currentPage === pageNum ? 600 : 400,
                      background: currentPage === pageNum ? '#1e293b' : '#fff',
                      color: currentPage === pageNum ? '#fff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8,
                  background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.4 : 1, fontSize: 13, color: '#475569',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: '6px 28px 6px 10px', border: '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 13, background: '#fff', outline: 'none',
                color: '#475569', cursor: 'pointer',
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => !deleting && setDeleteId(null)}>
          <div
            style={{
              background: '#fff', borderRadius: 20, padding: 32,
              width: 420, maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Trash2 size={24} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', textAlign: 'center', margin: '0 0 8px' }}>
              Ngừng bán sách này?
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
              Hành động này sẽ ẩn sách khỏi trang chủ và không cho phép khách hàng tiếp tục mua. Bạn có chắc chắn muốn ngừng kinh doanh sách này?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: 12,
                  border: '1px solid #e2e8f0', background: '#fff',
                  fontSize: 14, fontWeight: 600, color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: 12,
                  border: 'none', background: '#ef4444',
                  fontSize: 14, fontWeight: 600, color: '#fff',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                }}
              >
                {deleting ? 'Đang xử lý...' : 'Ngừng bán'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
