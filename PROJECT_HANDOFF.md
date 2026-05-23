# Handoff Técnico — Projeto CNPJ

## Fonte Oficial

Este documento deve ser lido antes de codar, junto com `PROJECT_STATE.md` e `CLAUDE.md`.

Não reimplemente funcionalidades existentes. Não reanalise arquitetura quando a tarefa for pontual. Trabalhe em etapas pequenas e preserve o MVP incremental.

## Nova Direção Oficial

Não estamos construindo um buscador de CNPJ.
Não estamos construindo um "Sniper privado".
Não estamos prometendo UBO automático.
Não estamos prometendo grupo econômico definitivo.
Não estamos prometendo investigação patrimonial.

Estamos construindo um **Motor de Investigação Empresarial Explicável**.

Função: gerar hipóteses investigativas, vínculos candidatos, evidências rastreáveis e dossiês de apoio à decisão a partir de bases públicas e, futuramente, fontes pagas sob demanda.

## Posicionamento do Produto

Camada 1 — Base pública / baixo custo:

- Receita Federal CNPJ público
- CVM Dados Abertos
- DataJud
- outras fontes abertas futuras

Entrega:

- vínculos candidatos
- grupos econômicos candidatos
- força das evidências
- grafo
- dossiê inicial
- limitações claras

Camada 2 — Precisão sob demanda:

- Serpro Consulta CNPJ
- Infosimples
- juntas comerciais
- outras APIs pagas

Entrega:

- enriquecimento
- validação
- aumento de confiança
- redução de falso positivo

Camada 3 — Enterprise futura:

- BigDataCorp
- Orbis
- Sayari
- ONR
- vendors de sanções/mídia/PEP

Entrega:

- due diligence mais robusta
- ownership internacional
- camadas patrimoniais/processuais
- compliance avançado

## Linguagem Obrigatória

Não usar linguagem conclusiva sem evidência documental.

Trocar:

- "risco alto" por "força das evidências alta"
- "grupo econômico identificado" por "grupo econômico candidato"
- "beneficiário final" por "estrutura societária conhecida"
- "comprovado" por "declarado", "inferido" ou "validado", salvo quando houver documento/certidão específica

Usar:

- evidência declarada
- evidência inferida
- evidência validada
- evidência comprovada documentalmente apenas quando houver documento

## Classificação Oficial de Evidência

DECLARADO:
Dado consta em fonte cadastral/oficial, como Receita pública.

INFERIDO:
Relação derivada por regra do sistema, como mesmo telefone, mesmo endereço ou padrão recorrente.

VALIDADO:
Relação reforçada por fonte adicional, como Serpro ou outra API complementar.

COMPROVADO:
Relação sustentada por documento ou certidão específica.

## Score Oficial

Substituir o conceito de "score de risco" por **Força das evidências**:

- BAIXA
- MÉDIA
- ALTA

A força das evidências mede consistência, quantidade e qualidade das evidências disponíveis. Não mede culpa, fraude, patrimônio, controle final ou conclusão jurídica.

## Limitações Sempre Visíveis

- CPF mascarado na base pública.
- Ausência de percentuais societários.
- Ausência de atos societários.
- Ausência de UBO formal.
- Ausência de prova patrimonial.

## Entradas e Saídas

Entradas:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas:

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

## Arquitetura Atual

Frontend:

- React + TypeScript + Vite + Tailwind.
- `src/App.tsx` ainda concentra o MVP.
- `src/services/api.ts` é o cliente HTTP central.
- `src/services/receita.ts` encapsula busca Receita e estabelecimentos.
- `src/services/investigation.ts` encapsula relatório, disponibilidade, achados e score.
- Consulta CNPJ antiga está preservada via backend.

Backend:

- Fastify + TypeScript.
- `backend/src/server.ts` é a entrada.
- `backend/src/routes/companies.routes.ts` mantém consulta CNPJ e relações antigas.
- `backend/src/routes/receita.routes.ts` expõe busca Receita, investigáveis e estabelecimentos.
- `backend/src/routes/investigation.routes.ts` expõe relatório de investigação e disponibilidade.
- `backend/src/services/investigation.service.ts` contém motor inicial de vínculos, achados, score e grafo.
- `backend/src/repositories/receita.repository.ts` consulta PostgreSQL local.

Dados:

- Supabase: cache normalizado de consultas CNPJ.
- PostgreSQL local Docker: base Receita Federal parcial.
- Importadores Receita: ZIP streaming, CSV `;`, encoding `latin1`, batch insert.

## Arquitetura-Alvo

Módulos obrigatórios:

