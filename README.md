# Motor de Investigação Empresarial

Este projeto não é um buscador de CNPJ.

É um **Motor de Investigação Empresarial explicável, auditável e orientado a decisão**.

O objetivo é transformar dados cadastrais, dados públicos da Receita Federal e consultas externas em vínculos empresariais, achados interpretáveis, score explicável e dossiês auditáveis.

## Entradas

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

## Saídas

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

- React
- TypeScript
- Vite
- Tailwind

Backend:

- Fastify
- TypeScript
- Supabase como cache operacional
- PostgreSQL local Docker com base Receita Federal

Principais áreas:

- `src/App.tsx`: MVP visual principal.
- `src/services/receita.ts`: busca Receita e estabelecimentos.
- `src/services/investigation.ts`: relatório, achados e score.
- `backend/src/routes/receita.routes.ts`: rotas da Receita local.
- `backend/src/routes/investigation.routes.ts`: rotas de investigação.
- `backend/src/services/investigation.service.ts`: motor inicial de vínculos, achados, score e grafo.

## Estado Atual

Implementado:

- Consulta CNPJ multi-provider via backend.
- Busca Receita por razão social.
- Investigação por CNPJ básico.
- Relações por sócio, telefone, e-mail, endereço e matriz/filiais.
- Resumo Executivo.
- Motor de Achados inicial.
- Score explicável.
- Cards por severidade.
- Evidências iniciais por achado.
- Grafo visual.
- Explorar relações.

## Arquitetura-Alvo

Módulos obrigatórios:

- Núcleo de dados.
- Resolução de entidades.
- Motor de vínculos.
- Motor de achados.
- Score explicável.
- Dossiê probatório.
- Monitoramento.
- Workspace de casos.

## Prioridade Imediata

1. Evidência por vínculo.
2. Dossiê HTML simples.
3. Grafo navegável.
4. Busca unificada por sócio/endereço/telefone/e-mail.
5. Normalização de municípios/endereço.

## Comandos

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

Banco local Receita:

```bash
cd backend
npm run db:up
```

Validação rápida:

```bash
curl http://localhost:3001/health
curl "http://localhost:3001/api/investigation/company/62909728"
```

## Restrições

- Não voltar a tratar o produto como consulta CNPJ.
- Não adicionar campos só por adicionar.
- Não importar mais base sem justificativa de produto.
- Não fazer inferências sem evidência.
- Toda relação precisa ter motivo e fonte.
- Preservar MVP incremental.
