# TalentHub — Vitrine de Talentos

Rede social de currículos: candidatos publicam seu perfil profissional (foto,
formação, experiências, cases de sucesso, skills e status de disponibilidade) e
empresas encontram talentos por filtros e por **match com IA**.

É um **protótipo 100% front-end** (HTML + CSS + JavaScript puro). Não precisa de
servidor nem instalação: os dados são salvos no `localStorage` do próprio
navegador.

## Como rodar

- **Localmente:** abra `index.html` no navegador. (Para o upload de foto e o
  roteamento funcionarem sem travas, pode servir a pasta com um servidor simples:
  `python3 -m http.server` e acesse `http://localhost:8000/`.)
- **Publicar grátis:** suba a pasta no **GitHub Pages**, Netlify ou Vercel. Como
  é tudo estático, funciona direto.

## Funcionalidades

| Recurso | Descrição |
|---|---|
| Conta gratuita | Cadastro com qualquer e-mail, como **candidato** ou **empresa** |
| Perfil / currículo | Foto, título, área, localização, resumo, skills, formação acadêmica, experiências e cases de sucesso |
| Status | Empregado · Buscando recolocação · Aberto a propostas |
| Visibilidade | Perfil **público** na vitrine **ou protegido por senha** de acesso |
| Link compartilhável | Cada perfil tem URL própria (`#/perfil/<id>`) |
| Busca para empresas | Filtros por palavra-chave/skill, área, status e localização |
| Match com IA | A empresa descreve a vaga e o sistema ranqueia os candidatos compatíveis, com contato |
| Privacidade de contato | Telefone/e-mail aparecem para empresas cadastradas |

## Contas de demonstração

Já vêm 5 candidatos fictícios para testar busca e match. Para entrar como um
deles: e-mail `ana.demo@talenthub.app` (ou carlos/julia/rafael/marina) e senha
`demo`.

## Estrutura

```
plataforma-talentos/
├── index.html        # shell da página
├── css/styles.css    # estilos (tema escuro)
└── js/
    ├── seed.js       # candidatos de demonstração
    └── app.js        # SPA: store, auth, rotas, perfil, busca e match
```

## Observações / próximos passos

- Este protótipo guarda tudo **no navegador** (um usuário por dispositivo). Para
  virar produto real multiusuário é preciso um **backend** (autenticação, banco
  de dados) — p. ex. Supabase, Firebase ou uma API própria.
- O **match "com IA"** usa um algoritmo local de pontuação (sobreposição de
  skills + texto + área + status). Pode ser substituído por um modelo de
  linguagem real (ex.: API Claude) quando houver backend.
- Senhas e dados aqui **não são seguros** — é demonstração. Em produção, use
  hashing de senha e HTTPS.
