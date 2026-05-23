'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  Star, 
  ChevronDown,
  ChevronRight,
  Library,
  BookOpen,
  Briefcase,
  Brain,
  Baby,
  GraduationCap,
  Landmark,
  Laptop,
  Loader2,
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { bookService } from '@/src/api/bookService'; 
import { categoryService } from '@/src/api/categoryService';

import { useAddToCart } from '@/src/cart/hooks/useAddToCart';
import { getEffectiveUserId } from '@/src/cart/utils/userContext';
import { useAuth } from '@/src/auth/context';
import { useRouter } from 'next/navigation';

import type { Book, Category } from '@/src/types';

// Interface cho danh mục dạng cây (có danh mục con)
interface TreeCategory extends Category {
  parentId?: number | null;
  subCategories?: Category[];
}

// Interface cho raw category từ API
interface RawCategory extends Category {
  parentId: number | null;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-gray-500 mb-4" />
        <p className="text-gray-500">Đang tải...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get('search') || '').trim();
  const refreshToken = searchParams.get('updated');
  const SEARCH_PAGE_SIZE = 10;

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [loadingMoreSearchResults, setLoadingMoreSearchResults] = useState(false);

  const [categories, setCategories] = useState<TreeCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [pendingBookId, setPendingBookId] = useState<number | null>(null);

  const { addToCart, loading: addToCartLoading } = useAddToCart();
  const { isSignedIn, user } = useAuth();
  const router = useRouter();

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async <T,>(loader: () => Promise<T>, attempts = 3) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await loader();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await delay(750 * attempt);
        }
      }
    }

    throw lastError;
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
  };

  const getAllowedCategoryIds = () => {
    const allowedCategoryIds = new Set<number>(selectedCategories);

    selectedCategories.forEach((id) => {
      const category = categories.find((item) => item.id === id);
      if (category?.subCategories?.length) {
        category.subCategories.forEach((subCategory) => allowedCategoryIds.add(subCategory.id));
      }
    });

    return Array.from(allowedCategoryIds);
  };

  useEffect(() => {
    const handleClearFilters = () => {
      clearFilters();
    };
    window.addEventListener('clearFilters', handleClearFilters);
    return () => window.removeEventListener('clearFilters', handleClearFilters);
  }, []);

  useEffect(() => {
    if (isSignedIn && user?.role === 'ADMIN') {
      router.replace('/admin');
    }
  }, [isSignedIn, user, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const rawCategories = await fetchWithRetry(() => categoryService.getAllCategories()) as RawCategory[];
        const parentCategories = rawCategories.filter((cat) => cat.parentId === null);

        const treeCategories: TreeCategory[] = parentCategories.map((parent) => ({
          ...parent,
          subCategories: rawCategories.filter((child) => child.parentId === parent.id),
        }));

        setCategories(treeCategories);

        if (treeCategories.length > 0) {
          setExpandedCategories(treeCategories.slice(0, 3).map((category) => category.id));
        }
      } catch (err) {
        console.error('[HOME] Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchAllBooks = async () => {
      if (searchQuery) return;

      try {
        console.log('[HOME] useEffect triggered with refreshToken:', refreshToken);
        setLoading(true);
        setHasMoreSearchResults(false);
        const data = await fetchWithRetry(() => bookService.getAllBooks());
        setBooks(data);
      } catch (err) {
        console.error('[HOME] Error fetching books:', err);
        setError('Không thể tải danh sách sách. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllBooks();
  }, [refreshToken, searchQuery]);

  useEffect(() => {
    const fetchSearchBooks = async () => {
      if (!searchQuery) return;

      try {
        setLoading(true);
        setError(null);
        setHasMoreSearchResults(false);
        const categoryIdsCsv = getAllowedCategoryIds().join(',');
        const data = await fetchWithRetry(() =>
          bookService.hybridSearchBooks(searchQuery, SEARCH_PAGE_SIZE, 0, {
            categoryIdsCsv: categoryIdsCsv || undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
          }),
        );

        setHasMoreSearchResults(data.length === SEARCH_PAGE_SIZE);
        setBooks(data);
      } catch (err) {
        console.error('[HOME] Error fetching books:', err);
        setError('Lỗi khi tìm kiếm. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchSearchBooks();
  }, [searchQuery, selectedCategories, minPrice, maxPrice, categories]);

  if (isSignedIn && user?.role === 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#1F4788]" />
          <p className="text-sm font-medium text-[#666]">Đang chuyển đến trang quản lý...</p>
        </div>
      </div>
    );
  }

  const handleLoadMoreSearchResults = async () => {
    if (!searchQuery || loadingMoreSearchResults || !hasMoreSearchResults) return;

    try {
      setLoadingMoreSearchResults(true);
      const nextOffset = books.length;
      const categoryIdsCsv = getAllowedCategoryIds().join(',');
      const nextPage = await fetchWithRetry(() =>
        bookService.hybridSearchBooks(searchQuery, SEARCH_PAGE_SIZE, nextOffset, {
          categoryIdsCsv: categoryIdsCsv || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
        }),
      );

      setBooks((currentBooks) => [...currentBooks, ...nextPage]);
      setHasMoreSearchResults(nextPage.length === SEARCH_PAGE_SIZE);
    } catch (err) {
      console.error('[HOME] Error loading more search results:', err);
      toast.error('Không thể tải thêm kết quả tìm kiếm.');
    } finally {
      setLoadingMoreSearchResults(false);
    }
  };

  const getCategoryIcon = (categoryId: number) => {
    switch (categoryId) {
      case 1: return <BookOpen size={18} />;
      case 2: return <Briefcase size={18} />;
      case 3: return <Baby size={18} />;
      case 4: return <Brain size={18} />;
      case 6: return <GraduationCap size={18} />;
      case 11:
      case 19: return <Laptop size={18} />;
      case 12: return <Landmark size={18} />;
      default: return <Library size={18} />;
    }
  };

  // Hàm xử lý đóng/mở danh mục
  const toggleCategoryExpand = (categoryId: number) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  // Hàm xử lý chọn/bỏ chọn danh mục để lọc
  const toggleCategoryFilter = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
    // Cuộn lên đầu trang sau khi lọc
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tính toán danh sách sách sau khi lọc
  const filteredBooks = books.filter(book => {
    // Lọc theo danh mục chỉ áp dụng cho chế độ không search.
    if (searchQuery) {
      return true;
    }

    // Lọc theo danh mục
    const catId = book.category?.id || book.categoryId;
    
    // Nếu chọn danh mục cha, bao gồm cả danh mục con của nó
    const allowedCategoryIds = new Set(getAllowedCategoryIds());

    const matchCategory = selectedCategories.length === 0 || allowedCategoryIds.has(catId) || allowedCategoryIds.has(book.parentCategoryId as number || book.category?.parentId as number);

    const matchSearch = true;
    const isNotDeleted = !book.isDeleted;

    // Lọc theo khoảng giá
    const price = Number(book.price) || 0;
    const minP = minPrice ? Number(minPrice) : 0;
    const maxP = maxPrice ? Number(maxPrice) : Infinity;
    const matchPrice = price >= minP && price <= maxP;

    return matchCategory && matchSearch && matchPrice && isNotDeleted;
  });

  const hasActiveFilters = selectedCategories.length > 0 || Boolean(minPrice) || Boolean(maxPrice);

  const handleAddToCart = async (bookId: number) => {
    if (!isSignedIn) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      router.push('/auth/login');
      return;
    }

    const userId = getEffectiveUserId();
    if (!userId) return;

    try {
      setPendingBookId(bookId);
      await addToCart({ userId, bookId, quantity: 1 });
    } finally {
      setPendingBookId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-84px)] bg-gradient-to-b from-[#f8fafc] via-[#f6f8fc] to-[#eef2f7]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 md:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Sidebar Filters */}
      <aside className="w-full lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-2xl border border-[#e4e8f0] bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#eef2f7] pb-4">
            <h3 className="text-lg font-semibold text-slate-900">Danh mục</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                Xoá lọc
              </button>
            )}
          </div>
          
          <div className="mb-7 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
            <div className="flex flex-col gap-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Đang tải danh mục...</p>
              ) : (
                categories.map((parentCat) => {
                  const currentId = parentCat.id;
                  const isExpanded = expandedCategories.includes(currentId);

                  return (
                    <div key={currentId} className="mb-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 last:mb-0">
                      <div className="group flex w-full items-center justify-between py-1 text-left">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-700" 
                            checked={selectedCategories.includes(currentId)}
                            onChange={() => toggleCategoryFilter(currentId)}
                          />
                          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
                            <span className="text-slate-400 transition-colors group-hover:text-slate-700">
                              {getCategoryIcon(currentId)}
                            </span>
                            {parentCat.name}
                          </span>
                        </label>
                        {parentCat.subCategories && parentCat.subCategories.length > 0 && (
                          <button
                            onClick={() => toggleCategoryExpand(currentId)}
                            className="p-1 text-slate-400 transition-colors hover:bg-slate-200 rounded group-hover:text-slate-700"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        )}
                      </div>

                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isExpanded ? 'mt-3 max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        {parentCat.subCategories && parentCat.subCategories.length > 0 && (
                          <div className="ml-6 flex flex-col gap-2 pb-1">
                            {parentCat.subCategories.map((childCat) => {
                              const childId = childCat.id;
                              return (
                                <label key={childId} className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-slate-100">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-700"
                                    checked={selectedCategories.includes(childId)}
                                    onChange={() => toggleCategoryFilter(childId)}
                                  />
                                  <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900">
                                    {childCat.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Khoảng giá</h3>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Từ" 
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-700" 
              />
              <span className="text-slate-400">-</span>
              <input 
                type="number" 
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Đến" 
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-700" 
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Banner */}
        <div className="relative mb-7 overflow-hidden rounded-3xl border border-[#d7e3ff] bg-gradient-to-r from-[#e9f0ff] via-[#dce9ff] to-[#f4e8ff] p-6 shadow-[0_16px_40px_rgba(59,130,246,0.16)] md:p-8">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[#7aa2ff]/20 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-[#c084fc]/20 blur-3xl" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <div className="z-10 max-w-xl">
            <p className="mb-3 inline-flex rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Bộ sưu tập tháng này</p>
            <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Mùa đọc sách Thu Đông</h1>
            <p className="mb-6 text-base text-slate-700 sm:text-lg">Giảm giá đến 30% cho các tác phẩm kinh điển và sách mới phát hành. Cập nhật mỗi tuần để không bỏ lỡ tựa hot.</p>
            <button className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">Khám phá ngay</button>
          </div>
          <div className="relative h-48 overflow-hidden rounded-2xl border border-white/60 shadow-[0_12px_26px_rgba(15,23,42,0.18)] sm:h-56 md:h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200&auto=format&fit=crop" alt="Kệ sách" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

        {/* Books Grid */}
        <div className="mt-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="text-center text-red-700">{error}</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-slate-600">
                {searchQuery
                  ? 'Không tìm thấy sách phù hợp với từ khóa tìm kiếm.'
                  : selectedCategories.length > 0 || minPrice || maxPrice
                  ? 'Không tìm thấy sách phù hợp với tiêu chí lọc.'
                  : 'Không có sách nào để hiển thị.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white/60 backdrop-blur transition hover:border-slate-200 hover:shadow-lg"
                >
                  <Link href={`/detail/${book.id}`} className="flex flex-1 flex-col">
                    {(() => {
                      const totalReviews = book.reviews ? book.reviews.length : 0;
                      const avgRating = totalReviews > 0 
                        ? Math.round(book.reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews)
                        : 0;

                      return (
                        <>
                          {/* Book Image */}
                          <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-b from-slate-100 to-slate-50">
                            {book.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.imageUrl}
                                alt={book.title}
                                className="h-48 w-full object-cover transition group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-48 items-center justify-center">
                                <BookOpen size={48} className="text-slate-300" />
                              </div>
                            )}
                          </div>

                          {/* Book Info */}
                          <div className="flex flex-1 flex-col p-4 pb-2">
                            <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-slate-900 transition hover:text-slate-700">
                              {book.title}
                            </h3>
                            <p className="mb-3 text-xs text-slate-500">{book.author || 'Không rõ tác giả'}</p>

                            {/* Rating */}
                            <div className="mb-3 flex items-center gap-1">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    className={i < avgRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-slate-500">({totalReviews})</span>
                            </div>

                            <p className="mb-4 line-clamp-2 text-xs text-slate-600">
                              {book.description || 'Không có mô tả'}
                            </p>

                            {/* Price and Stock */}
                            <div className="mt-auto flex items-baseline justify-between">
                              <span className="text-lg font-bold text-slate-900">
                                ₫{book.price?.toLocaleString()}
                              </span>
                              <span className={`text-xs font-semibold ${(book.stockQuantity ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {(book.stockQuantity ?? 0) > 0 ? 'Còn hàng' : 'Hết hàng'}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </Link>

                  {/* Add to Cart Button */}
                  <div className="p-4 pt-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(book.id);
                      }}
                      disabled={(addToCartLoading && pendingBookId === book.id) || (book.stockQuantity ?? 0) === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {addToCartLoading && pendingBookId === book.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Đang thêm...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          Thêm vào giỏ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && filteredBooks.length > 0 && (
            <div className="mt-8 flex justify-center">
              {hasMoreSearchResults ? (
                <button
                  onClick={handleLoadMoreSearchResults}
                  disabled={loadingMoreSearchResults}
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMoreSearchResults ? 'Đang tải thêm...' : 'Hiển thị thêm kết quả'}
                </button>
              ) : (
                <p className="text-sm text-slate-500">Đã hiển thị hết kết quả phù hợp.</p>
              )}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
    </div>
  );
}


