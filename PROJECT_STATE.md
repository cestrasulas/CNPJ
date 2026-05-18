# Estado atual do projeto CNPJ

Arquitetura:

src/
├── App.tsx
├── services/
│   ├── providers.ts
│   ├── normalizer.ts
│   └── search.ts
├── types/
│   └── cnpj.ts
├── utils/
│   └── formatters.ts

Provedores ativos:

1. CNPJ.ws
2. CNPJá Pública
3. BrasilAPI

Implementado:

✅ consulta por CNPJ
✅ automático/fallback
✅ timeout
✅ favoritos persistentes
✅ histórico persistente
✅ copiar:
- CNPJ
- razão social
- endereço
- email
- JSON

✅ exportação TXT
✅ Google Maps
✅ Google
✅ Receita Federal
✅ JSON tree dinâmica
✅ expandir/recolher
✅ busca local
✅ relacionamentos locais
✅ sócios
✅ telefones múltiplos
✅ emails múltiplos
✅ inscrições estaduais
✅ dados adicionais
✅ MEI
✅ Simples Nacional

Riscos conhecidos:

- App.tsx grande
- normalizer.ts crescendo
- sem backend próprio
- dependência de APIs públicas

Próxima etapa:

ETAPA 3

Implementar:

- comparação empresa x empresa
- exportação CSV
- exportação PDF
- comparação visual
- empresas relacionadas