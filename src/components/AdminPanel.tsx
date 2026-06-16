import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminPanelProps {
  onClose: () => void;
  onBookAdded: () => void;
}

export default function AdminPanel({ onClose, onBookAdded }: AdminPanelProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('يرجى اختيار صورة أولاً');
      return;
    }

    setLoading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('books')
        .getPublicUrl(filePath);

      // Insert record
      const { error: dbError } = await supabase
        .from('books')
        .insert([{ cover_url: publicUrlData.publicUrl }]);

      if (dbError) throw dbError;

      toast.success('تم إضافة الكتاب بنجاح');
      onBookAdded();
      onClose();
    } catch (error: any) {
      toast.error('حدث خطأ أثناء رفع الصورة');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">إضافة كتاب جديد</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <p className="text-slate-600 text-sm">
              قم برفع صورة الغلاف الخاصة بالكتاب. سيتمكن القراء من النقر على الصورة لمعاينة الكتاب وحجزه.
            </p>
          </div>

          <div className="mb-6">
            {previewUrl ? (
              <div className="relative w-48 mx-auto aspect-[2/3] rounded-lg overflow-hidden border-2 border-slate-200 shadow-sm">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="mb-2 text-sm text-slate-600 font-medium">اضغط لاختيار صورة الغلاف</p>
                  <p className="text-xs text-slate-500">PNG, JPG, JPEG</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="px-6 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'جاري الرفع...' : 'رفع الكتاب'}
          </button>
        </div>
      </div>
    </div>
  );
}
