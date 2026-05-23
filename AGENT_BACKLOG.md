# Backlog de Agentes — Projeto CNPJ

Backlog priorizado para execução **uma tarefa por vez** no modo autopilot (`AGENT_AUTOPILOT.md`).

**Legenda de status:** `PENDENTE` | `EM ANDAMENTO` | `CONCLUÍDA` | `BLOQUEADA`

Agentes: pegar sempre a **primeira tarefa `PENDENTE`** da lista (topo = maior prioridade).

---

## Concluídas recentemente (referência)

| ID | Tarefa | Status |
|----|--------|--------|
| ER-001 | `entityConfidence` básico em relações `same_partner` | CONCLUÍDA |
| ER-002 | Linguagem "possível correspondência" + alerta homônimos | CONCLUÍDA |
| EV-001 | Refatorar score para força das evidências | CONCLUÍDA |
| EV-002 | Classificação DECLARADO / INFERIDO por relação | CONCLUÍDA |
| GR-001 | Grafo navegável com painel de evidências | CONCLUÍDA |
| BS-001 | Busca unificada investigativa (`GET /api/search`) | CONCLUÍDA |

---

## 1. Entity Resolution / redução de falso positivo

### ER-003 — Penalizar força global quando há homônimos LOW

**Status:** PENDENTE

**Objetivo:** Ajustar `buildEvidenceStrength` para não elevar força global quando muitas relações `same_partner` têm `entityConfidence.level === LOW`.

**Arquivos prováveis:**
- `backend/src/services/investigation.service.ts`
- `src/App.tsx` (rótulos de força, se expuser detalhe)
- `src/services/investigation.ts`

**Critérios de aceite:**
- Relatório com ≥3 relações LOW reduz nível ou adiciona limitação explícita sobre homônimos
- GREAT WALL (`62909728`) mantém comportamento estável (majoritariamente HIGH por documento)
- Nenhuma linguagem de "mesma pessoa"

**Validações obrigatórias:**
- `cd backend && npm run typecheck && npm run build`
- `npm run typecheck && npm run build`
- `curl -s http://127.0.0.1:3001/api/investigation/company/62909728`
- `curl -s http://127.0.0.1:3001/api/investigation/company/14919958` (caso com homônimos)

**Riscos:** Regressão no nível de empresas com vínculos fortes reais.

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/investigation/company/14919958" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['evidenceStrength'])"
```

**Quando parar:** Se não houver campo `entityConfidence` nas relações — retomar ER-001/ER-002 primeiro.

---

### ER-004 — Expor `entityConfidence` no dossiê HTML

**Status:** PENDENTE

**Objetivo:** Tabela e achados do dossiê HTML devem mostrar confiança de entidade e aviso de homônimos quando LOW/MEDIUM.

**Arquivos prováveis:**
- `backend/src/services/investigation.service.ts` (`renderDossierHtml`, `renderRelationRow`)

**Critérios de aceite:**
- Coluna ou bloco "Confiança de entidade" visível em relações `same_partner`
- Texto de homônimos quando LOW/MEDIUM
- Seção limitações menciona correspondência por nome

**Validações obrigatórias:**
- `cd backend && npm run typecheck && npm run build`
- `curl -s "http://127.0.0.1:3001/api/investigation/company/62909728/dossier.html" | grep -i "entidade\|homônimo\|homonimo"`

**Riscos:** HTML quebrado por escape incorreto.

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/investigation/company/14919958/dossier.html" | head -80
```

**Quando parar:** Se rota dossiê não existir — criar sub-tarefa mínima de rota antes.

---

### ER-005 — Filtrar ou rebaixar matches só por nome em nomes ultra-frequentes

**Status:** PENDENTE

**Objetivo:** Lista curta de nomes estatisticamente frequentes (ex.: "JOSE CARLOS DA SILVA") não gera dezenas de relações HIGH/DECLARADO por nome isolado.

