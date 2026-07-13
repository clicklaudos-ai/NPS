# Click Laudos — Pesquisas CSAT/NPS

Aplicação Next.js (App Router) + Supabase para geração de links de pesquisa,
tela de avaliação do cliente e dashboard gerencial de CSAT/NPS.

## 1. Criar o banco no Supabase

1. Crie uma conta/projeto em [supabase.com](https://supabase.com).
2. No seu projeto, vá em **SQL Editor** → **New query**.
3. Cole todo o conteúdo do arquivo `sql/schema.sql` e clique em **Run**.
   - Isso cria as tabelas `atendentes`, `survey_links`, `survey_responses`,
     os triggers, as políticas de acesso e habilita o Realtime.
4. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Configurar o envio de e-mail (disparo de NPS em massa)

O disparo de pesquisas NPS por e-mail usa o [Resend](https://resend.com):

1. Crie uma conta gratuita em [resend.com](https://resend.com).
2. Em **API Keys**, gere uma chave e copie.
3. Enquanto você não verificar um domínio próprio em **Domains**, o envio só
   funciona usando o remetente `onboarding@resend.dev` e só chega para o
   e-mail cadastrado na sua conta Resend (limite do modo de testes). Depois
   de verificar seu domínio, troque `RESEND_FROM_EMAIL` por um e-mail do seu
   domínio (ex.: `pesquisas@clicklaudos.com.br`) para enviar para qualquer
   cliente.

## 3. Rodar localmente

```bash
npm install
cp .env.local.example .env.local
# edite .env.local e cole a URL/anon key do Supabase e a API key do Resend
npm run dev
```

Acesse `http://localhost:3000`. Senha padrão da aplicação: `9171`.

## 4. Publicar no Vercel

### Opção A — pelo site da Vercel (mais simples)
1. Suba este projeto para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. A Vercel detecta automaticamente que é Next.js — não precisa mudar nada no build.
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = a URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a anon key do seu projeto Supabase
   - `RESEND_API_KEY` = a API key do seu projeto Resend
   - `RESEND_FROM_EMAIL` = o remetente verificado no Resend
5. Clique em **Deploy**. Em ~1 minuto o link estará no ar.

### Opção B — pela CLI da Vercel
```bash
npm install -g vercel
vercel login
vercel            # primeiro deploy (ambiente de preview)
vercel --prod     # deploy de produção
```
Quando perguntado, informe as mesmas variáveis de ambiente do passo anterior
(ou rode `vercel env add NOME_DA_VARIAVEL` para cada uma).

## 5. Importante — sobre segurança nesta versão

A aplicação interna (Gerador de Link, Disparo NPS, Dashboard) é protegida por
uma senha única (`9171`, definida em `components/ClickLaudosApp.jsx`), sem
login por usuário. Os links de pesquisa enviados ao cliente final (`/avaliar`)
não passam por essa senha — são sempre públicos, para que o cliente consiga
responder sem precisar de conta.

Por simplicidade, o Supabase está configurado para aceitar leitura e escrita
da chave pública (`anon`) em todas as tabelas. Para um uso interno com mais
segurança, o próximo passo recomendado é:
- Ativar o **Supabase Auth** (login por e-mail/senha ou Google) para a equipe.
- Restringir as políticas de RLS de `atendentes`, `survey_links` e leitura de
  `survey_responses` para a role `authenticated`.
- Deixar público (`anon`) **somente** o insert em `survey_responses` e o select
  de `survey_links` por id, que é o que a tela `/avaliar` precisa.

Posso implementar essa camada de autenticação quando você quiser — é só pedir.

## 6. Estrutura do projeto

```
app/
  layout.js             → layout raiz + import do CSS global
  page.js                → renderiza o componente principal (protegido por senha)
  avaliar/page.js         → tela pública de resposta à pesquisa (/avaliar?id=...)
  api/send-nps/route.js   → endpoint que gera os links e dispara os e-mails via Resend
  globals.css             → diretivas do Tailwind
components/
  ClickLaudosApp.jsx  → aplicação inteira (Suporte, Disparo NPS, Cliente, Dashboard)
  AvaliarClient.jsx   → tela de resposta usada pela rota pública /avaliar
lib/
  supabaseClient.js   → inicializa o cliente do Supabase
  db.js               → funções de leitura/escrita (CRUD) no banco
sql/
  schema.sql          → script de criação do banco de dados
```
