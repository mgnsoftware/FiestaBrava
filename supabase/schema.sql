-- Fiesta Brava: apply once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at = pg_catalog.now(); return new; end; $$;
-- Keep SECURITY DEFINER helpers outside PostgREST's exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text,
  role text not null default 'editor' check (role in ('admin','editor')),
  active boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function private.current_user_role() returns text language sql stable security definer set search_path='' as $$ select role from public.profiles where id=auth.uid() and active=true $$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(private.current_user_role()='admin',false) $$;
create or replace function private.can_edit_content() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(private.current_user_role() in ('admin','editor'),false) $$;
revoke all on function private.current_user_role(), private.is_admin(), private.can_edit_content() from public, anon;
grant execute on function private.current_user_role(), private.is_admin(), private.can_edit_content() to authenticated;

create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text,
 image_url text, active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text,
 image_url text, price numeric(10,2) not null default 0 check(price>=0), category_id uuid references public.categories(id), featured boolean not null default false,
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.options (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id), name text not null, option_group text not null default 'Opciones', price_delta numeric(10,2) not null default 0,
 description text, active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.combos (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text,
 image_url text, price numeric(10,2) not null default 0 check(price>=0), active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.combo_items (
 id uuid primary key default gen_random_uuid(), combo_id uuid not null references public.combos(id), product_id uuid not null references public.products(id), quantity int not null default 1 check(quantity>0),
 name text, description text, active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.promotions (
 id uuid primary key default gen_random_uuid(), title text not null, description text, image_url text, starts_at timestamptz, ends_at timestamptz,
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.business_hours (
 id uuid primary key default gen_random_uuid(), name text, day_of_week int not null check(day_of_week between 0 and 6), open_time time, close_time time, is_closed boolean not null default false,
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.gallery (
 id uuid primary key default gen_random_uuid(), name text not null, caption text, image_url text not null,
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.business_settings (
 id text primary key default 'main' check(id='main'), business_name text not null default 'Fiesta Brava', tagline text not null default '', description text not null default '',
 address text not null default '', phone text not null default '', whatsapp text not null default '', currency text not null default 'MXN',
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.social_links (
 id uuid primary key default gen_random_uuid(), name text not null, platform text not null, url text not null,
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);
create table if not exists public.payment_methods (
 id uuid primary key default gen_random_uuid(), name text not null, details text,
 active boolean not null default true, visible_publicly boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), deleted_at timestamptz
);

do $$ declare t text; begin
 foreach t in array array['categories','products','options','combos','combo_items','promotions','business_hours','gallery','business_settings','social_links','payment_methods','profiles'] loop
   execute format('drop trigger if exists set_updated_at on public.%I',t);
   execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
 end loop;
end $$;

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,email,full_name,role,active) values(new.id,new.email,new.raw_user_meta_data->>'full_name','editor',false) on conflict(id) do nothing; return new; end; $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
drop function if exists public.handle_new_user();

do $$ declare t text; begin
 foreach t in array array['categories','products','options','combos','combo_items','promotions','business_hours','gallery','business_settings','social_links','payment_methods'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('drop policy if exists public_read on public.%I',t);
   if t='business_settings' then
     execute format('create policy public_read on public.%I for select to anon, authenticated using (active and visible_publicly and deleted_at is null)',t);
     execute format('drop policy if exists admin_write on public.%I',t);
     execute format('create policy admin_write on public.%I for all to authenticated using (private.is_admin()) with check (private.is_admin())',t);
   else
     execute format('create policy public_read on public.%I for select to anon, authenticated using (active and visible_publicly and deleted_at is null)',t);
     execute format('drop policy if exists editor_write on public.%I',t);
     execute format('create policy editor_write on public.%I for all to authenticated using (private.can_edit_content()) with check (private.can_edit_content())',t);
   end if;
 end loop;
end $$;
drop policy if exists profile_self_read on public.profiles;
create policy profile_self_read on public.profiles for select to authenticated using(id=auth.uid() or private.is_admin());
drop policy if exists admin_profiles_write on public.profiles;
create policy admin_profiles_write on public.profiles for all to authenticated using(private.is_admin()) with check(private.is_admin());
-- Remove legacy public-schema helpers from earlier iterations of this schema.
drop function if exists public.current_user_role();
drop function if exists public.is_admin();
drop function if exists public.can_edit_content();
grant select on public.categories,public.products,public.options,public.combos,public.combo_items,public.promotions,public.business_hours,public.gallery,public.business_settings,public.social_links,public.payment_methods to anon,authenticated;
grant insert,update,delete on public.categories,public.products,public.options,public.combos,public.combo_items,public.promotions,public.business_hours,public.gallery,public.business_settings,public.social_links,public.payment_methods,public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- Public image reads; editor/admin uploads and removes images. Never put a service key in a client.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fiesta-media','fiesta-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
drop policy if exists fiesta_media_read on storage.objects;
create policy fiesta_media_read on storage.objects for select to anon,authenticated using(bucket_id='fiesta-media');
drop policy if exists fiesta_media_upload on storage.objects;
create policy fiesta_media_upload on storage.objects for insert to authenticated with check(bucket_id='fiesta-media' and private.can_edit_content());
drop policy if exists fiesta_media_update on storage.objects;
create policy fiesta_media_update on storage.objects for update to authenticated using(bucket_id='fiesta-media' and private.can_edit_content()) with check(bucket_id='fiesta-media' and private.can_edit_content());
drop policy if exists fiesta_media_delete on storage.objects;
create policy fiesta_media_delete on storage.objects for delete to authenticated using(bucket_id='fiesta-media' and private.can_edit_content());

-- Bootstrap: after registering the first admin in Supabase Auth, run this once with their email:
-- update public.profiles set role='admin', active=true where email='you@example.com';