**Arquivos prováveis:**
- `backend/src/services/investigation.service.ts`
- Opcional: `backend/src/lib/commonPartnerNames.ts`

**Critérios de aceite:**
- Nome na lista + match só por nome → cap de relações ou score máximo LOW
- Match por documento continua HIGH
- Regra documentada em comentário ou constante com motivo

**Validações obrigatórias:**
- typecheck/build backend
- Teste com CNPJ que retorna homônimos (ex.: `14919958`)

**Riscos:** Falso negativo em nomes comuns que são de fato a mesma PF (mitigado por documento/telefone/endereço).

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/investigation/company/14919958" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len([r for r in d['relations'] if r['type']=='same_partner']))"
```

**Quando parar:** Se exigir análise estatística offline da base — pedir confirmação para import/job.

---

## 2. Dossiê v2 — limitações e evidências agrupadas

### DO-001 — Agrupar relações por tipo no dossiê HTML

**Status:** PENDENTE

**Objetivo:** Dossiê HTML organiza relações em seções (sócio, telefone, e-mail, endereço, matriz/filiais) em vez de tabela única plana.

**Arquivos prováveis:**
- `backend/src/services/investigation.service.ts`

**Critérios de aceite:**
- Seções com contagem por tipo
- Cada seção lista motivo, classificação, evidência e confiança
- Limitações da base permanecem visíveis

**Validações obrigatórias:**
- backend typecheck/build
- curl dossiê GREAT WALL

**Riscos:** Dossiê muito longo sem paginação — aceitável no MVP.

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/investigation/company/62909728/dossier.html" | grep -c "same_partner"
```

**Quando parar:** N/A

---

### DO-002 — Bloco "Limitações da base" expandido no dossiê

**Status:** PENDENTE

**Objetivo:** Seção dedicada com bullets oficiais (CPF mascarado, sem UBO, sem atos, homônimos, amostra parcial) + limitações dinâmicas do relatório (`summary.dataLimitations`, `evidenceStrength.limitations`).

**Arquivos prováveis:**
- `backend/src/services/investigation.service.ts`

**Critérios de aceite:**
- Seção `<h2>Limitações da base</h2>` com lista estática + dinâmica
- Sem linguagem conclusiva

**Validações obrigatórias:**
- backend build
- inspeção HTML via curl

**Riscos:** Duplicação de texto com UI — manter alinhado a `CLAUDE.md`.

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/investigation/company/62909728/dossier.html" | grep -i "Limitações"
```

**Quando parar:** N/A

---

### DO-003 — Botão/link dossiê v2 na UI com preview das limitações

**Status:** PENDENTE

**Objetivo:** UI de investigação destaca limitações antes de abrir dossiê (tooltip ou bloco colapsável).

**Arquivos prováveis:**
- `src/App.tsx`
- `src/services/investigation.ts`

**Critérios de aceite:**
- Usuário vê limitações principais sem abrir nova aba
- Link para dossiê HTML preservado

**Validações obrigatórias:**
- frontend typecheck/build

**Riscos:** Poluição visual — manter compacto.

**Comando de teste:** Inspeção manual ou build OK.

**Quando parar:** N/A

---

## 3. Normalização de municípios

### MU-001 — Join consistente município código → nome em estabelecimentos

**Status:** PENDENTE

**Objetivo:** Estabelecimentos exibem `municipioNome` resolvido via `receita_municipios` quando código IBGE existir.

**Arquivos prováveis:**
- `backend/src/repositories/receita.repository.ts`
- `backend/src/services/investigation.service.ts`
- `src/App.tsx`

**Critérios de aceite:**
- GREAT WALL e demo CNPJs mostram nome de município, não só código
- Fallback para código quando tabela não tiver registro

**Validações obrigatórias:**
- backend + frontend build
- `curl .../api/investigation/company/62909728` — verificar `establishments[].municipioNome`

**Riscos:** Performance em JOIN — usar índice existente.

**Comando de teste:**
```bash
docker exec cnpj-receita-postgres psql -U cnpj -d cnpj_receita -c "SELECT count(*) FROM receita_municipios;"
```

**Quando parar:** Se Docker/DB indisponível — registrar bloqueio.

---

### MU-002 — Normalizar município na busca investigativa

**Status:** PENDENTE

**Objetivo:** Busca por termo de município aceita nome ou código e retorna resultados consistentes.

**Arquivos prováveis:**
- `backend/src/services/search.service.ts`
- `backend/src/repositories/receita.repository.ts`

**Critérios de aceite:**
- Busca "São Paulo" ou código retorna empresas/endereços coerentes
- Sem quebrar busca existente por razão social/CNPJ

**Validações obrigatórias:**
- backend build
- `curl "http://127.0.0.1:3001/api/search?q=sao%20paulo&limit=5"`

**Riscos:** Falsos positivos por município grande.

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/search?q=3550308&limit=3"
```

