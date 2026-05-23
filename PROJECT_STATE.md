# Estado Atual do Projeto CNPJ — 2026-05-22

## Modo Autopilot (agentes)

Criado em 2026-05-22:

- `AGENT_AUTOPILOT.md` — loop de trabalho etapa a etapa, permissões operacionais e limites
- `AGENT_BACKLOG.md` — backlog priorizado com tarefas pequenas, critérios de aceite e validações

Agentes devem ler estes arquivos junto com `CLAUDE.md` e `PROJECT_HANDOFF.md`. Próxima tarefa pendente no backlog: **nenhuma desbloqueada** (ver tarefas bloqueadas).

---

## Histórico recente

### 2026-05-23 — MO-003 UI monitoramento

- Seção **Empresas observadas** na UI: listar, adicionar, remover watch
- Exibe últimos eventos de diff por watch selecionado
- Endpoint `GET /api/watch/:id/events`
- `apiDelete` no frontend; `src/services/watch.ts`
- Validações: backend + frontend typecheck/build OK

### 2026-05-23 — MO-002 Watch diff job

- Tabelas `investigation_watch_snapshot` e `investigation_watch_event`
- Job `npm run watch:diff -- --cnpj=62909728` compara sócios, telefones e e-mails declarados
- Diff textual explicável (added/removed/baseline); atualiza `last_checked_at`
- Migration: `npm run db:migrate:watch-diff`
- Validações: typecheck/build OK; execução manual GREAT WALL OK

### 2026-05-23 — MO-001 Investigation watch

- Tabela `investigation_watch` (cnpj_basico, label, notes, last_checked_at)
- Rotas: `POST/GET /api/watch`, `GET/PATCH/DELETE /api/watch/:id`
- Protegidas com `requireAuth` (mesmo padrão de casos)
- Migration: `npm run db:migrate:watch`
- Validações: typecheck/build OK; curl POST/GET OK

### 2026-05-23 — RB-002 Auth middleware

- `requireAuth` protege `/api/cases/*` quando `AUTH_DISABLED=false`
- Default `AUTH_DISABLED=true` — demo local sem token
- Valida JWT via Supabase `auth.getUser`
- `GET /health` retorna `authDisabled`
- Validações: backend typecheck/build OK

### 2026-05-23 — WS-002 / WS-003 Workspace casos

- **WS-002:** API CRUD mínima já entregue em WS-001 — validada (POST/GET casos + entidades)
- **WS-003:** Botão **Salvar como caso** no relatório de investigação; feedback sucesso/erro; lista na seção Casos
- Helper `salvarInvestigacaoComoCaso` em `src/services/cases.ts`
- Validações: frontend typecheck/build OK

### 2026-05-23 — WS-001 Investigation Case

- Tabelas `investigation_case` e `investigation_case_entities` no PostgreSQL local
- Rotas: `POST/GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/entities`
- UI seção **Casos**: criar, listar, vincular empresa selecionada
- Migration: `npm run db:migrate:cases`
- Validações: typecheck/build OK; API testada

### 2026-05-22 — Autopilot batch (ER-003 → GR-003)

- **ER-003:** `buildEvidenceStrength` penaliza força global quando ≥3 homônimos LOW
- **ER-004/005:** dossiê com alerta homônimos; cap nomes ultra-frequentes (`commonPartnerNames.ts`)
- **DO-001/002:** dossiê HTML agrupado por tipo; limitações estáticas + dinâmicas
- **DO-003:** preview de limitações na UI antes do dossiê
- **MU-001:** join município já existia — validado (`municipioNome: SERRA`)
- **MU-002, BE-001, BE-002:** busca por município, CEP e endereço normalizado
- **GR-002/003:** `?depth=2` na API + seletor na UI (29 vs 22 relações GREAT WALL)
- **PDF-001, CVM-001, DJ-001, RB-001:** spikes em `docs/`
- Validações: backend + frontend typecheck/build OK; curls 62909728, 14919958, search SERRA

**Bloqueadas (autopilot):** PDF-002, SR-001, SR-002, CVM-002, DJ-002 — ver `AGENT_BACKLOG.md`

### 2026-05-22 — Modo autopilot

- Criados `AGENT_AUTOPILOT.md` e `AGENT_BACKLOG.md` (sem alteração de código funcional)
- Backlog priorizado: entity resolution → dossiê v2 → municípios → busca endereço → grafo depth → PDF → Serpro → CVM → DataJud → workspace → RBAC → monitoramento

