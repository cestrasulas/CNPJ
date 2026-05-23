# Handoff Técnico — Projeto CNPJ

## Fonte Oficial

Este documento deve ser lido antes de codar, junto com `PROJECT_STATE.md` e `CLAUDE.md`.

Não reimplemente funcionalidades existentes. Não reanalise arquitetura quando a tarefa for pontual. Trabalhe em etapas pequenas e preserve o MVP incremental.

## Nova Direção Oficial

Não estamos construindo um buscador de CNPJ.
Não estamos construindo um "Sniper privado".
Não estamos prometendo UBO automático.
Não estamos prometendo grupo econômico definitivo.
Não estamos prometendo investigação patrimonial.

Estamos construindo um **Motor de Investigação Empresarial Explicável**.

Função: gerar hipóteses investigativas, vínculos candidatos, evidências rastreáveis e dossiês de apoio à decisão a partir de bases públicas e, futuramente, fontes pagas sob demanda.

## Posicionamento do Produto

Camada 1 — Base pública / baixo custo:

- Receita Federal CNPJ público
- CVM Dados Abertos
- DataJud
- outras fontes abertas futuras

Entrega:

- vínculos candidatos
- grupos econômicos candidatos
- força das evidências
- grafo
- dossiê inicial
- limitações claras

Camada 2 — Precisão sob demanda:

- Serpro Consulta CNPJ
- Infosimples
- juntas comerciais
- outras APIs pagas

Entrega:

- enriquecimento
- validação
- aumento de confiança
- redução de falso positivo

Camada 3 — Enterprise futura:

- BigDataCorp
- Orbis
- Sayari
- ONR
- vendors de sanções/mídia/PEP

Entrega:

- due diligence mais robusta
- ownership internacional
- camadas patrimoniais/processuais
- compliance avançado

## Linguagem Obrigatória

Não usar linguagem conclusiva sem evidência documental.

Trocar:

- "risco alto" por "força das evidências alta"
- "grupo econômico identificado" por "grupo econômico candidato"
- "beneficiário final" por "estrutura societária conhecida"
- "comprovado" por "declarado", "inferido" ou "validado", salvo quando houver documento/certidão específica

Usar:

- evidência declarada
- evidência inferida
- evidência validada
- evidência comprovada documentalmente apenas quando houver documento

## Classificação Oficial de Evidência

DECLARADO:
Dado consta em fonte cadastral/oficial, como Receita pública.

INFERIDO:
Relação derivada por regra do sistema, como mesmo telefone, mesmo endereço ou padrão recorrente.

VALIDADO:
Relação reforçada por fonte adicional, como Serpro ou outra API complementar.

COMPROVADO:
Relação sustentada por documento ou certidão específica.

## Score Oficial

Substituir o conceito de "score de risco" por **Força das evidências**:

- BAIXA
- MÉDIA
- ALTA

A força das evidências mede consistência, quantidade e qualidade das evidências disponíveis. Não mede culpa, fraude, patrimônio, controle final ou conclusão jurídica.

## Limitações Sempre Visíveis

- CPF mascarado na base pública.
- Ausência de percentuais societários.
- Ausência de atos societários.
- Ausência de UBO formal.
- Ausência de prova patrimonial.

## Entradas e Saídas

Entradas:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas:

- empresas relacionadas
- grupos econômicos candidatos
- vínculos diretos e indiretos
- grafo navegável
- achados de investigação
- força das evidências
- dossiê auditável
- evidências por vínculo
- limitações da base
- monitoramento futuro

## Arquitetura Atual

Frontend:

- React + TypeScript + Vite + Tailwind.
- `src/App.tsx` ainda concentra o MVP.
- `src/services/api.ts` é o cliente HTTP central.
- `src/services/receita.ts` encapsula busca Receita e estabelecimentos.
- `src/services/investigation.ts` encapsula relatório, disponibilidade, achados e força das evidências.
- `src/services/cases.ts`, `src/services/watch.ts` — workspace e monitoramento.
- Consulta CNPJ antiga está preservada via backend.

Backend:

- Fastify + TypeScript.
- `backend/src/server.ts` é a entrada.
- `backend/src/routes/companies.routes.ts` mantém consulta CNPJ e relações antigas.
- `backend/src/routes/receita.routes.ts` expõe busca Receita, investigáveis e estabelecimentos.
- `backend/src/routes/investigation.routes.ts` expõe relatório de investigação e disponibilidade.
- `backend/src/services/investigation.service.ts` contém motor inicial de vínculos, achados, score e grafo.
- `backend/src/repositories/receita.repository.ts` consulta PostgreSQL local.

Dados:

