-- قم بنسخ هذا الكود ولصقه في محرر SQL في لوحة تحكم Supabase الخاصة بك ثم قم بتشغيله.

-- تفعيل امتداد UUID
create extension if not exists "uuid-ossp";

-- إنشاء جدول الملفات الشخصية
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text check (role in ('admin', 'reader')) default 'reader',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- إنشاء جدول الكتب (الصورة والحالة فقط بدون أسماء وتفاصيل)
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  cover_url text not null,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- إنشاء جدول الحجوزات
create table if not exists public.reservations (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  expected_return_date timestamp with time zone not null,
  actual_return_date timestamp with time zone,
  status text check (status in ('active', 'returned')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- إنشاء جدول التفاعلات (الإعجابات والدروس المستفادة)
create table if not exists public.interactions (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  type text check (type in ('like', 'lesson')) not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- إعداد Storage لتخزين صور أغلفة الكتب
insert into storage.buckets (id, name, public) values ('books', 'books', true)
on conflict (id) do nothing;

-- السماح بالوصول الكامل لمساحة التخزين (لتبسيط النموذج)
drop policy if exists "Give public access to books" on storage.objects;
create policy "Give public access to books" on storage.objects for all using (bucket_id = 'books');

-- دالة لإضافة المستخدم تلقائياً لجدول profiles عند التسجيل
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'reader');
  return new;
end;
$$ language plpgsql security definer;

-- مشغل لربط التسجيل بالدالة
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- بعد التسجيل لأول مرة كمشرف، يمكنك تشغيل هذا السطر لمنح نفسك صلاحية الأدمن:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';

-- --- هام: إصلاح مشكلات الصلاحيات (RLS) ---
-- إذا واجهتك أي أخطاء بالوصول للبيانات (مثل الخطأ في جلب الكتب أو عدم ظهور الاسم)، قم بتشغيل الأوامر التالية لتعطيل صلاحيات الصفوف مؤقتاً للتبسيط:
alter table public.profiles disable row level security;
alter table public.books disable row level security;
alter table public.reservations disable row level security;
alter table public.interactions disable row level security;