### 2026-05-22 — Entity resolution (baseline)

- `entityConfidence` em relações `same_partner` (LOW / MEDIUM / HIGH)
- Match só por nome → `INFERIDO`; match por documento → `DECLARADO`
- Linguagem "possível correspondência"; alerta de homônimos na UI (LOW/MEDIUM)
- Arquivos: `backend/src/services/investigation.service.ts`, `src/services/investigation.ts`, `src/App.tsx`

---

## Visão do Produto

Este projeto não é um buscador de CNPJ.
Não é um "Sniper privado".
Não promete UBO automático.
Não promete grupo econômico definitivo.
Não promete investigação patrimonial.

O objetivo oficial é construir um **Motor de Investigação Empresarial Explicável**.

O sistema deve gerar hipóteses investigativas, vínculos candidatos, evidências rastreáveis e dossiês de apoio à decisão a partir de bases públicas e, futuramente, fontes pagas sob demanda.

Entradas do produto final:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas do produto final:

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

## Posicionamento por Camadas

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

## Linguagem Oficial

Trocar linguagem conclusiva por linguagem de evidência:

- "risco alto" -> "força das evidências alta"
- "grupo econômico identificado" -> "grupo econômico candidato"
- "beneficiário final" -> "estrutura societária conhecida"
- "comprovado" -> "declarado", "inferido" ou "validado", exceto quando houver documento/certidão específica

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

O conceito de "score de risco" deve ser substituído por **Força das evidências**:

- BAIXA
- MÉDIA
- ALTA

Esse indicador mede a consistência das evidências disponíveis, não conclusão jurídica, patrimonial, societária final ou UBO.

## Limitações Sempre Visíveis

- CPF mascarado na base pública.
- Ausência de percentuais societários.
- Ausência de atos societários.
- Ausência de UBO formal.
- Ausência de prova patrimonial.

## Arquitetura Atual

Frontend:

- React + TypeScript + Vite + Tailwind.
- `src/App.tsx` concentra o MVP visual.
- `src/services/api.ts` centraliza HTTP.
- `src/services/receita.ts` acessa busca Receita, investigáveis e estabelecimentos.
- `src/services/investigation.ts` acessa relatório, disponibilidade, achados e score.

Backend:

- Fastify + TypeScript.
- `backend/src/server.ts` inicializa API.
- `backend/src/routes/companies.routes.ts` preserva consulta CNPJ e relações antigas.
- `backend/src/routes/receita.routes.ts` expõe Receita local.
- `backend/src/routes/investigation.routes.ts` expõe relatório de investigação.
- `backend/src/services/investigation.service.ts` concentra motor inicial de vínculos, achados, score e grafo.
- `backend/src/repositories/receita.repository.ts` consulta PostgreSQL local.

Dados:

- Supabase: cache normalizado de consultas CNPJ externas.
- PostgreSQL local Docker: base pública Receita importada parcialmente.
- Importadores Receita: ZIP streaming, CSV `;`, encoding `latin1`, batch insert.

## Arquitetura-Alvo

Módulos obrigatórios:

- Núcleo de dados: fontes, importação, cache, normalização, proveniência e qualidade.
- Resolução de entidades: deduplicar e consolidar empresas, sócios, endereços, telefones e e-mails.
- Motor de vínculos: detectar relações diretas e indiretas, sempre com motivo e fonte.
- Motor de achados: converter vínculos em hipóteses investigativas explicáveis.
- Força das evidências: nível BAIXA/MÉDIA/ALTA, motivos, fontes e limitações.
- Dossiê probatório: HTML/PDF com evidências, trilha de origem e resumo decisório.
- Monitoramento: acompanhar mudanças em empresas, sócios, contatos e novos vínculos.
- Workspace de casos: organizar investigações, favoritos, notas, status e histórico.

## Estado Atual Implementado

Produto/MVP:

- Consulta CNPJ multi-provider via backend.
- Busca Receita por razão social.
- Busca investigativa unificada (`GET /api/search`) por CNPJ, razão social, sócio, endereço, telefone e e-mail.
- Lista de empresas investigáveis.
- Seleção de empresa e estabelecimentos.
- Botão `Investigar vínculos` quando há dado investigável.
- Relatório de investigação.
- Resumo Executivo.
- Força das evidências (`evidenceStrength`) com classificação DECLARADO / INFERIDO por relação.
- Resolução de entidades inicial: `entityConfidence` em vínculos por sócio + alerta de homônimos.
- Grafo visual navegável com painel de evidências.
- Explorar relações por sócio, telefone, e-mail e endereço.
- Motor de Achados inicial.
- Cards de achados por severidade.
- Evidências por achado e vínculo.
- Dossiê HTML básico com limitações (evoluir para v2 — DO-001).

