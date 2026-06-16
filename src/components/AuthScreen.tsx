import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success('تم إرسال رابط استعادة كلمة المرور لبريدك الإلكتروني');
        setIsResetMode(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('تم تسجيل الدخول بنجاح');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        toast.success('تم إنشاء حساب! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل.', { duration: 6000 });
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand-600">
          <BookOpen className="w-16 h-16" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          نظام حجز الكتب
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isResetMode 
            ? 'أدخل بريدك الإلكتروني لاستعادة كلمة المرور' 
            : isLogin 
              ? 'تسجيل الدخول للوصول لمكتبتك' 
              : 'إنشاء حساب جديد للاستفادة من النظام'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && !isResetMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الاسم الكامل
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="appearance-none block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    placeholder="محمد عبدالله"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  className="appearance-none block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-left focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="name@example.com"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  كلمة المرور
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="appearance-none block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-left focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    placeholder="••••••••"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isLogin && !isResetMode && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="font-medium text-brand-600 hover:text-brand-500"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : isResetMode ? 'إرسال رابط الاستعادة' : isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isResetMode ? 'أتذكر كلمة المرور؟' : isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  if (isResetMode) {
                    setIsResetMode(false);
                    setIsLogin(true);
                  } else {
                    setIsLogin(!isLogin);
                  }
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                {isResetMode ? 'العودة لتسجيل الدخول' : isLogin ? 'التسجيل كمستخدم جديد' : 'تسجيل الدخول'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
