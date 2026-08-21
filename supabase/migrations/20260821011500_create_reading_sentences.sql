create table public.reading_sentences (
                                          id uuid primary key default gen_random_uuid(),
                                          sentence_set text not null,       -- 'g1_2' or 'g3_4'
                                          sentence_number integer not null, -- 1-based position within that set
                                          text text not null,
                                          created_at timestamptz not null default now(),
                                          unique (sentence_set, sentence_number)
);

comment on table public.reading_sentences is 'The printed reading-script sentences for the child-recording pilot. Matches basaquest_reading_scripts.docx 1:1 by (sentence_set, sentence_number).';

alter table public.reading_sentences enable row level security;

-- Every logged-in account can read the script (the recording page needs
-- it; there's no reason to restrict this to admins only).
create policy "Authenticated users can view reading sentences"
  on public.reading_sentences for select
                                             to authenticated
                                             using (true);

-- Only admins can add/edit/remove sentences from the script.
create policy "Admins can manage reading sentences"
  on public.reading_sentences for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

grant select on table public.reading_sentences to authenticated;
grant all on table public.reading_sentences to service_role;