- Núcleo de dados: ingestão, cache, normalização, proveniência e qualidade de fonte.
- Resolução de entidades: consolidar empresas, sócios, contatos e endereços equivalentes.
- Motor de vínculos: detectar relações diretas e indiretas com motivo e fonte.
- Motor de achados: transformar vínculos em hipóteses investigativas explicáveis.
- Força das evidências: nível, motivos, limitações e classificação da evidência.
- Dossiê probatório: HTML/PDF com evidências, vínculos e resumo decisório.
- Monitoramento: acompanhar alterações e novos vínculos.
- Workspace de casos: organizar investigações, histórico, notas e decisões.

## Estado Atual

Implementado:

- Frontend React/Vite.
- Backend Fastify/TypeScript.
- Supabase cache.
- PostgreSQL local Receita.
- Importadores Receita.
- Busca Receita por razão social.
- Lista de investigáveis.
- Investigação por CNPJ básico.
- Relações por sócio, telefone, e-mail, endereço e matriz/filiais.
- Relatório com Resumo Executivo.
- Motor de Achados inicial.
- `investigationScore` atual ainda existe, mas deve evoluir para "força das evidências".
- Cards por severidade.
- Evidências iniciais por achado e por vínculo.
- Grafo visual funcional.
- Explorar relações.

Rotas principais:

- `GET /health`
- `GET /api/companies/:cnpj`
- `GET /api/companies/:cnpj/relations`
- `GET /api/receita/search?q=termo&limit=20`
- `GET /api/receita/investigaveis`
- `GET /api/receita/companies/:cnpjBasico`
- `GET /api/receita/companies/:cnpjBasico/establishments`
- `GET /api/receita/debug/establishments-sample?limit=20`
- `GET /api/investigation/company/:cnpjBasico`
- `GET /api/investigation/company/:cnpjBasico/availability`

## Dados Locais

| Tabela | Registros |
|---|---:|
| `receita_empresas` | 27.628.041 |
| `receita_estabelecimentos` | 100.000 |
| `receita_socios` | 1.187.000 |
| `receita_municipios` | 5.572 |

Cobertura atual:

- STRONG: poucos CNPJs com interseção entre empresas, estabelecimentos e sócios.
- PARTIAL: empresas com estabelecimento, mas sem sócio importado correspondente.
- CADASTRAL: somente empresa.

Causa da baixa cobertura forte: partições `*0.zip` de Empresas, Estabelecimentos e Sócios têm sobreposição pequena.

CNPJs úteis para demo:

- `62909728` — GREAT WALL MOTOR BRASIL COMERCIO LTDA.
- `97543890` — TOLEDO PAULINO SERVICOS EM INFORMATICA LTDA.
- `59698351` — M.S CASA DE CARNES LTDA.
- `58638478` — IMPORLED VARIEDADE EM IMPORTADOS LTDA.

## Lacunas Críticas

- Classificação DECLARADO / INFERIDO / VALIDADO / COMPROVADO em toda evidência.
- Dossiê HTML com seção explícita "Limitações da base".
- Busca por sócio, endereço, telefone e e-mail.
- Normalização de municípios.
- Normalização robusta de endereços.
- Resolução robusta de entidades.
- Força das evidências por grupo econômico candidato.
- Camada Serpro opcional sob demanda.
- CVM e DataJud como fontes abertas complementares.
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
- Não expor API keys no frontend.
- Não chamar providers externos diretamente do frontend.
- Não reescrever `App.tsx` inteiro.
- Não trocar para Neo4j/Elastic/microservices nesta fase.
- Não adicionar biblioteca pesada de grafo sem decisão explícita.

## Comandos Úteis

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

Docker/Postgres Receita:

```bash
cd backend
npm run db:up
npm run db:migrate:receita
```

Testes API:

```bash
curl http://localhost:3001/health
curl "http://localhost:3001/api/receita/search?q=great%20wall&limit=5"
curl "http://localhost:3001/api/receita/investigaveis"
curl "http://localhost:3001/api/investigation/company/62909728"
```

## Instruções Para Agentes

- Ler estes documentos antes de codar.
- Antes de codar, verificar se a tarefa aumenta explicabilidade, evidência, dossiê, busca ou grafo.
- Não reimplementar funcionalidades existentes.
- Economizar contexto.
- Implementar por etapas pequenas.
- Não adicionar campos por adicionar.
- Não importar mais dados sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Sempre rodar typecheck/build quando houver código.
- Pedir confirmação para ações destrutivas.
- Se a tarefa for documentação, não alterar código funcional.
