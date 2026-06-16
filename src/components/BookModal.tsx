import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Book, Reservation, Interaction } from '../types';
import { X, Heart, MessageSquare, History, CheckCircle, Clock, Trash2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface BookModalProps {
  book: Book;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BookModal({ book: initialBook, onClose, onUpdate }: BookModalProps) {
  const { profile } = useAuth();
  
  const [book, setBook] = useState<Book>(initialBook);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lessons, setLessons] = useState<Interaction[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(book.likes_count || 0);

  // Action states
  const [returnDate, setReturnDate] = useState('');
  const [newLesson, setNewLesson] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const fetchBookDetails = async () => {
    try {
      // 1. Fetch updated book status
      const { data: bData } = await supabase.from('books').select('*').eq('id', book.id).single();
      if (bData) setBook(bData);

      // 2. Fetch reservations (History)
      const { data: resData } = await supabase
        .from('reservations')
        .select(`
          *,
          profiles ( full_name, email )
        `)
        .eq('book_id', book.id)
        .order('created_at', { ascending: false });
      
      if (resData) setReservations(resData as Reservation[]);

      // 3. Fetch lessons
      const { data: lessonsData } = await supabase
        .from('interactions')
        .select(`
          *,
          profiles ( full_name )
        `)
        .eq('book_id', book.id)
        .eq('type', 'lesson')
        .order('created_at', { ascending: false });

      if (lessonsData) setLessons(lessonsData as Interaction[]);

      // 4. Fetch my like status
      if (profile) {
        const { data: likeData } = await supabase
          .from('interactions')
          .select('id')
          .eq('book_id', book.id)
          .eq('user_id', profile.id)
          .eq('type', 'like')
          .single();
        
        setIsLiked(!!likeData);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, []);

  const currentReservation = reservations.find(r => r.status === 'active');

  const handleReserve = async () => {
    if (!profile) return;
    if (!returnDate) {
      toast.error('يرجى تحديد تاريخ الإرجاع المتوقع');
      return;
    }
    
    setActionLoading(true);
    try {
      // Update book status
      const { error: bkErr } = await supabase
        .from('books')
        .update({ is_available: false })
        .eq('id', book.id);
      if (bkErr) throw bkErr;

      // Create reservation
      const { error: resErr } = await supabase
        .from('reservations')
        .insert([{
          book_id: book.id,
          user_id: profile.id,
          expected_return_date: new Date(returnDate).toISOString()
        }]);
      if (resErr) throw resErr;

      toast.success('تم حجز الكتاب بنجاح');
      await fetchBookDetails();
      onUpdate();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحجز');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!profile || !currentReservation) return;

    setActionLoading(true);
    try {
      // Mark as returned
      const { error: resErr } = await supabase
        .from('reservations')
        .update({ 
          status: 'returned',
          actual_return_date: new Date().toISOString()
        })
        .eq('id', currentReservation.id);
      if (resErr) throw resErr;

      // Update book availability
      const { error: bkErr } = await supabase
        .from('books')
        .update({ is_available: true })
        .eq('id', book.id);
      if (bkErr) throw bkErr;

      toast.success('تم استرجاع الكتاب بنجاح');
      await fetchBookDetails();
      onUpdate();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الاسترجاع');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!profile) return;
    try {
      if (isLiked) {
        await supabase
          .from('interactions')
          .delete()
          .eq('book_id', book.id)
          .eq('user_id', profile.id)
          .eq('type', 'like');
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase
          .from('interactions')
          .insert([{ book_id: book.id, user_id: profile.id, type: 'like' }]);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
      onUpdate();
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const addLesson = async () => {
    if (!profile || !newLesson.trim()) return;
    setActionLoading(true);
    try {
      await supabase
        .from('interactions')
        .insert([{ book_id: book.id, user_id: profile.id, type: 'lesson', content: newLesson.trim() }]);
      
      setNewLesson('');
      toast.success('تمت إضافة الفائدة بنجاح');
      await fetchBookDetails();
    } catch (err) {
      toast.error('حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكتاب نهائياً؟')) return;
    
    try {
      await supabase.from('books').delete().eq('id', book.id);
      toast.success('تم الحذف');
      onUpdate();
      onClose();
    } catch (err) {
      toast.error('خطأ في الحذف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      {/* Full Screen Image Preview Modal */}
      {showImagePreview && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setShowImagePreview(false)}
        >
          <button 
            className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowImagePreview(false);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={book.cover_url} 
            alt="غلاف الكتاب (مكبر)"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Cover Section (Left on Desktop, Top on Mobile) */}
        <div 
          className="md:w-5/12 bg-slate-100 relative group flex-shrink-0 flex items-center justify-center cursor-zoom-in overflow-hidden"
          onClick={() => setShowImagePreview(true)}
        >
          <img 
            src={book.cover_url} 
            alt="غلاف الكتاب"
            className="w-full h-full object-cover max-h-[40vh] md:max-h-none group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          
          {profile?.role === 'admin' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteBook(); }}
              className="absolute top-4 left-4 p-2 bg-white/90 text-red-600 rounded-full hover:bg-red-50 hover:scale-110 transition-all shadow-sm"
              title="حذف الكتاب"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            className="absolute bottom-4 right-4 p-3 bg-white/90 rounded-full hover:scale-110 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
            <span className="font-bold text-slate-700">{likesCount}</span>
          </button>
        </div>

        {/* Details & Actions Section */}
        <div className="md:w-7/12 flex flex-col relative overflow-hidden bg-slate-50">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 sticky top-0">
            <div className="flex items-center gap-3">
              {book.is_available ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-4 h-4" />
                  متوفر للحجز
                </span>
              ) : (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  <Clock className="w-4 h-4" />
                  محجوز حالياً
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {!loading && (
              <div className="space-y-8">
                
                {/* Action Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  {book.is_available ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-bold text-slate-700">تاريخ الإرجاع المتوقع</label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]}
                            value={returnDate}
                            onChange={e => setReturnDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                          <CalendarDays className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                        <button
                          onClick={handleReserve}
                          disabled={actionLoading}
                          className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-50"
                        >
                          تأكيد الحجز
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          الكتاب محجوز حالياً بواسطة <strong className="text-slate-900">{currentReservation?.profiles?.full_name}</strong>.
                          <br/>
                          تاريخ الإرجاع المتوقع: <strong className="text-slate-900">{currentReservation?.expected_return_date ? format(new Date(currentReservation.expected_return_date), 'yyyy-MM-dd') : 'غير محدد'}</strong>.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 mt-4">
                        {(profile?.id === currentReservation?.user_id || profile?.role === 'admin') && (
                          <button
                            onClick={handleReturn}
                            disabled={actionLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-50"
                          >
                            إرجاع الكتاب
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lessons Learned */}
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4">
                    <MessageSquare className="w-5 h-5 text-brand-600" />
                    الدروس المستفادة
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Add new lesson */}
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold shrink-0">
                        {profile?.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <textarea
                          placeholder="أضف فائدة استلهمتها من الكتاب..."
                          value={newLesson}
                          onChange={(e) => setNewLesson(e.target.value)}
                          className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                          rows={2}
                        />
                        <div className="mt-2 text-left">
                          <button
                            onClick={addLesson}
                            disabled={!newLesson.trim() || actionLoading}
                            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                          >
                            نشر الفائدة
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lessons list */}
                    <div className="space-y-3 mt-6">
                      {lessons.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">
                          لا توجد دروس أو فوائد مضافة بعد. كن أول من يضيف الاستفادة!
                        </p>
                      ) : (
                        lessons.map((lesson) => (
                          <div key={lesson.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 text-sm">
                              {lesson.profiles?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between mb-1">
                                <span className="font-bold text-slate-800 text-sm">{lesson.profiles?.full_name}</span>
                                <span className="text-xs text-slate-400">{format(new Date(lesson.created_at), 'yyyy-MM-dd')}</span>
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{lesson.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* History Log */}
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-lg text-slate-800 mb-4">
                    <History className="w-5 h-5 text-brand-600" />
                    سجل الحجوزات
                  </h3>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {reservations.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 border-t border-dashed border-slate-200">لم يتم حجز الكتاب مسبقاً</div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {reservations.map((res) => (
                          <li key={res.id} className="p-4 text-sm bg-slate-50/50 flex flex-col gap-1">
                            <div className="font-medium text-slate-800">
                              أخذ <span className="text-brand-600">{res.profiles?.full_name}</span> الكتاب
                            </div>
                            <div className="text-slate-500 text-xs flex gap-4">
                              <span>من: {format(new Date(res.start_date), 'yyyy-MM-dd')}</span>
                              {res.status === 'returned' && res.actual_return_date ? (
                                <span>إلى: {format(new Date(res.actual_return_date), 'yyyy-MM-dd')}</span>
                              ) : (
                                <span className="text-amber-600">لا يزال بحوزته</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
