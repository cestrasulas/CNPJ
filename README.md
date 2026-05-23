# Motor de Investigação Empresarial Explicável

Este projeto não é um buscador de CNPJ.
Não é um "Sniper privado".
Não promete UBO automático.
Não promete grupo econômico definitivo.
Não promete investigação patrimonial.

O objetivo é gerar hipóteses investigativas, vínculos candidatos, evidências rastreáveis e dossiês de apoio à decisão a partir de bases públicas e, futuramente, fontes pagas sob demanda.

## Entradas

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

## Saídas

- empresas relacionadas
- grupos econômicos candidatos
- vínculos diretos e indiretos
- grafo navegável
- achados de investigação
- força das evidências
- dossiê auditável
- evidências por vínculo
- limitações da base
- monitoramento futuro

## Posicionamento

Camada 1 — Base pública / baixo custo:

- Receita Federal CNPJ público
- CVM Dados Abertos
- DataJud
- outras fontes abertas futuras

Entrega: vínculos candidatos, grupos econômicos candidatos, força das evidências, grafo, dossiê inicial e limitações claras.

Camada 2 — Precisão sob demanda:

- Serpro Consulta CNPJ
- Infosimples
- juntas comerciais
- outras APIs pagas

Entrega: enriquecimento, validação, aumento de confiança e redução de falso positivo.

Camada 3 — Enterprise futura:

- BigDataCorp
- Orbis
- Sayari
- ONR
- vendors de sanções/mídia/PEP

Entrega: due diligence mais robusta, ownership internacional, camadas patrimoniais/processuais e compliance avançado.

## Classificação de Evidência

DECLARADO:
Dado consta em fonte cadastral/oficial, como Receita pública.

INFERIDO:
Relação derivada por regra do sistema, como mesmo telefone, mesmo endereço ou padrão recorrente.

VALIDADO:
Relação reforçada por fonte adicional, como Serpro ou outra API complementar.

COMPROVADO:
Relação sustentada por documento ou certidão específica.

## Força das Evidências

O produto deve usar "força das evidências", não "score de risco":

- BAIXA
- MÉDIA
- ALTA

Esse indicador não comprova UBO, grupo econômico definitivo, patrimônio ou conclusão jurídica.

## Limitações Sempre Visíveis

- CPF mascarado na base pública.
- Ausência de percentuais societários.
- Ausência de atos societários.
- Ausência de UBO formal.
- Ausência de prova patrimonial.

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
- Indicador técnico atual de score, a ser tratado como força das evidências.
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
- Força das evidências.
- Dossiê probatório.
- Monitoramento.
- Workspace de casos.

## Prioridade Imediata

1. Refatorar score para "força das evidências".
2. Adicionar classificação DECLARADO / INFERIDO / VALIDADO / COMPROVADO.
3. Melhorar dossiê HTML com seção "Limitações da base".
4. Grafo navegável.
5. Busca unificada por CNPJ, razão social, sócio, endereço, telefone e e-mail.
6. Camada Serpro opcional sob demanda.
7. CVM e DataJud como fontes abertas complementares.

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
- Não vender como "Sniper privado".
- Não prometer UBO com base pública.
- Não prometer investigação patrimonial.
- Não chamar relação inferida de prova.
- Não usar linguagem conclusiva sem evidência documental.
- Não adicionar campos só por adicionar.
- Não importar mais base sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Sempre diferenciar dado declarado, inferido, validado e comprovado.
- Toda relação precisa ter fonte, motivo, confiança e limitação quando aplicável.
- Preservar MVP incremental.
