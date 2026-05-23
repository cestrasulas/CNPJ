# Modelo RBAC MVP (RB-001)

## Papéis

| Papel | Descrição |
|-------|-----------|
| **viewer** | Lê investigações e dossiês |
| **analyst** | Cria casos, dispara enrich sob demanda |
| **admin** | Gerencia watches, usuários, flags |

## Matriz rota × papel

| Rota | viewer | analyst | admin |
|------|--------|---------|-------|
| `GET /api/investigation/*` | ✓ | ✓ | ✓ |
| `GET /api/search` | ✓ | ✓ | ✓ |
| `GET /api/receita/*` | ✓ | ✓ | ✓ |
| `POST /api/cases` | — | ✓ | ✓ |
| `POST .../enrich/serpro` | — | ✓ | ✓ |
| `POST /api/watch` | — | ✓ | ✓ |
| Admin / flags | — | — | ✓ |

## MVP local

- `AUTH_DISABLED=true` em dev (sem token)
- Supabase Auth JWT em produção (RB-002)

## Decisão pendente

Confirmar Supabase Auth vs API key interna antes de RB-002.
