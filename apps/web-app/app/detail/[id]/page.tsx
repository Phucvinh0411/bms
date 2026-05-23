'use client';

import { Star, ShoppingCart, Heart, ChevronRight, User, Send, BookOpen, ArrowLeft, Trash2, Pencil, X, Check, Image as ImageIcon, Video, Paperclip } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { bookService } from '@/src/api/bookService';

import { useAddToCart } from '@/src/cart/hooks/useAddToCart';
import { getEffectiveUserId } from '@/src/cart/utils/userContext';
import type { Book, Review } from '@/src/types';

import { reviewService } from '@/src/api/reviewService';
import { useAuth } from '@/src/auth/context';
import { uploadService } from '@/src/api/uploadService';
import { orderService } from '@/src/api/orderService';


export default function DetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { addToCart, loading: addToCartLoading } = useAddToCart();
  const [hasPurchased, setHasPurchased] = useState(false);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editHoverRating, setEditHoverRating] = useState(0);
  const [editMediaUrls, setEditMediaUrls] = useState<string[]>([]);
  const [editNewMediaFiles, setEditNewMediaFiles] = useState<File[]>([]);

  const { user: authUser, isSignedIn } = useAuth();

  // LOAD DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await bookService.getBookById(Number(id));
        setBook(data);
        
        // Lấy danh sách đánh giá từ API
        try {
          const fetchedReviews = await reviewService.getReviewsOfBook(Number(id));
          // Sắp xếp review mới nhất lên đầu
          setReviews((fetchedReviews || []).sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          }));
        } catch (rErr) {
          console.error("Lỗi tải reviews:", rErr);
        }
      } catch (err) {
        console.error("Lỗi load detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (isSignedIn && authUser) {
      orderService.checkPurchase(authUser.id, Number(id))
        .then(setHasPurchased)
        .catch(err => console.error("Error checking purchase", err));
    } else {
      setHasPurchased(false);
    }
  }, [id, isSignedIn, authUser]);

  // ADD REVIEW

  const handleSubmitReview = async () => {
    if (!newReview.trim()) return;

    if (!isSignedIn || !authUser) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá');
      return;
    }

    setUploadingMedia(true);
    let uploadedUrls: string[] = [];

    try {
      // Upload files first
      if (newMediaFiles.length > 0) {
        const uploadPromises = newMediaFiles.map(file => uploadService.uploadFile(file, 'comment-images'));
        uploadedUrls = await Promise.all(uploadPromises);
      }

      const reviewerName = authUser.fullName || authUser.username || 'Người dùng';

      const addedReview = await reviewService.addReviewToBook(Number(id), {
        userName: reviewerName,
        userId: authUser.id,
        content: newReview,
        rating: rating,
        mediaUrls: uploadedUrls.filter(url => url !== '') // Bỏ qua URL rỗng nếu lỗi
      });

      if (addedReview) {
        setReviews([addedReview, ...reviews]);
        setNewReview('');
        setRating(5);
        setNewMediaFiles([]);
        toast.success('Gửi đánh giá thành công!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gửi đánh giá');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      // Validate file size/type if needed
      setNewMediaFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // EDIT REVIEW - bắt đầu chỉnh sửa
  const handleStartEdit = (review: Review) => {
    setEditingReviewId(review.id);
    setEditContent(review.content);
    setEditRating(review.rating);
    setEditHoverRating(0);
    setEditMediaUrls(review.mediaUrls || []);
    setEditNewMediaFiles([]);
  };

  // EDIT REVIEW - hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditContent('');
    setEditRating(5);
    setEditHoverRating(0);
    setEditMediaUrls([]);
    setEditNewMediaFiles([]);
  };

  // EDIT REVIEW - lưu chỉnh sửa
  const handleSaveEdit = async (reviewId: number) => {
    if (!editContent.trim()) {
      toast.error('Nội dung đánh giá không được để trống');
      return;
    }
    if (!authUser) return;

    setUploadingMedia(true);
    let newUploadedUrls: string[] = [];

    try {
      if (editNewMediaFiles.length > 0) {
        const uploadPromises = editNewMediaFiles.map(file => uploadService.uploadFile(file, 'comment-images'));
        newUploadedUrls = await Promise.all(uploadPromises);
      }

      const finalMediaUrls = [...editMediaUrls, ...newUploadedUrls.filter(url => url !== '')];
      const reviewerName = authUser.fullName || authUser.username || '';
      
      const updated = await reviewService.updateReview(reviewId, {
        content: editContent,
        rating: editRating,
        mediaUrls: finalMediaUrls
      }, authUser.id, reviewerName);

      if (updated) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, content: updated.content, rating: updated.rating, mediaUrls: updated.mediaUrls } : r));
        setEditingReviewId(null);
        setEditContent('');
        setEditRating(5);
        setEditMediaUrls([]);
        setEditNewMediaFiles([]);
        toast.success('Cập nhật đánh giá thành công!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật đánh giá');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setEditNewMediaFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeEditExistingMedia = (index: number) => {
    setEditMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeEditNewFile = (index: number) => {
    setEditNewMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // DELETE REVIEW - chủ sở hữu hoặc admin có thể xóa
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Đánh giá này sẽ bị xóa vĩnh viễn. Bạn có chắc không?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      toast.success('Xóa đánh giá thành công');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa đánh giá');
    }
  };

  // Kiểm tra xem user hiện tại có phải chủ review không
  const isReviewOwner = (review: Review) => {
    if (!authUser) return false;
    // So sánh bằng userId (ưu tiên) hoặc userName
    if (review.userId) {
      return review.userId === authUser.id;
    }
    // Fallback: so sánh tên (cho các review cũ chưa có userId)
    const currentName = authUser.fullName || authUser.username || '';
    return review.userName === currentName;
  };

  // Kiểm tra xem user đã có review cho cuốn sách này chưa
  const hasAlreadyReviewed = authUser
    ? reviews.some(r => r.userId === authUser.id ||
        (!r.userId && (r.userName === (authUser.fullName || authUser.username))))
    : false;

  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #7c3aed',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#6b7280', fontSize: '16px' }}>Đang tải thông tin sách...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!book) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <BookOpen size={48} style={{ color: '#9ca3af' }} />
      <p style={{ color: '#6b7280', fontSize: '18px' }}>Không tìm thấy sách</p>
      <button
        onClick={() => router.push('/')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '8px',
          background: '#7c3aed', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: '14px', fontWeight: '500'
        }}
      >
        <ArrowLeft size={16} /> Về trang chủ
      </button>
    </div>
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const handleAddToCart = async () => {
    if (!isSignedIn) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      router.push('/auth/login');
      return;
    }

    const userId = getEffectiveUserId();
    if (!userId || !book?.id) return;

    await addToCart({
      userId,
      bookId: book.id,
      quantity,
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 60px' }}>

      {/* BREADCRUMB */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '14px', color: '#9ca3af', marginBottom: '28px'
      }}>
        <span
          onClick={() => router.push('/')}
          style={{ cursor: 'pointer', color: '#7c3aed', fontWeight: '500' }}
          onMouseEnter={e => (e.target as HTMLElement).style.textDecoration = 'underline'}
          onMouseLeave={e => (e.target as HTMLElement).style.textDecoration = 'none'}
        >
          Trang chủ
        </span>
        <ChevronRight size={14} />
        <span
          onClick={() => router.push('/')}
          style={{ cursor: 'pointer', color: '#7c3aed', fontWeight: '500' }}
          onMouseEnter={e => (e.target as HTMLElement).style.textDecoration = 'underline'}
          onMouseLeave={e => (e.target as HTMLElement).style.textDecoration = 'none'}
        >
          {book.category?.name || 'Sách'}
        </span>
        <ChevronRight size={14} />
        <span style={{ color: '#6b7280' }}>{book.title}</span>
      </nav>

      {/* MAIN CONTENT - TWO COLUMNS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 400px) 1fr',
        gap: '48px',
        marginBottom: '48px',
        alignItems: 'start'
      }}>

        {/* LEFT - IMAGE */}
        <div style={{
          position: 'sticky',
          top: '24px'
        }}>
          {/* MAIN IMAGE DISPLAY */}
          <div style={{
            background: 'linear-gradient(145deg, #f8f7ff 0%, #ede9fe 50%, #ddd6fe 100%)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 8px 30px rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.08)',
            minHeight: '320px'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage || book.imageUrl || "https://via.placeholder.com/300x400"}
              alt={book.title}
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                borderRadius: '10px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={e => (e.target as HTMLElement).style.transform = 'scale(1.03)'}
              onMouseLeave={e => (e.target as HTMLElement).style.transform = 'scale(1)'}
            />
          </div>

          {/* THUMBNAIL STRIP */}
          {(() => {
            const allImages = [
              { imageUrl: book.imageUrl, id: 'cover' as string | number },
              ...(book.secondaryImages || [])
            ].filter(img => img.imageUrl);

            if (allImages.length <= 1) return null;

            return (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '14px',
                overflowX: 'auto',
                paddingBottom: '4px'
              }}>
                {allImages.map((img, index) => {
                  const isActive = (selectedImage || book.imageUrl) === img.imageUrl;
                  return (
                    <div
                      key={img.id || index}
                      onClick={() => setSelectedImage(img.imageUrl ?? null)}
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: isActive ? '3px solid #7c3aed' : '2px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        background: '#f9fafb',
                        boxShadow: isActive ? '0 2px 8px rgba(124, 58, 237, 0.2)' : 'none'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#a78bfa';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.imageUrl}
                        alt={index === 0 ? 'Ảnh bìa' : `Ảnh ${index}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* RIGHT - INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* BADGES ROW */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
              color: '#6d28d9',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              <BookOpen size={14} />
              {book.category?.name || "Không rõ thể loại"}
            </span>

            {book.author && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px',
                background: '#f3f4f6', color: '#4b5563',
                fontSize: '13px', fontWeight: '500'
              }}>
                <User size={14} />
                Tác giả: <strong style={{ color: '#111827' }}>{book.author}</strong>
              </span>
            )}

            {book.publisher && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px',
                background: '#f3f4f6', color: '#4b5563',
                fontSize: '13px', fontWeight: '500'
              }}>
                <BookOpen size={14} />
                NXB: <strong style={{ color: '#111827' }}>{book.publisher}</strong>
              </span>
            )}
          </div>

          {/* TITLE */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1e1b4b',
            margin: '0',
            lineHeight: '1.3',
            letterSpacing: '-0.5px'
          }}>
            {book.title}
          </h1>

          {/* RATING SUMMARY */}
          {reviews.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {[1,2,3,4,5].map(star => (
                  <Star
                    key={star}
                    size={18}
                    fill={star <= Math.round(Number(avgRating)) ? "#f59e0b" : "#e5e7eb"}
                    stroke="none"
                  />
                ))}
              </div>
              <span style={{ fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>{avgRating}</span>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>({reviews.length} đánh giá)</span>
            </div>
          )}

          {/* PRICE */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#b45309',
              letterSpacing: '-0.5px'
            }}>
              {book.price?.toLocaleString()} đ
            </span>
          </div>

          {/* DESCRIPTION */}
          {book.description && (
            <div style={{
              padding: '16px 20px',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mô tả
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#4b5563', margin: '0' }}>
                {book.description}
              </p>
            </div>
          )}

          {/* QUANTITY + ACTIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>

            {/* Quantity Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Số lượng:</span>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '2px solid #e5e7eb', borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: '40px', height: '40px',
                    border: 'none', background: '#f9fafb',
                    cursor: 'pointer', fontSize: '18px',
                    color: '#374151', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >−</button>
                <span style={{
                  width: '48px', textAlign: 'center',
                  fontSize: '16px', fontWeight: '600', color: '#1f2937'
                }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{
                    width: '40px', height: '40px',
                    border: 'none', background: '#f9fafb',
                    cursor: 'pointer', fontSize: '18px',
                    color: '#374151', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >+</button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { if (!book.isDeleted) void handleAddToCart(); }}
                disabled={addToCartLoading || book.isDeleted}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '14px 24px',
                  background: book.isDeleted ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: book.isDeleted ? '#6b7280' : '#fff',
                  border: 'none', borderRadius: '12px',
                  fontSize: '16px', fontWeight: '600',
                  cursor: (addToCartLoading || book.isDeleted) ? 'not-allowed' : 'pointer',
                  opacity: addToCartLoading ? 0.7 : 1,
                  boxShadow: book.isDeleted ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (addToCartLoading || book.isDeleted) return;
                  (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.45)';
                }}
                onMouseLeave={e => {
                  if (book.isDeleted) return;
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(124, 58, 237, 0.35)';
                }}
              >
                <ShoppingCart size={20} />
                {book.isDeleted ? 'Sản phẩm ngừng kinh doanh' : (addToCartLoading ? 'Đang thêm...' : 'Thêm vào giỏ hàng')}
              </button>

              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                style={{
                  width: '52px', height: '52px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid',
                  borderColor: isWishlisted ? '#ef4444' : '#e5e7eb',
                  borderRadius: '12px',
                  background: isWishlisted ? '#fef2f2' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                <Heart
                  size={22}
                  fill={isWishlisted ? '#ef4444' : 'none'}
                  stroke={isWishlisted ? '#ef4444' : '#9ca3af'}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #d1d5db, transparent)',
        margin: '0 0 40px'
      }} />

      {/* REVIEW SECTION */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <h2 style={{
          fontSize: '24px', fontWeight: '700', color: '#1e1b4b',
          margin: '0 0 24px',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <Star size={24} fill="#f59e0b" stroke="none" />
          Đánh giá & Nhận xét
          {reviews.length > 0 && (
            <span style={{
              fontSize: '14px', fontWeight: '500',
              color: '#7c3aed',
              background: '#ede9fe',
              padding: '4px 12px',
              borderRadius: '20px'
            }}>
              {reviews.length}
            </span>
          )}
        </h2>

        {/* REVIEW FORM */}
        {isSignedIn ? (
          hasPurchased && !hasAlreadyReviewed ? (
        <div style={{
          padding: '24px',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          marginBottom: '32px'
        }}>
          <p style={{
            fontSize: '15px', fontWeight: '600', color: '#374151',
            margin: '0 0 12px'
          }}>
            Đánh giá của bạn
          </p>

          {/* Star Rating */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px',
                  transition: 'transform 0.15s ease',
                  transform: (hoverRating >= star || (!hoverRating && rating >= star)) ? 'scale(1.15)' : 'scale(1)'
                }}
              >
                <Star
                  size={28}
                  fill={(hoverRating ? hoverRating >= star : rating >= star) ? "#f59e0b" : "#e5e7eb"}
                  stroke="none"
                />
              </button>
            ))}
            <span style={{
              fontSize: '14px', color: '#6b7280',
              marginLeft: '8px',
              alignSelf: 'center'
            }}>
              {hoverRating || rating}/5
            </span>
          </div>

          {/* Textarea */}
          <textarea
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này..."
            rows={4}
            style={{
              width: '100%',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '15px',
              lineHeight: '1.6',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              color: '#1f2937',
              background: '#fafafa'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#7c3aed';
              e.target.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.background = '#fafafa';
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px',
                background: '#f3f4f6', color: '#4b5563',
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500',
                transition: 'background 0.2s'
              }}>
                <Paperclip size={16} />
                Thêm ảnh/video
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <button
              onClick={handleSubmitReview}
              disabled={uploadingMedia || !newReview.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px',
                background: newReview.trim() && !uploadingMedia
                  ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                  : '#e5e7eb',
                color: newReview.trim() && !uploadingMedia ? '#fff' : '#9ca3af',
                border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: '600',
                cursor: newReview.trim() && !uploadingMedia ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: newReview.trim() && !uploadingMedia ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
              }}
            >
              {uploadingMedia ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Gửi đánh giá
                </>
              )}
            </button>
          </div>
          
          {/* Selected Files Preview */}
          {newMediaFiles.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              {newMediaFiles.map((file, index) => {
                const isVideo = file.type.startsWith('video/');
                const url = URL.createObjectURL(file);
                return (
                  <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    {isVideo ? (
                      <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <button
                      onClick={() => removeSelectedFile(index)}
                      style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: 'rgba(0,0,0,0.5)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: '20px', height: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          ) : hasPurchased && hasAlreadyReviewed ? (
            <div style={{
              padding: '20px 24px',
              background: '#f0fdf4',
              borderRadius: '16px',
              border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: '14px',
              marginBottom: '32px'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Star size={20} fill="#fff" stroke="none" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#15803d', margin: '0 0 2px' }}>
                  Bạn đã đánh giá sản phẩm này rồi
                </p>
                <p style={{ fontSize: '13px', margin: '0', color: '#166534' }}>
                  Mỗi tài khoản chỉ được đánh giá một lần. Bạn có thể chỉnh sửa đánh giá đã gửi bên dưới.
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px',
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <BookOpen size={32} style={{ color: '#9ca3af', marginBottom: '8px' }} />
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: '0 0 8px' }}>
                Bạn chưa mua cuốn sách này
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                Bạn cần đặt mua để có thể đánh giá sản phẩm.
              </p>
            </div>
          )
        ) : (
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '16px',
          border: '1px solid #ddd6fe',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <User size={32} style={{ color: '#7c3aed', marginBottom: '8px' }} />
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#4c1d95', margin: '0 0 8px' }}>
            Bạn cần đăng nhập để đánh giá
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}
          >
            Đăng nhập ngay
          </button>
        </div>
        )}

        {/* REVIEW LIST */}
        {reviews.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af',
            background: '#f9fafb',
            borderRadius: '16px',
            border: '2px dashed #e5e7eb'
          }}>
            <Star size={36} stroke="#d1d5db" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 4px', color: '#6b7280' }}>
              Chưa có đánh giá nào
            </p>
            <p style={{ fontSize: '14px', margin: '0' }}>
              Hãy là người đầu tiên đánh giá cuốn sách này!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((r) => {
              const isOwner = isReviewOwner(r);
              const isAdmin = authUser?.role === 'ADMIN';
              const canEdit = isOwner; // Chỉ chủ sở hữu mới sửa được
              const canDelete = isOwner || isAdmin; // Chủ sở hữu hoặc admin có thể xóa
              const isEditing = editingReviewId === r.id;

              return (
              <div key={r.id} style={{
                padding: '20px',
                background: isEditing ? '#faf5ff' : '#fff',
                borderRadius: '14px',
                border: isEditing ? '2px solid #a78bfa' : '1px solid #e5e7eb',
                transition: 'all 0.2s ease'
              }}
                onMouseEnter={e => { if (!isEditing) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.06)'; }}
                onMouseLeave={e => { if (!isEditing) e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    background: isOwner 
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' 
                      : 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={18} stroke="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontWeight: '600', color: '#1f2937',
                      fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      {r.userName || "Ẩn danh"}
                      {isOwner && (
                        <span style={{
                          fontSize: '11px', fontWeight: '500',
                          color: '#7c3aed', background: '#ede9fe',
                          padding: '2px 8px', borderRadius: '10px'
                        }}>
                          Bạn
                        </span>
                      )}
                    </span>
                    {/* Rating - editable khi đang sửa */}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => setEditRating(star)}
                            onMouseEnter={() => setEditHoverRating(star)}
                            onMouseLeave={() => setEditHoverRating(0)}
                            style={{
                              background: 'none', border: 'none',
                              cursor: 'pointer', padding: '1px',
                              transition: 'transform 0.15s ease',
                              transform: (editHoverRating >= star || (!editHoverRating && editRating >= star)) ? 'scale(1.2)' : 'scale(1)'
                            }}
                          >
                            <Star
                              size={16}
                              fill={(editHoverRating ? editHoverRating >= star : editRating >= star) ? "#f59e0b" : "#e5e7eb"}
                              stroke="none"
                            />
                          </button>
                        ))}
                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px', alignSelf: 'center' }}>
                          {editHoverRating || editRating}/5
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1,2,3,4,5].map(star => (
                            <Star
                              key={star}
                              size={14}
                              fill={star <= r.rating ? "#f59e0b" : "#e5e7eb"}
                              stroke="none"
                            />
                          ))}
                          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px', alignSelf: 'center', fontWeight: '500' }}>
                            {r.rating}/5
                          </span>
                        </div>
                        {(r.createdAt || (r as any).updatedAt) && (() => {
                          const formatDate = (s: string) => {
                            try {
                              // Backend (Docker) chạy UTC, thêm 'Z' để browser tự convert sang giờ local
                              const utcStr = s.endsWith('Z') ? s : s + 'Z';
                              const d = new Date(utcStr);
                              if (isNaN(d.getTime())) return s;
                              return d.toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              });
                            } catch { return s; }
                          };
                          const updatedAt = (r as any).updatedAt as string | undefined;
                          const isEdited = updatedAt && r.createdAt && updatedAt !== r.createdAt;
                          const displayDate = isEdited ? updatedAt! : (r.createdAt ?? '');
                          return (
                            <span style={{
                              fontSize: '12px', color: '#9ca3af',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              <span style={{ color: '#d1d5db' }}>•</span>
                              {isEdited && (
                                <span style={{
                                  fontSize: '11px', fontStyle: 'italic',
                                  color: '#a78bfa', background: '#f5f3ff',
                                  padding: '1px 6px', borderRadius: '8px'
                                }}>đã sửa</span>
                              )}
                              {formatDate(displayDate)}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  {!isEditing && (canEdit || canDelete) && (
                    <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                      {canEdit && (
                        <button
                          onClick={() => handleStartEdit(r)}
                          title="Sửa đánh giá"
                          style={{
                            background: 'none',
                            border: '1px solid #c7d2fe',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#eef2ff';
                            e.currentTarget.style.borderColor = '#818cf8';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.borderColor = '#c7d2fe';
                          }}
                        >
                          <Pencil size={13} />
                          Sửa
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          title="Xóa đánh giá"
                          style={{
                            background: 'none',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#f87171';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.borderColor = '#fecaca';
                          }}
                        >
                          <Trash2 size={13} />
                          Xóa
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Content - editable hoặc hiển thị */}
                {isEditing ? (
                  <div style={{ paddingLeft: '52px' }}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        border: '2px solid #a78bfa',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        color: '#1f2937',
                        background: '#fff',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                      onBlur={(e) => e.target.style.borderColor = '#a78bfa'}
                    />
                    
                    {/* Quản lý ảnh/video khi đang sửa */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {/* Ảnh/video đã tải lên từ trước */}
                        {editMediaUrls.map((url, idx) => (
                          <div key={`existing-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                            {url.match(/\.(mp4|webm|ogg)$/i) ? (
                              <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <img src={url} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <button
                              onClick={() => removeEditExistingMedia(idx)}
                              style={{
                                position: 'absolute', top: '2px', right: '2px',
                                background: 'rgba(239,68,68,0.9)', color: '#fff',
                                border: 'none', borderRadius: '50%',
                                width: '20px', height: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        
                        {/* Ảnh/video mới chọn */}
                        {editNewMediaFiles.map((file, idx) => {
                          const isVideo = file.type.startsWith('video/');
                          const url = URL.createObjectURL(file);
                          return (
                            <div key={`new-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #7c3aed' }}>
                              {isVideo ? (
                                <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                              <button
                                onClick={() => removeEditNewFile(idx)}
                                style={{
                                  position: 'absolute', top: '2px', right: '2px',
                                  background: 'rgba(239,68,68,0.9)', color: '#fff',
                                  border: 'none', borderRadius: '50%',
                                  width: '20px', height: '20px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '6px 10px',
                          background: '#f3f4f6', color: '#4b5563',
                          borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: '500',
                          transition: 'background 0.2s'
                        }}>
                          <Paperclip size={14} />
                          Thêm ảnh/video
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleEditFileSelect}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '8px 16px',
                          background: '#f3f4f6',
                          color: '#4b5563',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '13px', fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#e5e7eb';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#f3f4f6';
                        }}
                      >
                        <X size={14} />
                        Hủy
                      </button>
                      <button
                        onClick={() => handleSaveEdit(r.id)}
                        disabled={!editContent.trim() || uploadingMedia}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '8px 16px',
                          background: (editContent.trim() && !uploadingMedia)
                            ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' 
                            : '#e5e7eb',
                          color: (editContent.trim() && !uploadingMedia) ? '#fff' : '#9ca3af',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px', fontWeight: '600',
                          cursor: (editContent.trim() && !uploadingMedia) ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease',
                          boxShadow: (editContent.trim() && !uploadingMedia) ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none'
                        }}
                      >
                        {uploadingMedia ? (
                           <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Check size={14} />
                        )}
                        {uploadingMedia ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ paddingLeft: '52px' }}>
                    <p style={{
                      fontSize: '15px', lineHeight: '1.7',
                      color: '#4b5563', margin: '0'
                    }}>
                      {r.content}
                    </p>
                    
                    {/* Hiển thị ảnh/video */}
                    {r.mediaUrls && r.mediaUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {r.mediaUrls.map((url, idx) => {
                           const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                           return (
                            <div key={idx} style={{ 
                              width: '100px', height: '100px', 
                              borderRadius: '8px', overflow: 'hidden', 
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                              {isVideo ? (
                                <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <img src={url} alt={`Review media ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                              )}
                            </div>
                           );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RESPONSIVE STYLE OVERRIDE */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
