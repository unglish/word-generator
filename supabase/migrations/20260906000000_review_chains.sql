-- Each historical session starts its own chain; no historical links are inferred.
alter table public.review_sessions
  add column chain_id uuid not null default gen_random_uuid(),
  add column previous_session_id uuid unique references public.review_sessions(id) on delete cascade,
  add column continuation_exhausted boolean not null default false,
  add constraint review_session_predecessor check (previous_session_id is distinct from id);
create index review_sessions_chain on public.review_sessions(study_id, chain_id);

create function private.review_assignment(session_id uuid)
returns jsonb language sql set search_path = '' as $$
  select jsonb_build_object('rubric', study.manifest->'rubric', 'items',
    jsonb_agg(jsonb_build_object('position', a.ordinality - 1, 'sample_id', s.id, 'spelling', s.spelling) order by a.ordinality))
  from public.review_sessions se
  join public.review_studies study on study.id = se.study_id
  cross join lateral unnest(se.assignments) with ordinality a(id, ordinality)
  join public.review_samples s on s.id = a.id
  where se.id = session_id
  group by study.id;
$$;

-- Callers serialize allocation with the study row lock. Coverage counts only
-- ratings and assignments, while eligibility excludes all prior chain spellings.
create function private.choose_review_samples(study_id text, chain_id uuid, batch_length integer)
returns text[] language sql set search_path = '' as $$
    with representatives as (
      select distinct on (s.spelling) s.id, s.spelling
      from public.review_samples s where s.study_id = choose_review_samples.study_id
      order by s.spelling, s.draw_index
    ), ratings as (
      select r.sample_id, count(*) as n from public.review_responses r
      join public.review_sessions se on se.id = r.session_id
      where se.study_id = choose_review_samples.study_id and r.status = 'rated' group by r.sample_id
    ), assignments as (
      select unnest(se.assignments) as sample_id from public.review_sessions se where se.study_id = choose_review_samples.study_id
    ), exposures as (
      select a.sample_id, count(*) as n from assignments a group by a.sample_id
    ), selected as (
      select r.id from representatives r
      left join ratings ra on ra.sample_id = r.id
      left join exposures e on e.sample_id = r.id
      where not exists (
        select 1 from public.review_sessions se
        cross join lateral unnest(se.assignments) a(sample_id)
        join public.review_samples seen on seen.id = a.sample_id
        where se.study_id = choose_review_samples.study_id and se.chain_id = choose_review_samples.chain_id
          and seen.spelling = r.spelling
      )
      order by coalesce(ra.n, 0), coalesce(e.n, 0), random() limit batch_length
    ) select array_agg(s.id order by random()) from selected s;
$$;

create or replace function private.start_review(study_id text, session_id uuid, submission_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  study public.review_studies;
  session public.review_sessions;
  chosen text[];
  chain uuid := gen_random_uuid();
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
    chosen := private.choose_review_samples(study.id, chain, study.session_length);
    if coalesce(cardinality(chosen), 0) = 0 then
      raise exception using errcode = 'PT409', message = 'The study has insufficient samples.';
    end if;
    insert into public.review_sessions(id, study_id, token_hash, assignments, chain_id)
      values (session_id, study.id, extensions.digest(submission_token, 'sha256'), chosen, chain) returning * into session;
  end if;
  return private.review_assignment(session.id);
end;
$$;

create function private.continue_review(study_id text, session_id uuid, submission_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  study public.review_studies;
  previous public.review_sessions;
  following public.review_sessions;
  chosen text[];
  next_id uuid;
  next_token text;
begin
  if study_id is null or session_id is null or submission_token is null or submission_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'PT400', message = 'Invalid continuation request.';
  end if;
  select * into previous from public.review_sessions s where s.id = session_id for update;
  if not found or previous.study_id <> study_id or previous.token_hash <> extensions.digest(submission_token, 'sha256') then
    raise exception using errcode = 'PT403', message = 'Invalid session credentials.';
  end if;
  if previous.completed_at is null then
    raise exception using errcode = 'PT409', message = 'Complete this batch before continuing.';
  end if;
  if previous.continuation_exhausted then
    return jsonb_build_object('exhausted', true);
  end if;
  select * into following from public.review_sessions s where s.previous_session_id = previous.id;
  if not found then
    select * into study from public.review_studies s where s.id = study_id for update;
    if not study.enrollment_open then
      raise exception using errcode = 'PT404', message = 'This study is not accepting new reviews.';
    end if;
    chosen := private.choose_review_samples(study.id, previous.chain_id, study.session_length);
    if coalesce(cardinality(chosen), 0) = 0 then
      update public.review_sessions s set continuation_exhausted = true where s.id = previous.id;
      return jsonb_build_object('exhausted', true);
    end if;
    next_id := gen_random_uuid();
    -- Derive credentials from the authorized parent so retries can recover them
    -- without storing plaintext submission tokens or exposing them in exports.
    next_token := encode(extensions.hmac('review-continuation:' || next_id::text, submission_token, 'sha256'), 'hex');
    insert into public.review_sessions(id, study_id, token_hash, assignments, chain_id, previous_session_id)
      values (next_id, study.id, extensions.digest(next_token, 'sha256'), chosen, previous.chain_id, previous.id)
      returning * into following;
  end if;
  next_token := encode(extensions.hmac('review-continuation:' || following.id::text, submission_token, 'sha256'), 'hex');
  return jsonb_build_object('exhausted', false, 'session_id', following.id, 'submission_token', next_token,
    'assignment', private.review_assignment(following.id));
end;
$$;

create function public.continue_review(study_id text, session_id uuid, submission_token text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.continue_review(study_id, session_id, submission_token);
$$;
revoke all on function private.review_assignment(uuid), private.choose_review_samples(text, uuid, integer),
  private.continue_review(text, uuid, text), public.continue_review(text, uuid, text) from public, anon, authenticated;
grant execute on function private.continue_review(text, uuid, text), public.continue_review(text, uuid, text) to anon;
notify pgrst, 'reload schema';
