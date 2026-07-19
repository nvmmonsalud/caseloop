-- Synthetic seed reference. The running demo uses src/lib/data.ts so it works without credentials.
-- Create auth users through Supabase Auth first, then replace the UUID placeholders below.
insert into public.cases (id,title,summary,is_fictional) values
('10000000-0000-0000-0000-000000000001','Hikari Foods: Choosing a Market Entry Strategy for the Philippines','A fictional Japanese food company evaluates acquisition, joint venture, or organic entry.',true);
insert into public.case_sources(case_id,source_key,title,content) values
('10000000-0000-0000-0000-000000000001','S1','Market outlook','Fictional premium packaged-food growth is projected at 8.4% annually.'),
('10000000-0000-0000-0000-000000000001','S2','Strategic options','Acquisition asks ¥4.8B; JV requires ¥1.7B; organic entry costs ¥900M.'),
('10000000-0000-0000-0000-000000000001','S3','Consumer research','Consumers value familiar flavors, small packs, and affordability.'),
('10000000-0000-0000-0000-000000000001','S4','Operating risks','Hikari lacks local regulatory and post-merger integration capacity.'),
('10000000-0000-0000-0000-000000000001','S5','Partner profile','Manila Harvest offers regulatory expertise and access to 18,000 outlets.');

-- Demo identities, course, assignment, and 12 anonymized completed responses.
do $$
declare
  faculty_uuid uuid := '20000000-0000-0000-0000-000000000001';
  course_uuid uuid := '30000000-0000-0000-0000-000000000001';
  assignment_uuid uuid := '40000000-0000-0000-0000-000000000001';
  student_uuid uuid;
  attempt_uuid uuid;
  i int;
  positions text[] := array['Joint venture','Acquisition','Joint venture','Organic entry','Acquisition','Joint venture','Organic entry','Joint venture','Acquisition','Joint venture','Organic entry','Joint venture'];
  rationales text[] := array['Balances speed with capital exposure.','Control and scale justify the price.','Local knowledge enables localization.','Protects culture and limits capital.','Capture growth immediately.','Staged commitment preserves options.','Small tests reduce localization risk.','Partner access solves distribution.','Control enables consistent quality.','Combines adaptation with speed.','Own-market learning builds advantage.','Learn first, deepen ownership later.'];
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values('00000000-0000-0000-0000-000000000000',faculty_uuid,'authenticated','authenticated','faculty@caseflow.demo',crypt('caseflow-demo',gen_salt('bf')),now(),'{}','{}',now(),now()) on conflict(id) do nothing;
  insert into public.profiles(id,display_name,role) values(faculty_uuid,'Professor Tanaka','faculty') on conflict(id) do nothing;
  insert into public.courses(id,title,code,faculty_id) values(course_uuid,'Global Strategy','MBA 642',faculty_uuid) on conflict(id) do nothing;
  insert into public.enrollments(course_id,user_id,role) values(course_uuid,faculty_uuid,'faculty') on conflict do nothing;
  insert into public.assignments(id,course_id,case_id,due_at,diagnostic_questions,decision_options,rubric) values(assignment_uuid,course_uuid,'10000000-0000-0000-0000-000000000001',now()+interval '7 days','["Recommendation","Supporting evidence","Biggest uncertainty"]','["Acquisition","Joint venture","Organic entry"]','{"criteria":["evidence use","assumption quality","trade-off reasoning"]}') on conflict(id) do nothing;
  insert into public.learning_objectives(assignment_id,objective,sort_order) values
   (assignment_uuid,'Evaluate entry modes under uncertainty',1),(assignment_uuid,'Balance speed, control, and capital exposure',2),(assignment_uuid,'Anticipate execution risk across stakeholders',3) on conflict do nothing;
  for i in 1..12 loop
    student_uuid := md5('caseflow-student-'||i)::uuid;
    attempt_uuid := md5('caseflow-attempt-'||i)::uuid;
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values('00000000-0000-0000-0000-000000000000',student_uuid,'authenticated','authenticated','student'||i||'@caseflow.demo',crypt('caseflow-demo',gen_salt('bf')),now(),'{}','{}',now(),now()) on conflict(id) do nothing;
    insert into public.profiles(id,display_name,role) values(student_uuid,'Anonymous '||lpad(i::text,2,'0'),'student') on conflict(id) do nothing;
    insert into public.enrollments(course_id,user_id,role) values(course_uuid,student_uuid,'student') on conflict do nothing;
    insert into public.student_attempts(id,assignment_id,student_id,status,completed_at) values(attempt_uuid,assignment_uuid,student_uuid,'completed',now()) on conflict(assignment_id,student_id) do nothing;
    insert into public.student_responses(attempt_id,response_type,content,source_ids) values(attempt_uuid,'initial_recommendation',positions[i]||': '||rationales[i],case when i in (1,3,6,8,10,12) then array['S2','S5'] else array['S1','S3'] end);
  end loop;
end $$;
