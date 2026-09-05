create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table public.review_studies (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  manifest jsonb not null,
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  session_length integer not null check (session_length between 1 and 20),
  enrollment_open boolean not null default false,
  created_at timestamptz not null default now(),
  check (manifest->>'study_id' = id),
  check ((manifest->>'session_length')::integer = session_length),
  check (manifest->>'schema_version' = '1'),
  check (manifest->'rubric'->>'version' = 'written-v1')
);

create table public.review_samples (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  study_id text not null references public.review_studies(id) on delete cascade,
  draw_index integer not null check (draw_index >= 0),
  spelling text not null check (length(spelling) between 1 and 256),
  word jsonb not null,
  unique (study_id, draw_index),
  check (word->'written'->>'clean' = spelling)
);
create index review_samples_spelling on public.review_samples(study_id, spelling);

create table public.review_sessions (
  id uuid primary key,
  study_id text not null references public.review_studies(id) on delete cascade,
  token_hash bytea not null,
  assignments text[] not null check (cardinality(assignments) between 1 and 20),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index review_sessions_study on public.review_sessions(study_id);

create table public.review_responses (
  id uuid primary key,
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  position integer not null check (position between 0 and 19),
  sample_id text not null references public.review_samples(id),
  status text not null check (status in ('rated', 'skipped')),
  rating integer,
  familiar boolean,
  received_at timestamptz not null default now(),
  unique (session_id, position),
  check (
    (status = 'rated' and rating is not null and rating between 1 and 5 and familiar is not null)
    or (status = 'skipped' and rating is null and familiar is null)
  )
);
create index review_responses_sample on public.review_responses(sample_id);

alter table public.review_studies enable row level security;
alter table public.review_samples enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_responses enable row level security;
revoke all on public.review_studies, public.review_samples, public.review_sessions, public.review_responses from public, anon, authenticated;
grant select, insert, update, delete on public.review_studies, public.review_samples, public.review_sessions, public.review_responses to service_role;

create function private.guard_review_snapshot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'review_studies' then
    if (to_jsonb(new) - 'enrollment_open') is distinct from (to_jsonb(old) - 'enrollment_open') then
      raise exception using errcode = 'PT409', message = 'Frozen study content cannot be changed.';
    end if;
  elsif to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception using errcode = 'PT409', message = 'Frozen samples cannot be changed.';
  end if;
  return new;
end;
$$;
create trigger immutable_review_study before update on public.review_studies
for each row execute function private.guard_review_snapshot();
create trigger immutable_review_sample before update on public.review_samples
for each row execute function private.guard_review_snapshot();

create function private.start_review(study_id text, session_id uuid, submission_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  study public.review_studies;
  session public.review_sessions;
  chosen text[];
  result jsonb;
begin
  if study_id is null or session_id is null or submission_token is null or submission_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'PT400', message = 'Invalid session request.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(session_id::text, 0));
  select * into session from public.review_sessions s where s.id = session_id;
  if found then
    if session.study_id <> study_id or session.token_hash <> extensions.digest(submission_token, 'sha256') then
      raise exception using errcode = 'PT403', message = 'Invalid session credentials.';
    end if;
    select * into study from public.review_studies s where s.id = study_id;
  else
    select * into study from public.review_studies s where s.id = study_id for update;
    if not found or not study.enrollment_open then
      raise exception using errcode = 'PT404', message = 'This study is not accepting new reviews.';
    end if;
    with representatives as (
      select distinct on (s.spelling) s.id, s.spelling
      from public.review_samples s where s.study_id = study.id
      order by s.spelling, s.draw_index
    ), ratings as (
      select r.sample_id, count(*) as n from public.review_responses r
      join public.review_sessions se on se.id = r.session_id
      where se.study_id = study.id and r.status = 'rated' group by r.sample_id
    ), assignments as (
      select unnest(se.assignments) as sample_id from public.review_sessions se where se.study_id = study.id
    ), exposures as (
      select a.sample_id, count(*) as n from assignments a group by a.sample_id
    ), selected as (
      select r.id from representatives r
      left join ratings ra on ra.sample_id = r.id
      left join exposures e on e.sample_id = r.id
      order by coalesce(ra.n, 0), coalesce(e.n, 0), random() limit study.session_length
    ) select array_agg(s.id order by random()) into chosen from selected s;
    if coalesce(cardinality(chosen), 0) <> study.session_length then
      raise exception using errcode = 'PT409', message = 'The study has insufficient samples.';
    end if;
    insert into public.review_sessions(id, study_id, token_hash, assignments)
      values (session_id, study.id, extensions.digest(submission_token, 'sha256'), chosen) returning * into session;
  end if;
  select jsonb_build_object('rubric', study.manifest->'rubric', 'items',
    jsonb_agg(jsonb_build_object('position', a.ordinality - 1, 'sample_id', s.id, 'spelling', s.spelling) order by a.ordinality))
  into result from unnest(session.assignments) with ordinality a(id, ordinality)
  join public.review_samples s on s.id = a.id;
  return result;
end;
$$;

create function private.submit_review_response(
  session_id uuid, submission_token text, response_id uuid, "position" integer,
  status text, rating integer, familiar boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session public.review_sessions;
  previous public.review_responses;
  sample text;
begin
  if session_id is null or response_id is null or submission_token is null or submission_token !~ '^[0-9a-f]{64}$' or "position" is null then
    raise exception using errcode = 'PT400', message = 'Invalid response.';
  end if;
  if not coalesce(
    (status = 'rated' and rating is not null and rating between 1 and 5 and familiar is not null)
    or (status = 'skipped' and rating is null and familiar is null), false) then
    raise exception using errcode = 'PT400', message = 'Invalid response.';
  end if;
  select * into session from public.review_sessions s where s.id = session_id for update;
  if not found or session.token_hash <> extensions.digest(submission_token, 'sha256') then
    raise exception using errcode = 'PT403', message = 'Invalid session credentials.';
  end if;
  if "position" < 0 or "position" >= cardinality(session.assignments) then
    raise exception using errcode = 'PT400', message = 'Invalid assignment position.';
  end if;
  sample := session.assignments["position" + 1];
  select * into previous from public.review_responses r where r.session_id = session.id and r.position = submit_review_response.position;
  if found then
    if previous.id <> response_id or previous.status is distinct from status or previous.rating is distinct from rating or previous.familiar is distinct from familiar then
      raise exception using errcode = 'PT409', message = 'This position already has a different response.';
    end if;
  else
    begin
      insert into public.review_responses(id, session_id, position, sample_id, status, rating, familiar)
        values (response_id, session.id, "position", sample, status, rating, familiar);
    exception when unique_violation then
      raise exception using errcode = 'PT409', message = 'This response ID has already been used.';
    end;
    if (select count(*) from public.review_responses r where r.session_id = session.id) = cardinality(session.assignments) then
      update public.review_sessions s set completed_at = now() where s.id = session.id;
    end if;
  end if;
  return jsonb_build_object('accepted', true, 'response_id', response_id);
end;
$$;

create function public.start_review(study_id text, session_id uuid, submission_token text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.start_review(study_id, session_id, submission_token);
$$;
create function public.submit_review_response(session_id uuid, submission_token text, response_id uuid, "position" integer, status text, rating integer, familiar boolean)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.submit_review_response(session_id, submission_token, response_id, "position", status, rating, familiar);
$$;

revoke all on function private.guard_review_snapshot() from public, anon, authenticated;
revoke all on function private.start_review(text, uuid, text), private.submit_review_response(uuid, text, uuid, integer, text, integer, boolean),
  public.start_review(text, uuid, text), public.submit_review_response(uuid, text, uuid, integer, text, integer, boolean) from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.start_review(text, uuid, text), private.submit_review_response(uuid, text, uuid, integer, text, integer, boolean),
  public.start_review(text, uuid, text), public.submit_review_response(uuid, text, uuid, integer, text, integer, boolean) to anon;

notify pgrst, 'reload schema';