Backend:

- Fastify/TypeScript.
- Supabase como cache.
- PostgreSQL local Receita.
- Importadores Receita.
- Endpoint `GET /api/receita/search`.
- Endpoint `GET /api/receita/investigaveis`.
- Endpoint `GET /api/receita/companies/:cnpjBasico/establishments`.
- Endpoint `GET /api/investigation/company/:cnpjBasico`.
- Endpoint `GET /api/investigation/company/:cnpjBasico/availability`.
- Endpoint `GET /api/investigation/company/:cnpjBasico/dossier.html`.
- Endpoint `GET /api/search`.
- `POST /api/cases`, `GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/entities` (protegidas quando `AUTH_DISABLED=false`).
- `POST/GET /api/watch`, `GET/PATCH/DELETE /api/watch/:id`, `GET /api/watch/:id/events` (protegidas quando `AUTH_DISABLED=false`).

Dados locais conhecidos:

| Tabela | Registros |
|---|---:|
| `receita_empresas` | 27.628.041 |
| `receita_estabelecimentos` | 100.000 |
| `receita_socios` | 1.187.000 |
| `receita_municipios` | 5.572 |

CNPJs fortes para demo:

- `62909728` — GREAT WALL MOTOR BRASIL COMERCIO LTDA.
- `97543890` — TOLEDO PAULINO SERVICOS EM INFORMATICA LTDA.
- `59698351` — M.S CASA DE CARNES LTDA.
- `58638478` — IMPORLED VARIEDADE EM IMPORTADOS LTDA.

Validação recente:

- `62909728` retornou `summary`, `relations`, `graph`, `findings` e `investigationScore`.
- GREAT WALL retornou 22 relações, 2 achados e indicador técnico MEDIUM/55. A linguagem de produto deve tratar isso como força das evidências, não risco.

## Lacunas Críticas

- Penalizar força global quando há homônimos (ER-003) — **concluído**
- Dossiê HTML v2 com evidências agrupadas — **concluído (DO-001/002)**
- Grafo: expansão por profundidade — **concluído (GR-002/003)**
- Exportação PDF do dossiê — **bloqueado (PDF-002)**
- Workspace de casos — **WS-001 a WS-003 concluídos**
- RBAC — **RB-002 auth middleware concluído**
- Monitoramento — **MO-001 a MO-003 concluídos**
- Força das evidências por grupo econômico candidato
- Camada Serpro opcional sob demanda
- CVM e DataJud como fontes abertas complementares
- Monitoramento
- Workspace de casos
- RBAC

## Prioridade Imediata

1. Refatorar score para "força das evidências".
2. Adicionar classificação DECLARADO / INFERIDO / VALIDADO / COMPROVADO.
3. Melhorar dossiê HTML com seção "Limitações da base".
4. Grafo navegável.
5. Busca unificada por CNPJ, razão social, sócio, endereço, telefone e e-mail.
6. Camada Serpro opcional sob demanda.
7. CVM e DataJud como fontes abertas complementares.

## Restrições Atuais

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
- Não reimplementar funcionalidades existentes.
- Não alterar contratos sem necessidade.
- Não expor chaves no frontend.

## Instruções Para Agentes

- Ler `CLAUDE.md`, `PROJECT_HANDOFF.md`, `PROJECT_STATE.md`, `AGENT_AUTOPILOT.md` e `AGENT_BACKLOG.md` antes de codar.
- Modo autopilot: uma tarefa por vez; marcar backlog e atualizar este arquivo ao concluir.
- Antes de codar, verificar se a tarefa aumenta explicabilidade, evidência, dossiê, busca ou grafo.
- Não reanalisar arquitetura quando a tarefa for pontual.
- Economizar contexto.
- Implementar por etapas pequenas.
- Não adicionar campos por adicionar.
- Não importar mais dados sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Rodar `npm run typecheck` e `npm run build` quando houver alteração frontend.
- Rodar `cd backend && npm run typecheck && npm run build` quando houver alteração backend.
- Pedir confirmação para ações destrutivas.