**Quando parar:** Depende de MU-001 se join ainda não existir.

---

## 4. Busca por endereço melhorada

### BE-001 — Normalização de logradouro (trim, caixa, abreviações básicas)

**Status:** PENDENTE

**Objetivo:** `endereco_normalizado` ou camada de query trata abreviações comuns (R., AV., EST.) na busca.

**Arquivos prováveis:**
- `backend/src/services/search.service.ts`
- `backend/src/repositories/receita.repository.ts`
- Opcional: `backend/src/lib/addressNormalize.ts`

**Critérios de aceite:**
- Mesmo endereço com abreviações diferentes aumenta recall
- Resultados indicam classificação INFERIDO quando match parcial

**Validações obrigatórias:**
- backend build
- curl busca com endereço conhecido na amostra

**Riscos:** Over-match em logradouros genéricos ("RUA A").

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/search?q=RUA%20&limit=5"
```

**Quando parar:** Se exigir reimport da base — pedir confirmação.

---

### BE-002 — Busca por CEP + número no endpoint unificado

**Status:** PENDENTE

**Objetivo:** Query `q=` detecta padrão CEP e busca em estabelecimentos.

**Arquivos prováveis:**
- `backend/src/services/search.service.ts`
- `backend/src/repositories/receita.repository.ts`

**Critérios de aceite:**
- CEP formatado ou só dígitos retorna tipo `address`
- Limite de resultados respeitado

**Validações obrigatórias:**
- backend build
- curl com CEP existente na amostra (SELECT prévio)

**Riscos:** CEP duplicado entre empresas — OK para MVP (candidatos).

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/search?q=01310100&limit=5"
```

**Quando parar:** N/A

---

## 5. Grafo — expansão por profundidade

### GR-002 — Parâmetro `depth` na investigação (depth=1 default)

**Status:** PENDENTE

**Objetivo:** API aceita `?depth=2` para incluir relações de segundo nível (empresa relacionada → outra empresa), com teto de nós/arestas.

**Arquivos prováveis:**
- `backend/src/routes/investigation.routes.ts`
- `backend/src/services/investigation.service.ts`
- `src/services/investigation.ts`

**Critérios de aceite:**
- `depth=1` comportamento atual preservado
- `depth=2` adiciona nós/arestas com rótulo de profundidade
- Limite máximo documentado (ex.: 30 nós)

**Validações obrigatórias:**
- backend build
- curl `62909728?depth=2` vs `depth=1`

**Riscos:** Explosão combinatória — cap obrigatório.

**Comando de teste:**
```bash
curl -s "http://127.0.0.1:3001/api/investigation/company/62909728?depth=2" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d['graph']['nodes']),len(d['graph']['edges']))"
```

**Quando parar:** Se precisar fila/async — dividir em GR-002a (API) e GR-002b (UI).

---

### GR-003 — UI: controle de profundidade no grafo

**Status:** PENDENTE

**Objetivo:** Seletor depth 1/2 na UI recarrega investigação e atualiza grafo.

