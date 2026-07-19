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
