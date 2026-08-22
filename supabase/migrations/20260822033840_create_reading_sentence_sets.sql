
-- Reading scripts ("sentence sets") used to be two hardcoded values
-- (g1_2, g3_4) baked into the frontend as a TS union + a label constant,
-- with reading_sentences.sentence_set just holding whichever of those two
-- strings a row belonged to. The new admin Sentence Scripts page lets
-- admins create/rename/delete whole scripts and add/edit/delete/reorder
-- the sentences inside them, which means "which sets exist" and "what's
-- each one called" both need to live in the database now, not in source.
--
-- reading_sentence_sets.key is the same stable string that already lives
-- in reading_sentences.sentence_set and student_recordings.sentence_set
-- (e.g. 'g1_2') — it's the identity, and stays fixed once a set is
-- created (renaming only ever touches `label`). student_recordings does
-- NOT get a foreign key to this table: a recording snapshots its own
-- sentence_text at record time, so it stays meaningful even after its
-- script is later renamed or deleted — only reading_sentences (the
-- live, editable script) is tied to it with an actual FK.
create table public.reading_sentence_sets (
                                              key text primary key,        -- stable slug, e.g. 'g1_2' — never changes after creation
                                              label text not null,         -- display name, e.g. 'Grade 1-2 script' — freely editable
                                              sort_order integer not null default 0,
                                              created_at timestamptz not null default now()
);
comment on table public.reading_sentence_sets is 'The named reading scripts a sentence can belong to. Sentences reference this by key (reading_sentences.sentence_set); student_recordings.sentence_set intentionally has no FK here — see comment above.';
alter table public.reading_sentence_sets enable row level security;
create policy "Authenticated users can view reading sentence sets"
  on public.reading_sentence_sets for select
                                                 to authenticated
                                                 using (true);
create policy "Admins can manage reading sentence sets"
  on public.reading_sentence_sets for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant select, insert, update, delete on table public.reading_sentence_sets to authenticated;
grant all on table public.reading_sentence_sets to service_role;

-- Backfill the two sets that already exist implicitly via
-- reading_sentences rows seeded/created before this migration.
insert into public.reading_sentence_sets (key, label, sort_order) values
                                                                      ('g1_2', 'Grade 1-2 script', 1),
                                                                      ('g3_4', 'Grade 3-4 script', 2)
    on conflict (key) do nothing;

-- display_order is deliberately separate from sentence_number.
-- sentence_number is the STABLE identity a sentence keeps for its whole
-- life — student_recordings and student_recording_word_flags key off
-- (sentence_set, sentence_number), so renumbering it on every reorder
-- would silently scramble which recording matches which sentence.
-- display_order is purely "where does this sentence show up in the
-- list" and is the only thing the new reorder UI ever touches.
alter table public.reading_sentences add column display_order integer not null default 0;
update public.reading_sentences set display_order = sentence_number;
create index if not exists reading_sentences_set_display_order_idx on public.reading_sentences (sentence_set, display_order);

-- Now that every existing sentence_set value has a matching row in
-- reading_sentence_sets (backfilled above), tie the two together for
-- real — this is what makes "delete a script" cascade-delete its
-- sentences instead of leaving them orphaned.
alter table public.reading_sentences
    add constraint reading_sentences_sentence_set_fkey
        foreign key (sentence_set) references public.reading_sentence_sets(key) on delete cascade;

-- reading_sentences' original migration only granted SELECT to
-- authenticated (plus ALL to service_role) — its "Admins can manage
-- reading sentences" RLS policy already covered insert/update/delete,
-- but RLS only narrows rows on privileges a role already has at the
-- table level, so without this grant an admin's insert/update/delete
-- would 403 before RLS is even evaluated. Nothing wrote to this table
-- from the app before now (only the seed script, running as
-- service_role), so the gap never surfaced until this page needed it.
grant insert, update, delete on table public.reading_sentences to authenticated;

-- Reassigns display_order = position for every id in p_ids, in the
-- order given, in one round trip instead of N. No uniqueness constraint
-- on (sentence_set, display_order) exists, so there's no ordering
-- hazard between the individual UPDATEs the way there would be for
-- sentence_number — this is purely a batching convenience, not a
-- correctness requirement. SECURITY INVOKER (the default) means it
-- still runs as the calling user, so the existing "Admins can manage
-- reading sentences" RLS policy applies to every UPDATE inside it same
-- as if the client had issued them one by one: a non-admin caller just
-- silently updates zero rows.
create or replace function public.reorder_reading_sentences(p_ids uuid[])
returns void
language plpgsql
as $$
declare
i integer;
begin
for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
update public.reading_sentences
set display_order = i
where id = p_ids[i];
end loop;
end;
$$;
grant execute on function public.reorder_reading_sentences(uuid[]) to authenticated;