**Arquivos prováveis:**
- `src/App.tsx`
- `src/services/investigation.ts`

**Critérios de aceite:**
- Default depth=1
- Aviso de performance ao escolher depth=2

**Validações obrigatórias:**
- frontend build
- teste manual GREAT WALL

**Riscos:** UX confusa — label claro "expansão candidata".

**Comando de teste:** build OK + curl depth=2.

**Quando parar:** Depende de GR-002.

---

## 6. Exportação PDF

### PDF-001 — Spike: escolha de estratégia PDF (puppeteer vs print HTML)

**Status:** PENDENTE

**Objetivo:** Documento curto em `docs/pdf-export-spike.md` comparando opções; **sem implementar** ainda.

**Arquivos prováveis:**
- `docs/pdf-export-spike.md` (novo)

**Critérios de aceite:**
- Recomendação com prós/contras
- Dependências estimadas
- Alinhado a não adicionar lib pesada sem decisão

**Validações obrigatórias:** N/A (só doc)

**Riscos:** N/A

**Comando de teste:** N/A

**Quando parar:** Após doc criado — marcar CONCLUÍDA.

---

### PDF-002 — Endpoint `dossier.pdf` a partir do HTML existente

**Status:** PENDENTE

**Objetivo:** Gerar PDF do dossiê de investigação para download.

**Arquivos prováveis:**
- `backend/src/routes/investigation.routes.ts`
- `backend/src/services/investigation.service.ts`
- Nova dependência backend (conforme PDF-001)

**Critérios de aceite:**
- `GET .../dossier.pdf` retorna application/pdf
- Conteúdo equivalente ao HTML (limitações incluídas)

**Validações obrigatórias:**
- backend build
- curl `-o /tmp/dossier.pdf` e file size > 0

**Riscos:** Dependência pesada — **pedir confirmação** se puppeteer > 50MB.

**Comando de teste:**
```bash
curl -s -o /tmp/dossier.pdf "http://127.0.0.1:3001/api/investigation/company/62909728/dossier.pdf" && file /tmp/dossier.pdf
```

**Quando parar:** Depende de PDF-001; puppeteer requer permissão explícita.

---

## 7. Serpro opcional sob demanda

### SR-001 — Contrato e feature flag Serpro (sem chamar API real)

**Status:** PENDENTE

**Objetivo:** Flag `SERPRO_ENABLED`, tipos e stub de serviço; endpoint documentado mas retorna 501 se desligado.

**Arquivos prováveis:**
- `backend/src/services/serpro.service.ts` (novo)
- `backend/src/routes/investigation.routes.ts`
- `backend/.env.example`

**Critérios de aceite:**
- Nenhuma key no frontend
- `.env.example` documenta variáveis
- Chamada real **não** implementada nesta tarefa

**Validações obrigatórias:**
- backend build

**Riscos:** Escopo creep para integração real — **parar** na stub.

**Comando de teste:**
```bash
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/investigation/company/62909728/enrich/serpro"
```

**Quando parar:** Se usuário não tiver credenciais — stub only.

---

### SR-002 — Enriquecimento Serpro sob demanda (integração real)

**Status:** PENDENTE | **BLOQUEADA** até credenciais + aprovação explícita

**Objetivo:** Botão "Validar via Serpro" enriquece relação com classificação VALIDADO quando fonte responder.

**Arquivos prováveis:**
- `backend/src/services/serpro.service.ts`
- `src/App.tsx`

**Critérios de aceite:**
- Sob demanda por investigação
- Evidência VALIDADO com fonte Serpro
- Cobrança/log de uso mínimo

**Validações obrigatórias:** backend build + teste com credencial em `.env` local (não commitar)

**Riscos:** Custo, LGPD — **pedir confirmação** sempre.

**Comando de teste:** curl enrich com Serpro habilitado.

**Quando parar:** Sem `SERPRO_*` no `.env` — não implementar.

