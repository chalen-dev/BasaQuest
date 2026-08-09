create table public.profiles(
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    full_name text,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
                                    using (true);

create policy "Users can update their own profile"
  on public.profiles for update
                                    using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create function public.handle_new_user()
    returns trigger as $$
begin
insert into public.profiles (id, username)
values (new.id, new.raw_user_meta_data->>'username');
return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();