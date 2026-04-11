-- Course Topic Tracker
-- Stores per-student topic completion for each course/subject.
-- Topics can be added by the student or pre-populated by a course rep.

create table if not exists public.course_topics (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  course_code     text not null check (char_length(course_code) <= 20),
  course_name     text not null check (char_length(course_name) <= 200),
  topic_name      text not null check (char_length(topic_name) <= 300),
  is_completed    boolean not null default false,
  created_by      text not null check (created_by in ('student', 'course_rep')),
  created_at      timestamptz not null default now()
);

-- Each student can only have one entry per (course_code, topic_name) pair
create unique index if not exists course_topics_student_course_topic_idx
  on public.course_topics (student_id, course_code, topic_name);

-- RLS: students can only see and modify their own topics
alter table public.course_topics enable row level security;

create policy "Students can read own topics"
  on public.course_topics for select
  using (student_id = auth.uid());

create policy "Students can insert own topics"
  on public.course_topics for insert
  with check (student_id = auth.uid());

create policy "Students can update own topics"
  on public.course_topics for update
  using (student_id = auth.uid());

create policy "Students can delete own topics"
  on public.course_topics for delete
  using (student_id = auth.uid());

-- Course reps can insert topics for all students in their department
-- (they set created_by = 'course_rep' and target specific student_ids)
create policy "Course reps can insert topics for students"
  on public.course_topics for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('course_rep', 'assistant_course_rep', 'developer')
    )
  );
