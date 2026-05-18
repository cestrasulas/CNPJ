# Projeto CNPJ

## Stack

- React
- TypeScript
- Tailwind
- Vite

## Arquitetura

src/
├── services/
├── types/
├── utils/
├── App.tsx

## Provedores

- CNPJ.ws
- CNPJá Pública
- BrasilAPI

## Funcionalidades existentes

- Consulta por CNPJ
- Modo automático com fallback
- Histórico persistente
- Favoritos persistentes
- Copiar:
  - CNPJ
  - Razão social
  - Endereço
  - E-mail
- Google Maps
- Exportar TXT
- JSON bruto
- Árvore dinâmica JSON
- Expandir/Recolher tudo
- Timeout com AbortController
- Inscrições estaduais

## Restrições

- Não instalar bibliotecas sem necessidade
- Não expor API keys no frontend
- Não recriar arquivos existentes
- Não reescrever App.tsx inteiro
- Alterar apenas arquivos necessários
- Manter funcionalidades existentes
- Rodar npm run build após alterações

## Objetivo do produto

Ferramenta operacional de inteligência empresarial:

Não apenas consultar CNPJ.

Evoluir para:

- pesquisa por razão social
- pesquisa por sócio
- pesquisa por CNAE
- navegação entre empresas relacionadas