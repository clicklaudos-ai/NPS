-- =====================================================================
-- CLICK LAUDOS — Pesquisas CSAT / NPS
-- Script de banco de dados para Supabase (PostgreSQL) — v2
-- Rode este script inteiro no SQL Editor do Supabase. Ele é seguro para
-- rodar mais de uma vez (idempotente) e também migra a v1, se existir.
-- =====================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Tipos (enums)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_pesquisa') then
    create type tipo_pesquisa as enum ('csat', 'nps');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 2. Tabela: atendentes
-- ---------------------------------------------------------------------
create table if not exists public.atendentes (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Tabela: survey_links
-- ---------------------------------------------------------------------
create table if not exists public.survey_links (
  id             uuid primary key default gen_random_uuid(),
  cliente        text not null,
  atendente_nome text not null default '—',
  tipo           tipo_pesquisa not null,
  url            text not null,
  respondido     boolean not null default false,
  respondido_em  timestamptz,
  criado_em      timestamptz not null default now()
);

-- Migração de uma v1 que ainda tivesse "protocolo"/"criado_por"
alter table public.survey_links add column if not exists atendente_nome text not null default '—';
alter table public.survey_links drop column if exists protocolo;
alter table public.survey_links drop column if exists criado_por;

-- Histórico de disparo em massa por e-mail: de onde o link veio, para qual
-- e-mail foi enviado e se o envio (não a resposta) deu certo.
alter table public.survey_links add column if not exists email text;
alter table public.survey_links add column if not exists canal text not null default 'manual';
alter table public.survey_links add column if not exists status_envio text not null default 'ok';
alter table public.survey_links add column if not exists erro_envio text;

alter table public.survey_links drop constraint if exists chk_canal;
alter table public.survey_links add constraint chk_canal check (canal in ('manual', 'email'));

alter table public.survey_links drop constraint if exists chk_status_envio;
alter table public.survey_links add constraint chk_status_envio check (status_envio in ('ok', 'erro'));

create index if not exists idx_survey_links_criado_em on public.survey_links (criado_em desc);
create index if not exists idx_survey_links_tipo       on public.survey_links (tipo);
create index if not exists idx_survey_links_atendente   on public.survey_links (atendente_nome);
create index if not exists idx_survey_links_canal       on public.survey_links (canal);

-- ---------------------------------------------------------------------
-- 4. Tabela: survey_responses
-- ---------------------------------------------------------------------
create table if not exists public.survey_responses (
  id             uuid primary key default gen_random_uuid(),
  link_id        uuid references public.survey_links(id) on delete set null,
  cliente        text not null,
  atendente_nome text not null default '—',
  tipo           tipo_pesquisa not null,
  nota           smallint not null,
  comentario     text,
  criado_em      timestamptz not null default now()
);

alter table public.survey_responses add column if not exists atendente_nome text not null default '—';
alter table public.survey_responses drop column if exists protocolo;

-- Constraints (recriadas de forma idempotente)
alter table public.survey_responses drop constraint if exists chk_nota_por_tipo;
alter table public.survey_responses add constraint chk_nota_por_tipo check (
  (tipo = 'csat' and nota between 1 and 5) or
  (tipo = 'nps'  and nota between 0 and 10)
);

alter table public.survey_responses drop constraint if exists chk_comentario_detrator;
alter table public.survey_responses add constraint chk_comentario_detrator check (
  not (tipo = 'nps' and nota <= 6 and (comentario is null or btrim(comentario) = ''))
);

create index if not exists idx_survey_responses_criado_em on public.survey_responses (criado_em desc);
create index if not exists idx_survey_responses_tipo      on public.survey_responses (tipo);
create index if not exists idx_survey_responses_link_id   on public.survey_responses (link_id);
create index if not exists idx_survey_responses_atendente on public.survey_responses (atendente_nome);

-- ---------------------------------------------------------------------
-- 5. Trigger: marca o link como respondido automaticamente
-- ---------------------------------------------------------------------
create or replace function public.fn_marcar_link_respondido()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.link_id is not null then
    update public.survey_links
       set respondido = true,
           respondido_em = new.criado_em
     where id = new.link_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_marcar_link_respondido on public.survey_responses;
create trigger trg_marcar_link_respondido
after insert on public.survey_responses
for each row execute function public.fn_marcar_link_respondido();

-- ---------------------------------------------------------------------
-- 6. Row Level Security (RLS)
--    OBS: esta versão ainda não tem tela de login para a equipe interna,
--    então o Suporte e o Dashboard também usam a chave anônima (pública)
--    do navegador. Por isso liberamos leitura/escrita ampla para "anon".
--    Antes de ir para produção com dados sensíveis de verdade, adicione
--    Supabase Auth e restrinja select/insert/update/delete a "authenticated".
-- ---------------------------------------------------------------------
alter table public.atendentes       enable row level security;
alter table public.survey_links     enable row level security;
alter table public.survey_responses enable row level security;

drop policy if exists "acesso total atendentes" on public.atendentes;
create policy "acesso total atendentes" on public.atendentes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "acesso total links" on public.survey_links;
create policy "acesso total links" on public.survey_links
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "acesso total respostas" on public.survey_responses;
create policy "acesso total respostas" on public.survey_responses
  for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 7. Realtime — necessário para o Dashboard atualizar sozinho quando
--    outro usuário/cliente responde uma pesquisa
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'atendentes') then
    alter publication supabase_realtime add table public.atendentes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'survey_links') then
    alter publication supabase_realtime add table public.survey_links;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'survey_responses') then
    alter publication supabase_realtime add table public.survey_responses;
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 8. Seed inicial de atendentes (opcional — só roda se a tabela estiver vazia)
-- ---------------------------------------------------------------------
insert into public.atendentes (nome)
select nome from (values
  ('Bruna Andrade'), ('Felipe Cardoso'), ('Vanessa Lopes'), ('Thiago Moraes'), ('Camila Duarte')
) as seed(nome)
where not exists (select 1 from public.atendentes);
