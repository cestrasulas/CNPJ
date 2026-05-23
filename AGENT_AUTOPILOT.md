# Modo Autopilot — Agentes CNPJ

Este documento define como agentes devem trabalhar **etapa a etapa**, sem depender de prompts manuais constantes.

Leitura obrigatória antes de qualquer tarefa:

1. `CLAUDE.md`
2. `PROJECT_HANDOFF.md`
3. `PROJECT_STATE.md`
4. `AGENT_BACKLOG.md` (primeira tarefa pendente)
5. Este arquivo (`AGENT_AUTOPILOT.md`)

---

## Direção do produto (resumo)

Motor de **Investigação Empresarial Explicável** — não buscador de CNPJ, não Sniper privado, sem promessa de UBO/grupo definitivo/investigação patrimonial.

Sempre usar linguagem de **hipótese**, **evidência**, **possível correspondência**, **grupo econômico candidato** e **força das evidências**.

---

## Modo de trabalho (loop)

```
┌─────────────────────────────────────────────────────────┐
│  1. Ler docs oficiais                                   │
│  2. Pegar primeira tarefa PENDENTE do AGENT_BACKLOG.md  │
│  3. Implementar SOMENTE essa tarefa                     │
│  4. Rodar validações obrigatórias da tarefa             │
│  5. Corrigir erros até passar                          │
│  6. Atualizar PROJECT_STATE.md (o que mudou)            │
│  7. Marcar tarefa CONCLUÍDA no AGENT_BACKLOG.md        │
│  8. Commit com mensagem adequada                        │
│  9. Ir para a próxima tarefa pendente                   │
└─────────────────────────────────────────────────────────┘
```

### Regras do loop

- **Uma tarefa por vez.** Não agrupar escopos diferentes no mesmo commit.
- **Não reimplementar** funcionalidades já existentes — verificar `PROJECT_STATE.md` e código antes de codar.
- **Escopo mínimo:** se a tarefa pede X, entregar X; não refatorar `App.tsx` inteiro nem migrar arquitetura.
- **Documentação:** se a tarefa for só docs, não alterar código funcional.
- **Bloqueio:** se validação falhar por ambiente (Docker parado, DB indisponível), registrar em `PROJECT_STATE.md` e parar **somente** tarefas que dependem do banco; tarefas de docs/UI estática podem continuar se aplicável.

---

## Permissões operacionais

### Pode executar sem perguntar

- Leitura de arquivos (`cat`, `grep`, `ls`, Read tool)
- `npm run build`
- `npm run typecheck`
- `npm test`
- `curl localhost` / `curl 127.0.0.1`
- `docker ps`
- `npm run db:up` (em `backend/`)
- `git status`, `git diff`, `git add`, `git commit`
- `SELECT` no PostgreSQL (somente leitura)

### Deve perguntar antes

- `git push`
- `rm` (remoção de arquivos)
- `DELETE` / `UPDATE` / `INSERT` / `TRUNCATE` / `DROP` / `ALTER` no banco
- `docker compose down -v`
- `docker system prune`
- Importações grandes de base Receita ou outras fontes
- Mudanças em `.env` ou secrets
- Providers pagos (Serpro, Infosimples, etc.) — integração ou chamada real
- Criação de contas externas
- Mudanças arquiteturais (Neo4j, microservices, reescrita total de módulos)
- Alteração de contrato público de API sem justificativa na tarefa

---

## Docker parado

1. Tentar abrir Docker Desktop **uma vez** (macOS: `open -a Docker`)
2. Aguardar até ~60s
3. Rodar `cd backend && npm run db:up`
4. Se falhar: registrar bloqueio em `PROJECT_STATE.md` e seguir com tarefas que **não dependem** do banco

---

## Limites absolutos

- Não importar novos dados sem tarefa explícita no backlog
- Não mexer em providers externos sem tarefa explícita
- Não mudar contrato público de API sem justificar na tarefa e no `PROJECT_STATE.md`
- Não prometer UBO, Sniper privado ou grupo econômico definitivo
- Não usar linguagem conclusiva (“mesma pessoa”, “comprovado”, “risco alto”) sem documento
- Não expor API keys no frontend
- Não chamar providers pagos diretamente do frontend
- Não adicionar biblioteca pesada de grafo sem tarefa/decisão explícita

---

## Validações padrão (quando houver código)

### Backend alterado

```bash
cd backend && npm run typecheck && npm run build
```

### Frontend alterado

```bash
npm run typecheck && npm run build
```

### Endpoints de investigação (quando Docker/DB disponível)

```bash
curl -s http://127.0.0.1:3001/health
curl -s "http://127.0.0.1:3001/api/investigation/company/62909728" | head -c 500
```

CNPJ demo principal: `62909728` (GREAT WALL).

---

## Atualização de PROJECT_STATE.md

Após cada tarefa concluída, adicionar entrada datada em **Histórico recente** com:

- ID da tarefa (ex.: `ER-003`)
- O que foi feito (1–3 bullets)
- Arquivos tocados
- Resultado das validações
- Bloqueios ou débitos técnicos, se houver

---

## Commit

Formato sugerido:

```
<tipo>: <resumo curto> (<ID-tarefa>)

Corpo opcional: por quê, não só o quê.
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`.

Exemplo:

```
feat: exibir alerta de homônimos em relações de sócio (ER-003)

Reduz inferências fortes em PF com nome comum; usa entityConfidence LOW/MEDIUM.
```

---

## Quando parar e pedir ao usuário

- Tarefa exige ação da lista “Deve perguntar antes”
- Escopo da tarefa é ambíguo ou conflita com código existente
- Três tentativas falharam na mesma validação sem hipótese nova
- Tarefa descoberta depende de importação de dados ou credencial externa não prevista no backlog
- Mudança arquitetural parece necessária para cumprir critério de aceite

---

## Referência rápida de arquivos

| Área | Caminhos |
|------|----------|
| Motor investigação | `backend/src/services/investigation.service.ts` |
| Rotas investigação | `backend/src/routes/investigation.routes.ts` |
| Busca unificada | `backend/src/services/search.service.ts`, `backend/src/routes/search.routes.ts` |
| Repositório Receita | `backend/src/repositories/receita.repository.ts` |
| Frontend serviços | `src/services/investigation.ts`, `src/services/investigationSearch.ts` |
| UI principal | `src/App.tsx` |
| Docs oficiais | `CLAUDE.md`, `PROJECT_HANDOFF.md`, `PROJECT_STATE.md` |
| Backlog | `AGENT_BACKLOG.md` |
