import React from 'react';
import { Database, AlertTriangle, Code } from 'lucide-react';

export default function SetupScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-brand-600 p-8 text-white text-center">
          <Database className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold mb-2">إعداد قاعدة البيانات مطلوب</h1>
          <p className="text-brand-100 font-medium text-lg">لم يتم العثور على الجداول المطلوبة في Supabase.</p>
        </div>

        <div className="p-8">
          <div className="flex items-start gap-4 mb-6 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg mb-1">تعليمات التشغيل لأول مرة:</h3>
              <p className="text-amber-700 leading-relaxed">
                يرجى نسخ الكود التالي بالكامل ولصقه في قسم <strong>SQL Editor</strong> داخل لوحة تحكم <strong>Supabase</strong> الخاصة بك ، ثم الضغط على زر التشغيل "RUN". بعد ذلك، قم بتحديث هذه الصفحة.
              </p>
            </div>
          </div>

          <div className="relative group">
            <pre className="bg-slate-900 text-slate-100 p-6 rounded-xl font-mono text-sm sm:text-base overflow-x-auto w-full text-left" dir="ltr">
              {`-- Run this in your Supabase SQL Editor

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text check (role in ('admin', 'reader')) default 'reader',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  cover_url text not null,
  is_available boolean default true,
  title text,
  category text,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- تحديث الجدول لو كان موجوداً لتفادي الأخطاء
alter table public.books add column if not exists title text;
alter table public.books add column if not exists category text;
alter table public.books add column if not exists link text;

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

create table if not exists public.interactions (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  type text check (type in ('like', 'lesson')) not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into storage.buckets (id, name, public) values ('books', 'books', true)
on conflict (id) do nothing;

drop policy if exists "Give public access to books" on storage.objects;
create policy "Give public access to books" on storage.objects for all using (bucket_id = 'books');

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'reader');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- بعد التسجيل لأول مرة كمشرف، يمكنك تشغيل هذا السطر لمنح نفسك صلاحية الأدمن:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
`}
            </pre>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full mt-8 bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
          >
            <Code className="w-5 h-5" />
            لقد قمت بتنفيذ الكود، قم بتحديث الصفحة
          </button>
        </div>
      </div>
    </div>
  );
}
