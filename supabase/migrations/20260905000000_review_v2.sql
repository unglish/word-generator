alter table public.review_responses add column comment text check (char_length(comment) <= 2000);

do $$
declare constraint_name text;
begin
  select conname into strict constraint_name from pg_constraint
  where conrelid = 'public.review_studies'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%rubric%';
  execute format('alter table public.review_studies drop constraint %I', constraint_name);
end;
$$;
alter table public.review_studies add constraint review_studies_rubric_version
  check (manifest->'rubric'->>'version' in ('written-v1', 'written-v2'));

drop function public.submit_review_response(uuid, text, uuid, integer, text, integer, boolean);
drop function private.submit_review_response(uuid, text, uuid, integer, text, integer, boolean);

create function private.submit_review_response(
  session_id uuid, submission_token text, response_id uuid, "position" integer,
  status text, rating integer, familiar boolean, comment text default null
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
  if comment is not null and char_length(comment) > 2000 then
    raise exception using errcode = 'PT400', message = 'Comments must be at most 2000 characters.';
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
    if previous.id <> response_id or previous.status is distinct from status or previous.rating is distinct from rating or previous.familiar is distinct from familiar or previous.comment is distinct from comment then
      raise exception using errcode = 'PT409', message = 'This position already has a different response.';
    end if;
  else
    begin
      insert into public.review_responses(id, session_id, position, sample_id, status, rating, familiar, comment)
        values (response_id, session.id, "position", sample, status, rating, familiar, comment);
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

create function public.submit_review_response(session_id uuid, submission_token text, response_id uuid, "position" integer, status text, rating integer, familiar boolean, comment text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.submit_review_response(session_id, submission_token, response_id, "position", status, rating, familiar, comment);
$$;
revoke all on function private.submit_review_response(uuid, text, uuid, integer, text, integer, boolean, text),
  public.submit_review_response(uuid, text, uuid, integer, text, integer, boolean, text) from public, anon, authenticated;
grant execute on function private.submit_review_response(uuid, text, uuid, integer, text, integer, boolean, text),
  public.submit_review_response(uuid, text, uuid, integer, text, integer, boolean, text) to anon;
notify pgrst, 'reload schema';
