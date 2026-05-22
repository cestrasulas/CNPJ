# Handoff Técnico — Projeto CNPJ

## Fonte Oficial

Este documento deve ser lido antes de codar, junto com `PROJECT_STATE.md` e `CLAUDE.md`.

Não reimplemente funcionalidades existentes. Não reanalise arquitetura quando a tarefa for pontual. Trabalhe em etapas pequenas e preserve o MVP incremental.

## Visão do Produto

Não estamos construindo um buscador de CNPJ.

Estamos construindo um **Motor de Investigação Empresarial explicável, auditável e orientado a decisão**.

O produto deve ajudar o usuário a entender relações empresariais, por que elas importam, qual nível de atenção exigem e quais evidências sustentam cada conclusão.

## Produto Final

Entradas:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas:

- empresas relacionadas
- grupos empresariais
- vínculos diretos e indiretos
- grafo navegável
- achados de investigação
- score explicável
- dossiê auditável
- evidências por vínculo
- monitoramento futuro

## Arquitetura Atual

Frontend:

- React + TypeScript + Vite + Tailwind.
- `src/App.tsx` ainda concentra o MVP.
- `src/services/api.ts` é o cliente HTTP central.
- `src/services/receita.ts` encapsula busca Receita e estabelecimentos.
- `src/services/investigation.ts` encapsula relatório, disponibilidade, achados e score.
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
- Motor de achados: transformar vínculos em conclusões explicáveis.
- Score explicável: pontos, nível e razões auditáveis.
- Dossiê probatório: HTML/PDF com evidências, vínculos e resumo decisório.
- Monitoramento: acompanhar alterações e novos vínculos.
- Workspace de casos: organizar investigações, histórico, notas e decisões.

## Estado Atual

Implementado:

- Frontend React/Vite.
- Backend Fastify/TypeScript.
- Supabase cache.
- PostgreSQL local Receita.
- Importadores Receita.
- Busca Receita por razão social.
- Lista de investigáveis.
- Investigação por CNPJ básico.
- Relações por sócio, telefone, e-mail, endereço e matriz/filiais.
- Relatório com Resumo Executivo.
- Motor de Achados inicial.
- `investigationScore` explicável.
- Cards por severidade.
- Evidências iniciais por achado.
- Grafo visual funcional.
- Explorar relações.

Rotas principais:

- `GET /health`
- `GET /api/companies/:cnpj`
- `GET /api/companies/:cnpj/relations`
- `GET /api/receita/search?q=termo&limit=20`
- `GET /api/receita/investigaveis`
- `GET /api/receita/companies/:cnpjBasico`
- `GET /api/receita/companies/:cnpjBasico/establishments`
- `GET /api/receita/debug/establishments-sample?limit=20`
- `GET /api/investigation/company/:cnpjBasico`
- `GET /api/investigation/company/:cnpjBasico/availability`

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

## Lacunas Críticas

- Evidência por vínculo individual: fonte, campo, valor e origem.
- Dossiê HTML/PDF.
- Busca por sócio, endereço, telefone e e-mail.
- Normalização de municípios.
- Normalização robusta de endereços.
- Resolução robusta de entidades.
- Score de grupo econômico.
- Monitoramento.
- Workspace de casos.

## Prioridade Imediata

1. Evidência por vínculo.
2. Dossiê HTML simples.
3. Grafo navegável.
4. Busca unificada por sócio/endereço/telefone/e-mail.
5. Normalização de municípios/endereço.

## Restrições

- Não voltar a tratar o produto como consulta CNPJ.
- Não adicionar campos só por adicionar.
- Não importar mais base sem justificativa de produto.
- Não fazer inferências sem evidência.
- Toda relação precisa ter motivo e fonte.
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

Testes API:

```bash
curl http://localhost:3001/health
curl "http://localhost:3001/api/receita/search?q=great%20wall&limit=5"
curl "http://localhost:3001/api/receita/investigaveis"
curl "http://localhost:3001/api/investigation/company/62909728"
```

## Instruções Para Agentes

- Ler estes documentos antes de codar.
- Não reimplementar funcionalidades existentes.
- Economizar contexto.
- Implementar por etapas pequenas.
- Sempre rodar typecheck/build quando houver código.
- Pedir confirmação para ações destrutivas.
- Se a tarefa for documentação, não alterar código funcional.
