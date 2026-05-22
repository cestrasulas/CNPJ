# Estado Atual do Projeto CNPJ — 2026-05-22

## Visão do Produto

Este projeto não é um buscador de CNPJ.

O objetivo oficial é construir um **Motor de Investigação Empresarial explicável, auditável e orientado a decisão**.

O sistema deve receber identificadores empresariais, resolver entidades relacionadas, explicar vínculos, gerar achados com evidências e produzir dossiês que ajudem o usuário a decidir o próximo passo de uma investigação.

Entradas do produto final:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas do produto final:

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
- Motor de achados: converter vínculos em conclusões operacionais explicáveis.
- Score explicável: pontuação com nível, pontos e razões auditáveis.
- Dossiê probatório: HTML/PDF com evidências, trilha de origem e resumo decisório.
- Monitoramento: acompanhar mudanças em empresas, sócios, contatos e novos vínculos.
- Workspace de casos: organizar investigações, favoritos, notas, status e histórico.

## Estado Atual Implementado

Produto/MVP:

- Consulta CNPJ multi-provider via backend.
- Busca Receita por razão social.
- Lista de empresas investigáveis.
- Seleção de empresa e estabelecimentos.
- Botão `Investigar vínculos` quando há dado investigável.
- Relatório de investigação.
- Resumo Executivo.
- Grafo visual funcional.
- Explorar relações por sócio, telefone, e-mail e endereço.
- Motor de Achados inicial.
- `investigationScore` explicável.
- Cards de achados por severidade.
- Evidências iniciais por achado.

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
- GREAT WALL retornou 22 relações, 2 achados e score MEDIUM/55.

## Lacunas Críticas

- Evidência por vínculo individual com fonte, campo e valor.
- Dossiê HTML/PDF.
- Busca por sócio, endereço, telefone e e-mail.
- Normalização de municípios e endereços.
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

## Restrições Atuais

- Não voltar a tratar o produto como consulta CNPJ.
- Não adicionar campos só por adicionar.
- Não importar mais base sem justificativa de produto.
- Não fazer inferências sem evidência.
- Toda relação precisa ter motivo e fonte.
- Preservar MVP incremental.
- Não reimplementar funcionalidades existentes.
- Não alterar contratos sem necessidade.
- Não expor chaves no frontend.

## Instruções Para Agentes

- Ler `CLAUDE.md`, `PROJECT_HANDOFF.md` e `PROJECT_STATE.md` antes de codar.
- Não reanalisar arquitetura quando a tarefa for pontual.
- Economizar contexto.
- Implementar por etapas pequenas.
- Rodar `npm run typecheck` e `npm run build` quando houver alteração frontend.
- Rodar `cd backend && npm run typecheck && npm run build` quando houver alteração backend.
- Pedir confirmação para ações destrutivas.
