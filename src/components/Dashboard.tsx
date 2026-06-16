import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Book as BookType } from '../types';
import { LogOut, BookOpen, PlusCircle, UserCog } from 'lucide-react';
import AdminPanel from './AdminPanel';
import BookModal from './BookModal';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { profile, user, signOut } = useAuth();
  const [books, setBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'liked' | 'reserved'>('all');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      // Fetch books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;

      // Fetch interactions (Likes) for aggregations
      const { data: likesData } = await supabase
        .from('interactions')
        .select('book_id')
        .eq('type', 'like');

      // Fetch reservations for aggregations
      const { data: resData } = await supabase
        .from('reservations')
        .select('book_id');

      const likesCountMap = (likesData || []).reduce((acc: any, curr) => {
        acc[curr.book_id] = (acc[curr.book_id] || 0) + 1;
        return acc;
      }, {});

      const borrowCountMap = (resData || []).reduce((acc: any, curr) => {
        acc[curr.book_id] = (acc[curr.book_id] || 0) + 1;
        return acc;
      }, {});

      const enrichedBooks = (booksData || []).map(b => ({
        ...b,
        likes_count: likesCountMap[b.id] || 0,
        borrow_count: borrowCountMap[b.id] || 0,
      }));

      setBooks(enrichedBooks);
    } catch (error: any) {
      toast.error('حدث خطأ أثناء جلب الكتب');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const displayedBooks = [...books].sort((a, b) => {
    if (activeTab === 'liked') return (b.likes_count || 0) - (a.likes_count || 0);
    if (activeTab === 'reserved') return (b.borrow_count || 0) - (a.borrow_count || 0);
    return 0; // 'all' uses natural creation order from API
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800 hidden sm:block">نظام حجز الكتب</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 font-medium hidden sm:block">
                مرحباً ({profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'الضيف'})
              </span>
              
              {profile?.role === 'admin' && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <UserCog className="w-4 h-4" />
                  <span className="hidden sm:block">الإدارة</span>
                </button>
              )}
              
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex space-x-2 space-x-reverse mb-8 overflow-x-auto pb-2 border-b border-slate-200">
          {[
            { id: 'all', label: 'جميع الكتب' },
            { id: 'liked', label: 'الأعلى إعجاباً' },
            { id: 'reserved', label: 'الأكثر اقتناءً' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-brand-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 stroke-slate-200">
            <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">لا توجد كتب حالياً</h3>
            <p className="text-slate-500 mt-1">
              {profile?.role === 'admin' ? 'انتقل إلى لوحة الإدارة لإضافة كتب جديدة.' : 'لم يقم المشرف بإضافة كتب بعد.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {displayedBooks.map((book) => (
              <div 
                key={book.id} 
                className="group relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-brand-500"
                onClick={() => setSelectedBook(book)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedBook(book);
                  }
                }}
              >
                <div className="aspect-[2/3] w-full bg-slate-100 relative">
                  <img
                    src={book.cover_url}
                    alt="غلاف الكتاب"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {!book.is_available && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-white/90 text-slate-900 text-sm font-bold px-3 py-1.5 rounded-full shadow-sm">
                        محجوز
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Stats Overlay (Bottom Edge) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white flex justify-between text-xs font-medium">
                  <span>💖 {book.likes_count || 0}</span>
                  <span>📖 {book.borrow_count || 0} اقتناء</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)} 
          onBookAdded={fetchBooks}
        />
      )}
      
      {selectedBook && (
        <BookModal 
          book={selectedBook} 
          onClose={() => setSelectedBook(null)}
          onUpdate={fetchBooks}
        />
      )}
    </div>
  );
}
