'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/auth/context';
import { cartApiService } from '@/src/api/cartApiService';
import toast from 'react-hot-toast';
import type { BookCard } from '../hooks/useStreamChat';

interface Props {
  book: BookCard;
}

export function BookSuggestionCard({ book }: Props) {
  const { activeToken, activeUser } = useAuth();
  const [addState, setAddState] = useState<'idle' | 'loading' | 'added'>('idle');

  const handleAddToCart = async () => {
    if (!activeUser || !activeToken) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }

    setAddState('loading');
    try {
      await cartApiService.add(
        { userId: activeUser.id, bookId: book.id, quantity: 1 },
        activeToken
      );
      setAddState('added');
      toast.success(`Đã thêm "${book.title}" vào giỏ hàng!`);
      setTimeout(() => setAddState('idle'), 2000);
    } catch (err: any) {
      setAddState('idle');
      toast.error(err?.response?.data?.message || 'Không thể thêm vào giỏ hàng');
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50
                    hover:border-slate-600/50 transition-all group">
      <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700">
        <img
          src={book.imageUrl}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = '/placeholder-book.jpg'; }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-100 truncate leading-tight">
            {book.title}
          </h4>
          <p className="text-xs text-slate-400 truncate mt-0.5">{book.author}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px]
                          bg-slate-700/80 text-slate-300">
            {book.categoryName}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-blue-400">
            {formatPrice(book.price)}
          </span>

          <button
            onClick={handleAddToCart}
            disabled={addState !== 'idle'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                       transition-all duration-200
                       ${addState === 'added'
                         ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                         : addState === 'loading'
                         ? 'bg-slate-700 text-slate-400'
                         : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {addState === 'loading' && <Loader2 size={12} className="animate-spin" />}
            {addState === 'added' && <Check size={12} />}
            {addState === 'idle' && <ShoppingCart size={12} />}
            {addState === 'added' ? 'Đã thêm' : addState === 'loading' ? '...' : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  );
}
