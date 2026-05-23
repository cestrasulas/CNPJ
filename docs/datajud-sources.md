# Spike — API DataJud CNJ (DJ-001)

## Escopo MVP

Consulta **read-only** de processos judiciais candidatos ligados ao CNPJ investigado.

## Fonte

- **DataJud** — API pública CNJ (Resolução CNJ 331/2020)
- Documentação: [datajud-wiki.cnj.jus.br](https://datajud-wiki.cnj.jus.br/)

## Autenticação

- API Key CNJ (cadastro no portal DataJud)
- **Bloqueio:** credencial externa — requer confirmação antes de DJ-002

## Campos úteis

- Número do processo
- Tribunal / grau
- Classe processual
- Partes (quando disponível com documento)
- Data de ajuizamento

## Hipóteses de vínculo (linguagem candidata)

- Parte com CNPJ idêntico → processo **candidato** vinculado à empresa
- Parte só com razão social similar → **não** afirmar vínculo; evidência INFERIDO fraca

## Riscos de overmatching

- Homônimos de razão social
- Processos arquivados ou segredo de justiça parcial
- Latência e indisponibilidade — **não** bloquear investigação principal

## Próximo passo (DJ-002)

Serviço `datajud.service.ts` com timeout, fallback gracioso e seção opcional no relatório.