---

## 8. CVM Dados Abertos

### CVM-001 — Spike: mapear datasets CVM úteis ao produto

**Status:** PENDENTE

**Objetivo:** Doc `docs/cvm-sources.md` listando URLs, campos e hipóteses de vínculo (candidato, não conclusão).

**Arquivos prováveis:**
- `docs/cvm-sources.md`

**Critérios de aceite:**
- 2–3 datasets priorizados
- Sem importação de dados

**Validações obrigatórias:** N/A

**Riscos:** N/A

**Comando de teste:** N/A

**Quando parar:** Após doc — CONCLUÍDA.

---

### CVM-002 — Adapter read-only CVM (1 dataset)

**Status:** PENDENTE

**Objetivo:** Serviço backend consulta API/arquivo CVM em tempo real ou cache Supabase; achado tipo `cvm_filings` opcional no relatório.

**Arquivos prováveis:**
- `backend/src/services/cvm.service.ts`
- `backend/src/services/investigation.service.ts`

**Critérios de aceite:**
- Achado aparece só quando houver match
- Linguagem candidata
- Feature flag desligável

**Validações obrigatórias:**
- backend build

**Riscos:** Rate limit CVM — cache obrigatório.

**Comando de teste:** curl investigação empresa listada na CVM (definir após spike).

**Quando parar:** Import em massa necessária — pedir confirmação.

---

## 9. DataJud

### DJ-001 — Spike: API DataJud CNJ — escopo MVP

**Status:** PENDENTE

**Objetivo:** Doc `docs/datajud-sources.md` com endpoint, auth e campos para vínculo empresa/processo (hipótese).

**Arquivos prováveis:**
- `docs/datajud-sources.md`

**Critérios de aceite:**
- Sem implementação de código
- Riscos de overmatching documentados

**Validações obrigatórias:** N/A

**Comando de teste:** N/A

**Quando parar:** Após doc.

---

### DJ-002 — Consulta DataJud por CNPJ (read-only)

**Status:** PENDENTE

**Objetivo:** Seção opcional no relatório: processos candidatos ligados ao CNPJ investigado.

**Arquivos prováveis:**
- `backend/src/services/datajud.service.ts`
- `backend/src/routes/investigation.routes.ts`

**Critérios de aceite:**
- Não afirmar "empresa é parte" sem match explícito
- Timeout e fallback gracioso

**Validações obrigatórias:**
- backend build

**Riscos:** API pública instável — não bloquear investigação principal.

**Comando de teste:** curl com CNPJ demo.

**Quando parar:** Auth/conta CNJ necessária — pedir confirmação.

---

## 10. Workspace / casos

### WS-001 — Modelo de dados `investigation_case` (Supabase migration)

**Status:** PENDENTE

**Objetivo:** Tabela para salvar investigação: `cnpj_basico`, título, notas, status, snapshot JSON opcional.

**Arquivos prováveis:**
- `supabase/migrations/` (novo)
- `backend/src/repositories/case.repository.ts`

**Critérios de aceite:**
- Migration idempotente
- Sem UI ainda

**Validações obrigatórias:**
- backend build

**Riscos:** ALTER em produção — **pedir confirmação** antes de aplicar migration remota.

**Comando de teste:**
```bash
cd backend && npm run typecheck
```

**Quando parar:** Se Supabase não configurado — doc only.

---

### WS-002 — API CRUD mínima de casos

**Status:** PENDENTE

**Objetivo:** `POST/GET /api/cases` listar e criar casos de investigação.

**Arquivos prováveis:**
- `backend/src/routes/cases.routes.ts`
- `backend/src/server.ts`

**Critérios de aceite:**
- CRUD básico funcional
- Sem auth ainda (MVP local)

**Validações obrigatórias:**
- backend build
- curl POST + GET

**Riscos:** Sem RBAC — OK para MVP; não deploy público.

