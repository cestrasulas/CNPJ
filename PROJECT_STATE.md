# Estado atual do projeto CNPJ — 2026-05-18

## Arquitetura

Frontend: React + TypeScript + Vite + Tailwind
Backend: Node + TypeScript + Fastify
Banco 1: Supabase (cache de consultas CNPJ)
Banco 2: PostgreSQL local Docker (base Receita Federal)

```
src/
├── App.tsx                        (~1.500 linhas)
├── services/
│   ├── api.ts                     cliente HTTP base
│   ├── providers.ts               consulta CNPJ multi-provider
│   ├── normalizer.ts              normalização de dados
│   ├── receita.ts                 tipos + funções Receita
│   ├── investigation.ts           tipos + função de relatório
│   ├── search.ts                  busca local
│   └── compare.ts                 comparação de empresas

backend/src/
├── server.ts
├── routes/
│   ├── companies.routes.ts
│   ├── receita.routes.ts
│   └── investigation.routes.ts
├── services/
│   ├── cnpjLookup.service.ts
│   ├── investigation.service.ts
│   └── ...
└── repositories/
    ├── company.repository.ts
    └── receita.repository.ts
```

## Implementado ✅

Consulta CNPJ:
- Consulta por CNPJ com fallback (CNPJ.ws → CNPJá → BrasilAPI)
- Timeout com AbortController
- Histórico persistente (localStorage)
- Favoritos persistentes (localStorage)
- Copiar: CNPJ, razão social, endereço, e-mail
- Exportar TXT
- Google Maps, Google, Receita Federal
- JSON bruto + árvore dinâmica JSON
- Expandir/recolher
- Inscrições estaduais
- Dados adicionais (MEI, Simples Nacional, sócios, telefones, e-mails)

Comparação:
- Comparação empresa x empresa
- Exportação CSV e PDF da comparação
- Score local entre empresas

Motor de Investigação:
- Busca Receita Federal por razão social (27.6M empresas)
- Classificação STRONG / PARTIAL / CADASTRAL com badges visuais
- Endpoint `/api/receita/investigaveis` — apenas CNPJs com dados completos
- Botão "Investigar vínculos" condicional por status
- Relatório executivo: nível LOW/MEDIUM/HIGH, achados automáticos, totais por tipo
- Vínculos: mesmo sócio, mesmo endereço, mesmo telefone, mesmo e-mail
- Grafo de relações (SVG estático)
- Município legível via `receita_municipios` (5.572 municípios)

## Dados Locais (PostgreSQL Docker porta 5433)

| Tabela | Registros |
|---|---|
| `receita_empresas` | 27.628.041 |
| `receita_estabelecimentos` | 100.000 |
| `receita_socios` | 1.187.000 |
| `receita_municipios` | 5.572 |

Cobertura STRONG (empresa + estabelecimento + sócio): **7 CNPJs**
Cobertura PARTIAL (empresa + estabelecimento): ~26.255 CNPJs
Motivo: partições `*0.zip` de cada arquivo têm sobreposição mínima.

CNPJs STRONG disponíveis para demo:
- `62909728` — GREAT WALL MOTOR BRASIL COMERCIO LTDA (22 vínculos, nível HIGH)
- `97543890` — TOLEDO PAULINO SERVICOS EM INFORMATICA LTDA (7 vínculos)
- `59698351` — M.S CASA DE CARNES LTDA
- `58638478` — IMPORLED VARIEDADE EM IMPORTADOS LTDA

## Pendente / Próximos Passos

1. **Importar mais partições** (maior impacto, sem código novo):
   ```bash
   cd backend
   npm run import:estabelecimentos -- /Users/cris/Downloads/2026-05/Estabelecimentos1.zip --limit 500000
   npm run import:socios -- /Users/cris/Downloads/2026-05/Socios1.zip --limit 200000
   ```

2. **Busca por sócio** — rota `GET /api/receita/search/partner?q=nome`

3. **Grafo interativo** — substituir SVG por `@xyflow/react` ou similar

4. **Trigram otimizado** — usar `similarity()` do pg_trgm em vez de `LIKE '%termo%'`

5. **Split do App.tsx** — extrair seções em componentes separados

## Problemas Pendentes

- App.tsx com ~1.500 linhas
- Busca LIKE lenta em escala — índice trigram existe mas não está sendo aproveitado com `%` inicial
- Grafo não interativo
- Sócios têm CPF mascarado (`***558475**`) — limitação da Receita Federal
