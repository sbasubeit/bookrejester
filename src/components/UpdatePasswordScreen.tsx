import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { clearPasswordRecovery } = useAuth();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      toast.success('تم تحديث كلمة المرور بنجاح');
      
      // Clear hash from URL and update context state
      window.location.hash = '';
      setTimeout(() => {
        clearPasswordRecovery();
      }, 2000);
      
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحديث كلمة المرور');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">تم التحديث بنجاح!</h2>
          <p className="text-slate-600 mb-8">تم تغيير كلمة المرور الخاصة بك. سيتم توجيهك إلى النظام الآن.</p>
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-brand-500 rounded-full blur-3xl opacity-10"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-slate-400 rounded-full blur-3xl opacity-10"></div>
                  
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-slate-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-6 group-hover:scale-105 transition-transform">
            <KeyRound className="w-10 h-10 text-brand-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">تعيين كلمة مرور جديدة</h2>
          <p className="text-slate-500 font-medium">الرجاء إدخال كلمة المرور الجديدة لحسابك.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-left"
              placeholder="••••••••"
              dir="ltr"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-2">كلمة المرور يجب أن تكون 6 أحرف على الأقل.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center h-[56px] disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