- Supabase: cache normalizado de consultas CNPJ.
- PostgreSQL local Docker: base Receita Federal parcial.
- Importadores Receita: ZIP streaming, CSV `;`, encoding `latin1`, batch insert.

## Arquitetura-Alvo

Módulos obrigatórios:

- Núcleo de dados: ingestão, cache, normalização, proveniência e qualidade de fonte.
- Resolução de entidades: consolidar empresas, sócios, contatos e endereços equivalentes.
- Motor de vínculos: detectar relações diretas e indiretas com motivo e fonte.
- Motor de achados: transformar vínculos em hipóteses investigativas explicáveis.
- Força das evidências: nível, motivos, limitações e classificação da evidência.
- Dossiê probatório: HTML/PDF com evidências, vínculos e resumo decisório.
- Monitoramento: acompanhar alterações e novos vínculos.
- Workspace de casos: organizar investigações, histórico, notas e decisões.

## Linhas de Trabalho (séries)

O projeto evoluiu em **três linhas** que não compartilham um único arquivo de etapas:

| Série | Escopo | Status |
|-------|--------|--------|
| **Etapas 1–3** | Frontend incremental: busca local, dados adicionais, comparação | **Encerrada** (sem ETAPA 4 no repo) |
| **Motor + Infra** | Backend, Receita Docker, investigação, grafo, dossiê, busca unificada | **MVP entregue** (base parcial) |
| **Autopilot** | Backlog `AGENT_BACKLOG.md` (ER, DO, GR, WS, RB, MO, PDF-002a) | **Fila desbloqueada concluída**; 5 tarefas bloqueadas |

Registro detalhado de séries e decisões: `PROJECT_STATE.md` (seção *Linhas de trabalho*).

## Estado Atual (2026-05-23)

### Produto implementado

**Consulta CNPJ (legado preservado)**

- Providers no backend + cache Supabase.
- Histórico, favoritos, export TXT, JSON, links externos, inteligência local sobre consulta.

**Motor de investigação (Receita local)**

- Relatório por `cnpjBasico`: vínculos, achados, força das evidências, grafo (`depth=1|2`).
- Classificação por relação: DECLARADO / INFERIDO; `entityConfidence` em `same_partner`.
- Dossiê HTML agrupado por tipo + limitações; exportação PDF via navegador (`?print=1` e botão na UI).
- Busca unificada: CNPJ, razão social, sócio, endereço, telefone, e-mail, município, CEP.

**Workspace e monitoramento**

- Casos: CRUD PostgreSQL + UI; salvar investigação como caso.
- Watch: empresas observadas + job `watch:diff` (sócios/telefones/e-mails) + UI de eventos.
- Auth opcional: `AUTH_DISABLED=true` (default); JWT Supabase em `/api/cases` e `/api/watch`.

### UI principal (`src/App.tsx`)

- Busca investigativa unificada.
- Casos de investigação.
- Empresas observadas (monitoramento).
- Busca Receita + amostras + estabelecimentos + investigar vínculos.
- Consulta CNPJ completa (seção legada).
- Comparação empresa × empresa, dados adicionais, score local histórico/favoritos.

### Rotas API

**Públicas (sem auth)**

- `GET /health` — inclui `authDisabled`
- `GET /api/companies/:cnpj`
- `GET /api/companies/:cnpj/relations`
- `GET /api/search?q=&limit=`
- `GET /api/receita/search?q=&limit=`
- `GET /api/receita/investigaveis`
- `GET /api/receita/companies/:cnpjBasico`
- `GET /api/receita/companies/:cnpjBasico/establishments`
- `GET /api/receita/debug/establishments-sample?limit=`
- `GET /api/investigation/company/:cnpjBasico?depth=1|2`
- `GET /api/investigation/company/:cnpjBasico/availability`
- `GET /api/investigation/company/:cnpjBasico/dossier.html?print=1`

**Protegidas** (`requireAuth` quando `AUTH_DISABLED=false`)

- `POST/GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/entities`
- `POST/GET /api/watch`, `GET/PATCH/DELETE /api/watch/:id`, `GET /api/watch/:id/events`

### Migrations PostgreSQL local (além de Receita)

- `npm run db:migrate:cases` → `investigation_case`, `investigation_case_entities`
- `npm run db:migrate:watch` → `investigation_watch`
- `npm run db:migrate:watch-diff` → `investigation_watch_snapshot`, `investigation_watch_event`

## Dados Locais

| Tabela | Registros |
|---|---:|
| `receita_empresas` | 27.628.041 |
| `receita_estabelecimentos` | 100.000 |
| `receita_socios` | 1.187.000 |
| `receita_municipios` | 5.572 |

Cobertura atual:

