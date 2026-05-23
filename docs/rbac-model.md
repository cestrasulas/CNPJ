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

- `AUTH_DISABLED=true` em dev (sem token) — **padrão** no backend
- Supabase Auth JWT quando `AUTH_DISABLED=false` (RB-002 implementado)

## RB-002 (implementado)

- Middleware `requireAuth` em `backend/src/middleware/auth.ts`
- Rotas `/api/cases/*` protegidas quando auth ativa
- Header: `Authorization: Bearer <supabase_jwt>`
- `GET /health` expõe `authDisabled` para diagnóstico
