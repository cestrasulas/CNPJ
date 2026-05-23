# Estado Atual do Projeto CNPJ — 2026-05-22

## Visão do Produto

Este projeto não é um buscador de CNPJ.
Não é um "Sniper privado".
Não promete UBO automático.
Não promete grupo econômico definitivo.
Não promete investigação patrimonial.

O objetivo oficial é construir um **Motor de Investigação Empresarial Explicável**.

O sistema deve gerar hipóteses investigativas, vínculos candidatos, evidências rastreáveis e dossiês de apoio à decisão a partir de bases públicas e, futuramente, fontes pagas sob demanda.

Entradas do produto final:

- CNPJ
- razão social
- sócio
- endereço
- telefone
- e-mail

Saídas do produto final:

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

## Posicionamento por Camadas

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

## Linguagem Oficial

Trocar linguagem conclusiva por linguagem de evidência:

- "risco alto" -> "força das evidências alta"
- "grupo econômico identificado" -> "grupo econômico candidato"
- "beneficiário final" -> "estrutura societária conhecida"
- "comprovado" -> "declarado", "inferido" ou "validado", exceto quando houver documento/certidão específica

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

O conceito de "score de risco" deve ser substituído por **Força das evidências**:

- BAIXA
- MÉDIA
- ALTA

Esse indicador mede a consistência das evidências disponíveis, não conclusão jurídica, patrimonial, societária final ou UBO.

## Limitações Sempre Visíveis

- CPF mascarado na base pública.
- Ausência de percentuais societários.
- Ausência de atos societários.
- Ausência de UBO formal.
- Ausência de prova patrimonial.

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
- Motor de achados: converter vínculos em hipóteses investigativas explicáveis.
- Força das evidências: nível BAIXA/MÉDIA/ALTA, motivos, fontes e limitações.
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
- `investigationScore` técnico atual, a ser renomeado conceitualmente para "força das evidências".
- Cards de achados por severidade.
- Evidências iniciais por achado e vínculo.

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
- GREAT WALL retornou 22 relações, 2 achados e indicador técnico MEDIUM/55. A linguagem de produto deve tratar isso como força das evidências, não risco.

## Lacunas Críticas

- Classificação DECLARADO / INFERIDO / VALIDADO / COMPROVADO.
- Dossiê HTML com seção "Limitações da base".
- Busca por sócio, endereço, telefone e e-mail.
- Normalização de municípios e endereços.
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

## Restrições Atuais

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
- Não reimplementar funcionalidades existentes.
- Não alterar contratos sem necessidade.
- Não expor chaves no frontend.

## Instruções Para Agentes

- Ler `CLAUDE.md`, `PROJECT_HANDOFF.md` e `PROJECT_STATE.md` antes de codar.
- Antes de codar, verificar se a tarefa aumenta explicabilidade, evidência, dossiê, busca ou grafo.
- Não reanalisar arquitetura quando a tarefa for pontual.
- Economizar contexto.
- Implementar por etapas pequenas.
- Não adicionar campos por adicionar.
- Não importar mais dados sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Rodar `npm run typecheck` e `npm run build` quando houver alteração frontend.
- Rodar `cd backend && npm run typecheck && npm run build` quando houver alteração backend.
- Pedir confirmação para ações destrutivas.
