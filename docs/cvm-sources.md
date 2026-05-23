# Spike — Fontes CVM Dados Abertos (CVM-001)

## Datasets prioritários para MVP

| Dataset | URL / portal | Uso investigativo |
|---------|----------------|-------------------|
| **Cadastro CVM (companhias abertas)** | [dados.cvm.gov.br](https://dados.cvm.gov.br/) | Empresas registradas; cruzamento por CNPJ |
| **Informes trimestrais / ITR** | Dados abertos CVM | Contexto cadastral; **não** prova de vínculo societário |
| **Participações relevantes** | Formulários de referência | Hipótese de participação — classificação VALIDADO apenas após match explícito |

## Campos úteis

- CNPJ da companhia
- Razão social / denominação
- Situação do registro
- Ticker (quando aplicável)

## Hipóteses de vínculo (linguagem candidata)

- Mesmo CNPJ na CVM + Receita → reforço cadastral (DECLARADO/VALIDADO)
- Mesmo nome sem CNPJ → **não** inferir identidade

## Riscos

- Rate limit e formato CSV/ZIP variável
- Import em massa **não** necessário no MVP — consulta sob demanda ou cache Supabase

## Próximo passo (CVM-002)

Adapter read-only com feature flag; achado opcional `cvm_registration` no relatório.
