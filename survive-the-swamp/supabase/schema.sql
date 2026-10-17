-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- user_id is the Auth0 "sub" (text like "google-oauth2|123..."), NOT a UUID.

create table if not exists profiles (
  user_id    text primary key,
  email      text,
  driftwood  integer not null default 0,
  rope       integer not null default 0,
  canvas     integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  course       text,
  title        text not null,
  due_date     date,           -- normalized; null when the syllabus was vague
  due_date_raw text,           -- exactly what the syllabus said
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  user_id       text not null,
  title         text not null,
  minutes       integer,
  position      integer not null default 0,
  completed     boolean not null default false,
  completed_at  timestamptz,
  rewarded      boolean not null default false  -- reward only once per task
);

create index if not exists assignments_user_idx on assignments (user_id, due_date);
create index if not exists tasks_user_idx on tasks (user_id, completed);
create index if not exists tasks_assignment_idx on tasks (assignment_id);

-- The backend uses the service-role key and filters by user_id itself.
-- Enabling RLS with NO policies means the public anon key can read nothing.
alter table profiles    enable row level security;
alter table assignments enable row level security;
alter table tasks       enable row level security;

-- Complete/uncomplete a task and award a resource atomically, once per task.
create or replace function set_task_completed(p_user text, p_task uuid, p_done boolean)
returns table (out_task_id uuid, out_completed boolean, out_reward text)
language plpgsql
as $$
declare
  v_task   tasks%rowtype;
  v_reward text := null;
begin
  select * into v_task from tasks where id = p_task and user_id = p_user for update;
  if not found then
    return;
  end if;

  update tasks
     set completed = p_done,
         completed_at = case when p_done then now() else null end
   where id = p_task;

  if p_done and not v_task.rewarded then
    v_reward := (array['driftwood', 'rope', 'canvas'])[1 + (v_task.position % 3)];
    update tasks set rewarded = true where id = p_task;

    insert into profiles (user_id) values (p_user) on conflict (user_id) do nothing;
    if v_reward = 'driftwood' then
      update profiles set driftwood = driftwood + 1 where user_id = p_user;
    elsif v_reward = 'rope' then
      update profiles set rope = rope + 1 where user_id = p_user;
    else
      update profiles set canvas = canvas + 1 where user_id = p_user;
    end if;
  end if;

  return query select p_task, p_done, v_reward;
end;
$$;

-- Only the server (service role) may call it.
revoke execute on function set_task_completed(text, uuid, boolean) from public, anon, authenticated;
grant  execute on function set_task_completed(text, uuid, boolean) to service_role;
