# Handoff Técnico — Projeto CNPJ

## Produto

Objetivo real: transformar consulta de CNPJ em um **Motor de Investigação Empresarial**.

Proposta de valor:

- Consultar CNPJ.
- Buscar empresas por razão social na base pública da Receita.
- Explorar estabelecimentos, matriz/filiais e vínculos.
- Gerar relatório simples de investigação.
- Visualizar grafo básico de relações empresariais.

Fluxo principal:

1. Usuário busca por razão social na base Receita.
2. Seleciona uma empresa.
3. Visualiza estabelecimentos importados.
4. Clica em `Consultar CNPJ` para abrir consulta completa.
5. Clica em `Investigar vínculos` para ver relatório, relações e grafo.

## Arquitetura

Frontend:

- React + TypeScript + Vite + Tailwind.
- Arquivo principal ainda é `src/App.tsx`.
- Cliente HTTP central: `src/services/api.ts`.
- Busca Receita: `src/services/receita.ts`.
- Investigação: `src/services/investigation.ts`.
- Consulta CNPJ preservada via backend local.

Backend:

- Node + TypeScript + Fastify.
- Entrada: `backend/src/server.ts`.
- CORS configurado para `localhost:5173`, `5174`, `5175`.
- Supabase usado como cache da consulta CNPJ.
- PostgreSQL local Docker usado para base Receita.

Banco:

- Supabase: cache normalizado de consultas CNPJ.
- PostgreSQL local: base pública Receita importada parcialmente.

Cache:

- Rota `GET /api/companies/:cnpj` consulta Supabase.
- Retorna `cache: hit | miss | stale`.

Importadores:

- ZIP Receita em streaming.
- CSV com separador `;`, encoding `latin1`.
- Batch insert com transação por batch.
- Importadores em `backend/src/importers/receita/`.

Investigação:

- Rota `GET /api/investigation/company/:cnpjBasico`.
- Usa apenas dados locais já importados.
- Retorna relatório parcial se faltar sócio/estabelecimento.

## Estrutura De Arquivos Importantes

Frontend:

- `src/App.tsx`
- `src/services/api.ts`
- `src/services/providers.ts`
- `src/services/normalizer.ts`
- `src/services/receita.ts`
- `src/services/investigation.ts`
- `src/services/search.ts`
- `src/services/compare.ts`
- `src/types/cnpj.ts`

Backend:

- `backend/src/server.ts`
- `backend/src/routes/companies.routes.ts`
- `backend/src/routes/receita.routes.ts`
- `backend/src/routes/investigation.routes.ts`
- `backend/src/services/cnpjLookup.service.ts`
- `backend/src/services/normalizer.service.ts`
- `backend/src/services/provider.service.ts`
- `backend/src/services/relationship.service.ts`
- `backend/src/services/investigation.service.ts`
- `backend/src/repositories/company.repository.ts`
- `backend/src/repositories/receita.repository.ts`
- `backend/src/lib/supabase.ts`
- `backend/src/lib/receitaDb.ts`
- `backend/docker-compose.yml`
- `backend/receita/migrations/001_receita_schema.sql`

## Rotas Existentes

Backend CNPJ:

- `GET /health`
- `GET /api/companies/:cnpj`
- `GET /api/companies/:cnpj/relations`

Receita:

- `GET /api/receita/search?q=termo&limit=20`
- `GET /api/receita/companies/:cnpjBasico`
- `GET /api/receita/companies/:cnpjBasico/establishments`
- `GET /api/receita/debug/establishments-sample?limit=20`

Investigação:

- `GET /api/investigation/company/:cnpjBasico`

## Banco De Dados

Supabase:

- `companies`
- `company_addresses`
- `company_contacts`
- `people`
- `company_partners`
- `company_cnaes`

PostgreSQL local Receita:

- `receita_empresas`
- `receita_estabelecimentos`
- `receita_socios`

Índices principais:

- `receita_empresas(cnpj_basico)`
- trigram em `razao_social_normalizada`
- `receita_estabelecimentos(cnpj_basico)`
- unique `receita_estabelecimentos(cnpj)`
- telefone, email, endereço normalizado
- CNAE
- município/UF
- `receita_socios(cnpj_basico)`
- trigram em `nome_socio_normalizado`

## Receita Federal

Arquivos considerados:

- `Empresas0.zip`
- `Estabelecimentos0.zip`
- `Socios0.zip`

Importado:

- `receita_empresas`: cerca de `27.628.041` linhas no volume local atual.
- `receita_estabelecimentos`: amostra parcial. Em um momento estava `0`; depois já havia amostras retornando em `/debug/establishments-sample`.
- `receita_socios`: importador antigo rodou além do desejado, chegando no log a cerca de `1.187.000` linhas antes de ser parado.

Importadores:

- `import-estabelecimentos.ts` aceita `--limit`.
- `import-socios.ts` agora aceita `--limit`.
- Observação: se quiser amostra limpa de sócios, limpar tabela e reimportar com `--limit 100000`.

## Funcionalidades Prontas

Frontend:

- Consulta CNPJ.
- Histórico local.
- Favoritos locais.
- Copiar campos.
- Google Maps, Google e Receita Federal.
- Exportar TXT.
- Ver JSON e árvore JSON.
- Busca local avançada.
- Dados adicionais.
- Comparação empresa x empresa.
- Exportação CSV/PDF da comparação.
- Score local entre empresas consultadas.
- Busca Receita Federal por razão social.
- Ver amostras úteis de estabelecimentos.
- Clicar amostra carrega estabelecimentos.
- Botão `Consultar CNPJ` em estabelecimento.
- Botão `Investigar vínculos`.
- Relatório de investigação com resumo, sócios, relações e grafo simples.

Backend:

- Consulta CNPJ via backend.
- Cache Supabase.
- Providers externos protegidos no backend.
- Busca Receita local.
- Detalhe por CNPJ básico.
- Estabelecimentos por CNPJ básico.
- Amostra de estabelecimentos.
- Relatório de investigação.

## Problemas Atuais

- `App.tsx` está grande.
- `normalizer.ts` e backend normalizer cresceram.
- `receita_socios` pode ter importado mais do que o planejado.
- Base Receita está parcial.
- Municípios aparecem como códigos da Receita, não nomes.
- Relações ainda limitadas pela amostra importada.
- Grafo é visual simples, não interativo tipo Obsidian real.
- Busca Receita usa `LIKE '%termo%'`, pode ficar lenta com volume grande.
- Frontend ainda mistura muitas responsabilidades.

## Próxima Tarefa Prioritária

Prioridade recomendada:

1. Limpar/reimportar `receita_socios` com limite controlado se quiser amostra consistente:

```bash
npm run import:socios -- /Users/cris/Downloads/2026-05/Socios0.zip --limit 100000
```

2. Melhorar relatório de investigação usando os sócios importados:

- testar CNPJs que tenham sócios na amostra;
- validar `same_partner`;
- exibir empresas relacionadas por sócio com mais destaque.

3. Opcional em seguida:

- criar busca por sócio;
- melhorar grafo;
- mapear códigos de município para nomes.

## Restrições

Não alterar agora:

- Consulta CNPJ antiga.
- Contratos já existentes das rotas.
- Frontend para chamar providers externos diretamente.
- Chaves no frontend.
- Importar base inteira.
- Adicionar biblioteca pesada de grafo.
- Reescrever `App.tsx` inteiro.
- Trocar arquitetura para Neo4j/Elastic/microservices.

## Comandos Úteis

Frontend:

```bash
npm run dev
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

Importação:

```bash
npm run import:empresas -- /Users/cris/Downloads/2026-05/Empresas0.zip
npm run import:estabelecimentos -- /Users/cris/Downloads/2026-05/Estabelecimentos0.zip --limit 500000
npm run import:socios -- /Users/cris/Downloads/2026-05/Socios0.zip --limit 100000
```

Testes API:

```bash
curl http://localhost:3001/health
curl "http://localhost:3001/api/receita/search?q=itacamp&limit=5"
curl "http://localhost:3001/api/receita/debug/establishments-sample?limit=5"
curl "http://localhost:3001/api/receita/companies/00114011/establishments"
curl "http://localhost:3001/api/investigation/company/00114011"
```

Se colar curl no terminal e aparecer `zsh: bad pattern`, rode com aspas:

```bash
curl "http://localhost:3001/api/investigation/company/00114011"
```

## Estado Atual Do MVP

O MVP já demonstra valor de produto:

- Busca nome empresarial na Receita local.
- Mostra estabelecimentos quando existem na amostra.
- Permite consultar CNPJ completo.
- Gera relatório de investigação parcial.
- Mostra grafo simples.
- Backend já centraliza providers/cache.
- Receita local já alimenta busca e investigação.

Ainda não é “grafo completo”, mas já é um **MVP funcional de investigação empresarial incremental**.