**Comando de teste:**
```bash
curl -s -X POST http://127.0.0.1:3001/api/cases -H 'Content-Type: application/json' -d '{"cnpjBasico":"62909728","title":"GREAT WALL"}'
```

**Quando parar:** Depende de WS-001.

---

### WS-003 — UI: salvar investigação como caso

**Status:** PENDENTE

**Objetivo:** Botão na tela de investigação persiste caso via API.

**Arquivos prováveis:**
- `src/App.tsx`
- `src/services/cases.ts` (novo)

**Critérios de aceite:**
- Feedback sucesso/erro
- Lista simples de casos salvos (sidebar ou seção)

**Validações obrigatórias:**
- frontend build

**Comando de teste:** manual + curl WS-002.

**Quando parar:** Depende de WS-002.

---

## 11. RBAC

### RB-001 — Spike: modelo de papéis (viewer, analyst, admin)

**Status:** PENDENTE

**Objetivo:** Doc `docs/rbac-model.md` alinhado a Supabase Auth; sem código.

**Arquivos prováveis:**
- `docs/rbac-model.md`

**Critérios de aceite:**
- Matriz rota × papel
- Escopo MVP mínimo

**Validações:** N/A

**Quando parar:** Após doc.

---

### RB-002 — Middleware auth backend (rotas protegidas)

**Status:** PENDENTE

**Objetivo:** Proteger `/api/cases` e futuros enrich pagos; rotas públicas de leitura Receita local mantidas.

**Arquivos prováveis:**
- `backend/src/middleware/auth.ts`
- `backend/src/server.ts`

**Critérios de aceite:**
- 401 sem token
- Flag desliga auth em dev

**Validações obrigatórias:**
- backend build

**Riscos:** Quebrar demo local — flag `AUTH_DISABLED=true`.

**Comando de teste:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/cases
```

**Quando parar:** Depende de RB-001; pedir confirmação para mudança arquitetural se escopo crescer.

---

## 12. Monitoramento

### MO-001 — Modelo `investigation_watch` (empresa observada)

**Status:** PENDENTE

**Objetivo:** Tabela + API para registrar CNPJ observado e `last_checked_at`.

**Arquivos prováveis:**
- migration Supabase
- `backend/src/routes/watch.routes.ts`

**Critérios de aceite:**
- CRUD mínimo
- Sem scheduler nesta tarefa

**Validações:** backend build

**Quando parar:** Migration remota — pedir confirmação.

---

### MO-002 — Job diff: detectar mudanças em sócios/contatos

**Status:** PENDENTE

**Objetivo:** Script/cron compara snapshot anterior vs investigação atual; gera evento candidato.

**Arquivos prováveis:**
- `backend/src/jobs/watchDiff.job.ts`
- `backend/package.json` (script npm)

**Critérios de aceite:**
- Diff textual explicável
- Não enviar e-mail ainda

**Validações:**
- backend build
- execução manual do job contra 1 CNPJ demo

**Riscos:** Carga DB — batch pequeno.

**Comando de teste:**
```bash
cd backend && npm run watch:diff -- --cnpj=62909728
```

**Quando parar:** Depende de MO-001; import massivo — pedir confirmação.

---

### MO-003 — UI: lista de empresas monitoradas

**Status:** PENDENTE

**Objetivo:** Tela/seção com watches e últimos eventos.

**Arquivos prováveis:**
- `src/App.tsx`
- `src/services/watch.ts`

**Critérios de aceite:**
- Adicionar/remover watch
- Ver último diff

**Validações:** frontend build

**Quando parar:** Depende de MO-002.

---

## Manutenção do backlog

- Nova tarefa: inserir na seção correta com ID sequencial (`XX-NNN`)
- Tarefa grande: dividir em sub-tarefas `< 1 sessão de agente`
- Ao concluir: status `CONCLUÍDA` + data no `PROJECT_STATE.md`
- Não remover tarefas concluídas — mover para "Concluídas recentemente" no topo
