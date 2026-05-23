# Projeto CNPJ

## Direção Oficial

Não estamos construindo um buscador de CNPJ.
Não estamos construindo um "Sniper privado".
Não estamos prometendo UBO automático.
Não estamos prometendo grupo econômico definitivo.
Não estamos prometendo investigação patrimonial.

Estamos construindo um **Motor de Investigação Empresarial Explicável**.

Função do produto: gerar hipóteses investigativas, vínculos candidatos, evidências rastreáveis e dossiês de apoio à decisão a partir de bases públicas e, futuramente, fontes pagas sob demanda.

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

## Linguagem Obrigatória

Evitar linguagem conclusiva sem documento.

Trocar:

- "risco alto" por "força das evidências alta"
- "grupo econômico identificado" por "grupo econômico candidato"
- "beneficiário final" por "estrutura societária conhecida"
- "comprovado" por "declarado", "inferido" ou "validado", salvo documento/certidão específica

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

Não usar "score de risco" como conceito do produto.

Usar **Força das evidências**:

- BAIXA
- MÉDIA
- ALTA

Sempre deixar claro que o score mede força e consistência das evidências disponíveis, não conclusão jurídica, patrimonial ou de controle societário.

## Limitações Sempre Visíveis

- CPF mascarado na base pública.
- Ausência de percentuais societários.
- Ausência de atos societários.
- Ausência de UBO formal.
- Ausência de prova patrimonial.

## Stack Atual

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Fastify + TypeScript
- Cache operacional: Supabase
- Base local: PostgreSQL Docker com dados Receita Federal
- Importadores Receita: streaming ZIP/CSV latin1

## Arquitetura Atual

- `src/App.tsx` ainda concentra a UI principal.
- `src/services/api.ts` centraliza HTTP.
- `src/services/receita.ts` acessa busca e estabelecimentos Receita.
- `src/services/investigation.ts` acessa relatório, achados e disponibilidade.
- `backend/src/routes/investigation.routes.ts` expõe investigação.
- `backend/src/services/investigation.service.ts` contém motor inicial de vínculos, achados, força das evidências e grafo.

## Prioridade Imediata

1. Refatorar score para "força das evidências".
2. Adicionar classificação DECLARADO / INFERIDO / VALIDADO / COMPROVADO.
3. Melhorar dossiê HTML com seção "Limitações da base".
4. Grafo navegável.
5. Busca unificada por CNPJ, razão social, sócio, endereço, telefone e e-mail.
6. Camada Serpro opcional sob demanda.
7. CVM e DataJud como fontes abertas complementares.

## Restrições

- Não usar linguagem conclusiva sem evidência documental.
- Não chamar relação inferida de prova.
- Não prometer UBO com base pública.
- Não prometer investigação patrimonial.
- Não vender como "Sniper privado".
- Sempre diferenciar dado declarado, inferido, validado e comprovado.
- Toda relação precisa ter fonte, motivo, confiança e limitação quando aplicável.
- Não adicionar campos por adicionar.
- Não importar mais dados sem justificativa de produto.
- Não fazer inferências fortes sobre pessoas físicas com nome comum e CPF mascarado.
- Preservar MVP incremental.

## Instruções Para Agentes

- Ler `CLAUDE.md`, `PROJECT_HANDOFF.md` e `PROJECT_STATE.md` antes de codar.
- Antes de codar, verificar se a tarefa aumenta explicabilidade, evidência, dossiê, busca ou grafo.
- Não reimplementar funcionalidades existentes.
- Economizar contexto: mexer apenas no escopo pedido.
- Implementar por etapas pequenas.
- Rodar build/typecheck quando houver código.
- Para backend, rodar `cd backend && npm run typecheck && npm run build` quando houver código backend.
- Pedir confirmação para ações destrutivas.