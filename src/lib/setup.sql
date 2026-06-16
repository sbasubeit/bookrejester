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

-- تفعيل مستوى الأمان للصفوف (RLS)
create table if not exists public.notifications_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  email text not null,
  subject text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reservations enable row level security;
alter table public.interactions enable row level security;
alter table public.notifications_queue enable row level security;

-- سياسات جدول profiles
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

-- سياسات جدول books
drop policy if exists "Books are viewable by everyone." on public.books;
create policy "Books are viewable by everyone." on public.books for select using ( true );

drop policy if exists "Admins can insert books." on public.books;
create policy "Admins can insert books." on public.books for insert with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

drop policy if exists "Admins can update books." on public.books;
create policy "Admins can update books." on public.books for update using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

drop policy if exists "Admins can delete books." on public.books;
create policy "Admins can delete books." on public.books for delete using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- سياسات جدول reservations
drop policy if exists "Reservations are viewable by everyone." on public.reservations;
create policy "Reservations are viewable by everyone." on public.reservations for select using ( true );

drop policy if exists "Users can create reservations." on public.reservations;
create policy "Users can create reservations." on public.reservations for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own reservations or admins can." on public.reservations;
create policy "Users can update their own reservations or admins can." on public.reservations for update using ( auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- سياسات جدول interactions
drop policy if exists "Interactions viewable by everyone" on public.interactions;
create policy "Interactions viewable by everyone" on public.interactions for select using ( true );

drop policy if exists "Users can manage their interactions" on public.interactions;
create policy "Users can manage their interactions" on public.interactions for all using ( auth.uid() = user_id );

-- سياسات الإشعارات
drop policy if exists "Admins can insert notifications" on public.notifications_queue;
create policy "Admins can insert notifications" on public.notifications_queue for insert with check ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
