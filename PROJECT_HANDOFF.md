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
- Busca Receita Federal por razão social com badges de investigabilidade.
- Botão "Ver investigáveis" retorna apenas empresas STRONG.
- Botão "Investigar vínculos" condicional por status (STRONG/PARTIAL/CADASTRAL).
- Relatório de investigação com Resumo Executivo, sócios, relações e grafo.
- Nome do município legível nos estabelecimentos (via `receita_municipios`).
- Classificação STRONG / PARTIAL / CADASTRAL com badges visuais.

Backend:

- Consulta CNPJ via backend.
- Cache Supabase.
- Providers externos protegidos no backend.
- Busca Receita local com `statusInvestigacao`, `temSocio`, `temEstabelecimento`.
- Endpoint `GET /api/receita/investigaveis` — retorna apenas CNPJs STRONG.
- Detalhe por CNPJ básico.
- Estabelecimentos com `municipioNome` via join `receita_municipios`.
- Relatório de investigação com `investigationLevel`, `keyFindings`, totais por tipo de vínculo.
- Grafo com label de município legível.

## Dados Locais

| Tabela | Registros |
|---|---|
| `receita_empresas` | 27.628.041 |
| `receita_estabelecimentos` | 100.000 |
| `receita_socios` | 1.187.000 |
| `receita_municipios` | 5.572 |

Cobertura de investigabilidade:
- **STRONG** (empresa + sócio): 7 CNPJs — interseção das 3 tabelas
- **PARTIAL** (empresa + estabelecimento): ~26.255 CNPJs
- **CADASTRAL** (só empresa): restante dos 27.6M

Causa raiz da baixa cobertura STRONG: `Empresas0.zip`, `Estabelecimentos0.zip` e `Socios0.zip` são partições diferentes da Receita — CNPJs básicos não se sobrepõem bem entre arquivos `*0.zip`.

## Últimas Alterações (2026-05-18)

- `backend/src/repositories/receita.repository.ts` — join com `receita_municipios`; `municipio_nome` em estabelecimentos e sample; EXISTS subqueries na busca; função `listInvestigaveis`
- `backend/src/routes/receita.routes.ts` — `statusInvestigacao` (STRONG/PARTIAL/CADASTRAL); `municipioNome` nos mappers; endpoint `/api/receita/investigaveis`
- `backend/src/services/investigation.service.ts` — `investigationLevel`, `keyFindings`, totais por tipo; join `receita_municipios`; `municipioNome` no type e no grafo
- `backend/src/importers/receita/import-municipios.ts` — importador leve para `Municipios.zip`
- `backend/receita/migrations/002_municipios.sql` — schema `receita_municipios`
- `src/services/receita.ts` — tipo `StatusInvestigacao = "STRONG"|"PARTIAL"|"CADASTRAL"`; `municipioNome` em `ReceitaEstabelecimento`; `listarInvestigaveis()`
- `src/services/investigation.ts` — novos campos em `summary`
- `src/App.tsx` — `BadgeInvestigacao`, botão condicional, Resumo Executivo, `municipioNome` nos cards

## Diagnósticos Concluídos

- **INNER JOIN no sample**: `LEFT JOIN` expunha 73.745 estabelecimentos sem empresa → corrigido para INNER JOIN
- **Partners vazios**: CNPJs do sample (`00114011`) não existiam em `receita_empresas` — problema de particionamento entre ZIPs
- **Cobertura real**: apenas 7 CNPJs nas 3 tabelas simultaneamente — normal para importação de `*0.zip` de cada arquivo

## Próximos Passos Prioritários

1. **Importar mais partições** para aumentar cobertura STRONG:
   ```bash
   npm run import:estabelecimentos -- /Users/cris/Downloads/2026-05/Estabelecimentos1.zip --limit 500000
   npm run import:socios -- /Users/cris/Downloads/2026-05/Socios1.zip --limit 200000
   ```
   Isso aumentará o número de CNPJs STRONG significativamente.

2. **Busca por sócio** — nova rota `GET /api/receita/search/partner?q=nome`:
   - Busca em `receita_socios.nome_socio_normalizado`
   - Retorna empresas relacionadas ao sócio

3. **Grafo interativo** — substituir SVG estático por biblioteca leve (ex: `@xyflow/react` já no ecossistema React) sem bibliotecas pesadas.

4. **Trigram na busca** — atual `LIKE '%termo%'` é lento em 27M registros. Ativar índice GIN trigram já criado em `razao_social_normalizada`.

## Problemas Pendentes

- `App.tsx` com ~1.500 linhas — mistura muitas responsabilidades, candidato a split em componentes.
- Busca por razão social pode ser lenta em 27M registros com LIKE — índice trigram está no schema mas a query não usa `%` inicial otimizado.
- Grafo é visual simples (SVG estático), não interativo.
- Sócios mostram documento mascarado (`***558475**`) — correto pela Receita, mas limita investigação por CPF.

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
npm run import:municipios -- /Users/cris/Downloads/2026-05/Municipios.zip
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

MVP funcional com Motor de Investigação Empresarial operacional:

- Busca nome empresarial na Receita local (27.6M empresas).
- Classificação de investigabilidade STRONG/PARTIAL/CADASTRAL com badges.
- “Ver investigáveis” retorna empresas com dados completos para investigação.
- Relatório executivo com nível LOW/MEDIUM/HIGH, achados automáticos, totais por tipo de vínculo.
- Vínculos reais por sócio em comum, endereço, telefone e e-mail.
- Município legível (SAO PAULO em vez de 7107) via tabela `receita_municipios` (5.572 municípios).
- Grafo de relações funcional (SVG estático).
- Backend centraliza providers, cache Supabase e base Receita local.

Gargalo atual: cobertura STRONG é de apenas 7 CNPJs por sobreposição insuficiente entre partições `*0.zip`. Importar `*1.zip` de cada arquivo resolve.
