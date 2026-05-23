# Spike — Exportação PDF do dossiê (PDF-001)

## Objetivo

Escolher estratégia para `GET /api/investigation/company/:cnpjBasico/dossier.pdf` sem adicionar dependência pesada sem decisão.

## Opções

| Opção | Prós | Contras |
|-------|------|---------|
| **A. HTML existente + `window.print()` no frontend** | Zero dependência backend; MVP rápido | Usuário usa "Salvar como PDF"; não é download automático |
| **B. Puppeteer/Playwright no backend** | PDF fiel ao HTML; download direto | Chromium ~150MB; memória alta; lento em serverless |
| **C. `pdf-lib` / pdfkit (layout programático)** | Leve; previsível | Reimplementar layout do dossiê; duplicação |
| **D. Serviço externo (Gotenberg, Browserless)** | Escala; isolamento | Infra extra; custo; fora do MVP local |

## Recomendação MVP

1. **Curto prazo (PDF-002a):** botão "Imprimir / Salvar PDF" abre dossiê HTML com CSS `@media print` — sem nova dependência.
2. **Médio prazo (PDF-002b):** se download server-side for obrigatório, usar **Gotenberg** em container Docker separado (não embutir Puppeteer no backend Fastify).

## Dependências estimadas (opção B — se aprovada)

- `puppeteer` ou `puppeteer-core` + Chrome
- ~150–300 MB node_modules
- Timeout 10–30s por dossiê

## Critérios para PDF-002

- Mesmo conteúdo do HTML (limitações, entityConfidence, seções por tipo)
- `Content-Type: application/pdf`
- Não bloquear investigação se PDF falhar

## Decisão pendente

Aguardar confirmação do usuário antes de adicionar Puppeteer ou Gotenberg.
