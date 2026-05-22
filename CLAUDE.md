# Projeto CNPJ

## Direção Oficial

Não estamos construindo um buscador de CNPJ.

Estamos construindo um **Motor de Investigação Empresarial explicável, auditável e orientado a decisão**.

O produto deve transformar dados públicos e consultas externas em relações verificáveis, achados sustentados por evidências e dossiês úteis para análise empresarial.

## Produto Final

Entradas previstas:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas esperadas:

- empresas relacionadas
- grupos empresariais
- vínculos diretos e indiretos
- grafo navegável
- achados de investigação
- score explicável
- dossiê auditável
- evidências por vínculo
- monitoramento futuro

## Stack Atual

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Fastify + TypeScript
- Cache operacional: Supabase
- Base local: PostgreSQL Docker com dados Receita Federal
- Importadores Receita: streaming ZIP/CSV latin1

## Arquitetura Atual

Frontend:

- `src/App.tsx` ainda concentra a UI principal.
- `src/services/api.ts` centraliza HTTP.
- `src/services/receita.ts` acessa busca e estabelecimentos Receita.
- `src/services/investigation.ts` acessa relatório, achados e disponibilidade de investigação.
- Consulta CNPJ antiga continua preservada via backend.

Backend:

- `backend/src/server.ts` inicia Fastify.
- `backend/src/routes/companies.routes.ts` mantém consulta CNPJ e relações antigas.
- `backend/src/routes/receita.routes.ts` expõe busca Receita, investigáveis e estabelecimentos.
- `backend/src/routes/investigation.routes.ts` expõe relatório de investigação.
- `backend/src/services/investigation.service.ts` contém motor inicial de vínculos, achados, score e grafo.
- `backend/src/repositories/receita.repository.ts` consulta PostgreSQL local da Receita.

## Arquitetura-Alvo

Módulos obrigatórios do produto:

- Núcleo de dados: ingestão, cache, normalização e proveniência de fontes.
- Resolução de entidades: consolidar empresas, sócios, contatos e endereços equivalentes.
- Motor de vínculos: detectar relações diretas e indiretas com motivo e fonte.
- Motor de achados: transformar vínculos em conclusões operacionais explicáveis.
- Score explicável: calcular atenção/risco com pontos e razões auditáveis.
- Dossiê probatório: gerar HTML/PDF com evidências e trilha de auditoria.
- Monitoramento: acompanhar empresas, sócios, contatos e mudanças relevantes.
- Workspace de casos: organizar investigações, histórico, anotações e decisões.

## Estado Atual

Implementado:

- Frontend React/Vite.
- Backend Fastify/TypeScript.
- Supabase como cache de consultas CNPJ.
- PostgreSQL local com base Receita parcial.
- Importadores Receita para empresas, estabelecimentos, sócios e municípios.
- Busca Receita por razão social.
- Investigação por CNPJ básico.
- Relações por sócio, telefone, e-mail, endereço e matriz/filiais.
- Grafo visual funcional.
- Resumo Executivo.
- Motor de Achados inicial.
- `investigationScore` explicável.
- Cards de achados por severidade.
- Evidências iniciais por achado.

## Lacunas Críticas

- Evidência por vínculo individual, com fonte e campo originador.
- Dossiê HTML/PDF auditável.
- Busca por sócio, endereço, telefone e e-mail.
- Normalização mais robusta de municípios e endereços.
- Resolução robusta de entidades.
- Score de grupo econômico.
- Monitoramento recorrente.
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
- Não reescrever `App.tsx` inteiro sem necessidade.
- Não trocar arquitetura para Neo4j/Elastic/microservices nesta fase.

## Instruções Para Agentes

- Ler `CLAUDE.md`, `PROJECT_HANDOFF.md` e `PROJECT_STATE.md` antes de codar.
- Não reimplementar funcionalidades existentes.
- Economizar contexto: mexer apenas no escopo pedido.
- Implementar por etapas pequenas.
- Sempre rodar `npm run typecheck`/`npm run build` quando houver código.
- Para backend, rodar `cd backend && npm run typecheck && npm run build` quando houver código backend.
- Pedir confirmação para ações destrutivas.
- Não importar novos arquivos da Receita sem pedido explícito e justificativa de produto.