- STRONG: poucos CNPJs com interseção entre empresas, estabelecimentos e sócios.
- PARTIAL: empresas com estabelecimento, mas sem sócio importado correspondente.
- CADASTRAL: somente empresa.

Causa da baixa cobertura forte: partições `*0.zip` de Empresas, Estabelecimentos e Sócios têm sobreposição pequena.

CNPJs úteis para demo:

- `62909728` — GREAT WALL MOTOR BRASIL COMERCIO LTDA.
- `97543890` — TOLEDO PAULINO SERVICOS EM INFORMATICA LTDA.
- `59698351` — M.S CASA DE CARNES LTDA.
- `58638478` — IMPORLED VARIEDADE EM IMPORTADOS LTDA.

## Lacunas Críticas (atualizado)

**Produto / motor**

- Força das evidências por **grupo econômico candidato** (agregação explícita).
- Classificação **VALIDADO / COMPROVADO** além de DECLARADO/INFERIDO (depende Serpro/documentos).
- Integração **Serpro** sob demanda (bloqueada no backlog: SR-001/002).
- Integração **CVM / DataJud** (spikes em `docs/`; código bloqueado: CVM-002, DJ-002).
- PDF server-side `dossier.pdf` (bloqueado: PDF-002; alternativa leve: PDF-002a navegador).

**Dados**

- Cobertura **STRONG** baixa: partições `*0.zip` de empresas/estabelecimentos/sócios com pouca interseção.
- Importação adicional só com justificativa de produto (não expandir base por volume).

**Engenharia**

- `src/App.tsx` monolítico (~3000 linhas) — dívida de manutenção.
- RBAC completo por papéis (spike `docs/rbac-model.md`; só middleware + flag hoje).
- Monitoramento sem scheduler/e-mail (job manual `npm run watch:diff`).
- Auth no frontend ainda não envia JWT nas rotas protegidas (ok enquanto `AUTH_DISABLED=true`).

## Prioridade Imediata (próxima decisão de produto)

1. **Validar demo ponta a ponta** — GREAT WALL `62909728` com backend + frontend + Docker.
2. **Escolher próxima série:**
   - **Dados:** alinhar amostra Receita (mesma partição ou CNPJs demo) **ou**
   - **Produto:** grupo econômico candidato + força agregada **ou**
   - **Integração:** Serpro / CVM / DataJud (desbloquear backlog) **ou**
   - **Engenharia:** fatiar `App.tsx` sem mudar comportamento.
3. Push para `origin/main` se houver commits locais à frente do remoto.

## Restrições

- Não voltar a tratar o produto como consulta CNPJ.
- Não vender como "Sniper privado".
- Não prometer UBO com base pública.
- Não prometer investigação patrimonial.
- Não chamar relação inferida de prova.
- Não usar linguagem conclusiva sem evidência documental.
- Não adicionar campos só por adicionar.
- Não importar mais base sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Sempre diferenciar dado declarado, inferido, validado e comprovado.
- Toda relação precisa ter fonte, motivo, confiança e limitação quando aplicável.
- Preservar MVP incremental.
- Não expor API keys no frontend.
- Não chamar providers externos diretamente do frontend.
- Não reescrever `App.tsx` inteiro.
- Não trocar para Neo4j/Elastic/microservices nesta fase.
- Não adicionar biblioteca pesada de grafo sem decisão explícita.

## Comandos Úteis

Frontend:

```bash
npm run dev
npm run typecheck
npm run build
```

Backend:

```bash
cd backend
npm run dev
npm run typecheck
npm run build
```

Docker/Postgres Receita:

```bash
cd backend
npm run db:up
npm run db:migrate:receita
```

Migrations app (casos + watch):

```bash
cd backend
npm run db:migrate:cases
npm run db:migrate:watch
npm run db:migrate:watch-diff
npm run watch:diff -- --cnpj=62909728
```

Testes API:

```bash
curl http://localhost:3001/health
curl "http://localhost:3001/api/search?q=great%20wall&limit=5"
curl "http://localhost:3001/api/receita/search?q=great%20wall&limit=5"
curl "http://localhost:3001/api/receita/investigaveis"
curl "http://localhost:3001/api/investigation/company/62909728?depth=2"
curl "http://localhost:3001/api/investigation/company/62909728/dossier.html"
```

## Instruções Para Agentes

- Ler estes documentos antes de codar.
- Antes de codar, verificar se a tarefa aumenta explicabilidade, evidência, dossiê, busca ou grafo.
- Não reimplementar funcionalidades existentes.
- Economizar contexto.
- Implementar por etapas pequenas.
- Não adicionar campos por adicionar.
- Não importar mais dados sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Sempre rodar typecheck/build quando houver código.
- Pedir confirmação para ações destrutivas.
- Se a tarefa for documentação, não alterar código funcional.
