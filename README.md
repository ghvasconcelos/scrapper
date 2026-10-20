# CRM de Prospecção

CRM para transformar buscas do Google Maps em vendas de site e tráfego pago. Os dados ficam no
**Supabase** (Postgres), então o mesmo CRM funciona em dois lugares:

- **No PC com o scraper** (http://localhost:3000): dispara as buscas no scraper (Docker, `http://localhost:8080`)
  e importa os leads para o banco.
- **Na Vercel**: a equipe trabalha os leads de qualquer lugar. Lá não há scraper, então "Nova busca" não roda;
  o que for importado no PC aparece sozinho.

O CRM não tem login: qualquer pessoa com o link da Vercel vê os leads.

## Configurar o banco (uma vez)

1. No Supabase, abra o **SQL Editor** e rode [`supabase/schema.sql`](supabase/schema.sql) (cria as tabelas).
2. Para trazer os dados do CRM antigo (SQLite), rode também `data/supabase-dados.sql` (fica fora do git).
3. Em **Connect → Transaction pooler**, copie a connection string e troque `[YOUR-PASSWORD]` pela senha do banco.
4. Cole em `.env.local` (no PC) e em **Vercel → Settings → Environment Variables** como `DATABASE_URL`.

Opcional: `DATABASE_CA` com o certificado do Supabase (Database Settings → SSL → Download certificate) para a
conexão conferir o servidor.

## Como abrir

Dê dois cliques em **`Abrir CRM.bat`** (na pasta acima desta). Ele:

1. abre o Docker Desktop se estiver fechado (o scraper sobe junto);
2. prepara a versão mais recente do CRM;
3. abre o navegador em http://localhost:3000.

Deixe a janela preta aberta enquanto usa; fechar a janela desliga o CRM.

Pelo terminal: `npm run dev` (desenvolvimento) ou `npm run build && npm start` (uso diário, mais rápido).

## O que tem

- **Início**: quem precisa de retorno hoje, as melhores oportunidades ainda não contatadas e o resumo do funil.
- **Leads**: tabela com filtros (prioridade, etapa, precisa de site, categoria, busca, responsável, WhatsApp,
  Instagram), ordenação, ações em massa e exportação para CSV.
- **Funil**: kanban Novo → Contatado → Respondeu → Reunião → Proposta → Fechado / Perdido. Arraste os cards.
- **Buscar leads**: escolha a cidade e os tipos de negócio; o CRM dispara o scraper, acompanha o progresso,
  analisa o site de cada empresa e grava os leads no banco sozinho (sem duplicar quem já existe).
  Também importa buscas feitas fora do CRM (pelo terminal ou pela tela do scraper).
- **Gaveta do lead**: mensagem de WhatsApp pronta a partir de um modelo, argumentos de venda (site e
  marketing/tráfego), próximo contato, valor, dados de contato editáveis e histórico.
- **Configurações**: nomes da equipe (sem login: cada um escolhe o nome no menu lateral), etapas do funil,
  modelos de mensagem e endereço do scraper.

Link direto para um lead: qualquer página com `?lead=ID`, por exemplo `http://localhost:3000/leads?lead=80`.

## Como os leads são avaliados

Para cada empresa o CRM confere o "site" cadastrado no Google Maps (vazio, Instagram, WhatsApp, Linktree,
cardápio de delivery, site próprio fora do ar, quebrado ou sem versão para celular), procura Instagram,
Facebook e WhatsApp no site, e verifica Pixel da Meta e Google Analytics. Daí saem o argumento de site, os
argumentos de marketing e a prioridade:

- **ALTA**: precisa de site, tem boa reputação (nota 4,3+ e 50+ avaliações) e tem WhatsApp.
- **MÉDIA**: precisa de site (ou verificar), ou tem site sem Pixel/Analytics.
- **BAIXA**: o resto.

WhatsApp "provável" vem de número de celular (quase sempre tem WhatsApp, mas não é garantido);
"confirmado" vem de um link oficial da empresa.

## Dados e backup

Tudo fica no Postgres do Supabase (o backup diário é do próprio Supabase, conforme o plano).
Para uma planilha, use **Exportar CSV** em Leads ou em Configurações.

São contatos comerciais públicos: na prospecção, ofereça sempre a opção de não receber mais mensagens (LGPD).
