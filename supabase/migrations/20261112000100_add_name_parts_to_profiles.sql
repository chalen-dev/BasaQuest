-- Structured names: first name, middle initial, last name, suffix (Jr., III).
-- All nullable, so existing accounts and sign-ups that give no name keep working.
--
-- full_name stays and is still what every screen shows. A trigger keeps it in step
-- with the parts ("Maria C. Santos Jr."), so code that only knows full_name keeps
-- working. The parts exist so lists can sort by last name.
alter table public.profiles
  add column first_name text,
  add column middle_initial text,
  add column last_name text,
  add column suffix text;

comment on column public.profiles.middle_initial is 'One capital letter, no dot. A full middle name is deliberately not stored (Philippine forms use the mother''s maiden name there).';
comment on column public.profiles.full_name is 'Display name. Rebuilt from first_name / middle_initial / last_name / suffix whenever those change; otherwise free text.';

create or replace function public.sync_profile_full_name()
    returns trigger as $$
begin
    new.first_name := nullif(btrim(new.first_name), '');
    new.last_name := nullif(btrim(new.last_name), '');
    new.suffix := nullif(btrim(new.suffix), '');
    new.middle_initial := nullif(upper(left(btrim(coalesce(new.middle_initial, ''), ' .'), 1)), '');

    -- Only rebuild when the parts were just set or changed, so a plain
    -- full_name update on an old row is left alone.
    if (new.first_name is not null or new.last_name is not null)
       and (tg_op = 'INSERT'
            or (new.first_name, new.middle_initial, new.last_name, new.suffix)
               is distinct from (old.first_name, old.middle_initial, old.last_name, old.suffix)) then
        new.full_name := btrim(concat_ws(' ',
            new.first_name,
            case when new.middle_initial is not null then new.middle_initial || '.' end,
            new.last_name,
            new.suffix));
    end if;
    return new;
end;
$$ language plpgsql;

create trigger profiles_sync_full_name
    before insert or update on public.profiles
    for each row execute function public.sync_profile_full_name();

-- Best-effort fill for existing accounts: "Maria Santos" -> first Maria, last Santos
-- (split at the last space). Names with brackets, digits or commas, and single
-- words, are left alone for the person to fix on their profile.
update public.profiles
   set first_name = regexp_replace(btrim(full_name), ' +[^ ]+$', ''),
       last_name = substring(btrim(full_name) from '[^ ]+$')
 where first_name is null
   and last_name is null
   and full_name ~ '^[^()0-9,]+ +[^()0-9, ]+$';

-- Sign-up can hand the names over in the user metadata.
create or replace function public.handle_new_user()
    returns trigger as $$
begin
insert into public.profiles (id, username, first_name, middle_initial, last_name, suffix)
values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'middle_initial',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'suffix'
);
return new;
end;
$$ language plpgsql security definer;

create index if not exists profiles_last_name_idx on public.profiles (teacher_id, last_name, first_name);
