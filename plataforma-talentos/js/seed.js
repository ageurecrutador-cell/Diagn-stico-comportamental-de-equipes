/* Dados de demonstração: carregados só na primeira visita.
   São candidatos fictícios para a área da empresa testar busca e match. */
window.SEED_CANDIDATES = [
  {
    id: "demo-ana",
    role: "candidate",
    email: "ana.demo@talenthub.app",
    password: "demo",
    name: "Ana Beatriz Ferreira",
    photo: "",
    headline: "Desenvolvedora Front-end Sênior",
    area: "Tecnologia",
    location: "São Paulo, SP",
    status: "aberto",
    about: "7 anos criando interfaces performáticas. Apaixonada por design systems e acessibilidade.",
    skills: ["React", "TypeScript", "Next.js", "Design System", "Acessibilidade", "CSS", "Node.js"],
    academics: [
      { title: "Bacharel em Ciência da Computação", org: "USP", period: "2013 — 2017" }
    ],
    experiences: [
      { role: "Front-end Sênior", org: "Fintech Nubari", period: "2020 — atual", desc: "Liderei a migração para Next.js, reduzindo tempo de carregamento em 40%." },
      { role: "Front-end Pleno", org: "Agência Pixel", period: "2017 — 2020", desc: "Desenvolvi sites e e-commerces para mais de 30 clientes." }
    ],
    cases: [
      { title: "Design System corporativo", desc: "Criei do zero um DS usado por 6 squads, acelerando entregas em 2x." }
    ],
    contact: { phone: "(11) 90000-0001", linkedin: "linkedin.com/in/ana-demo", email: "ana.demo@talenthub.app" },
    visibility: "public",
    accessPassword: ""
  },
  {
    id: "demo-carlos",
    role: "candidate",
    email: "carlos.demo@talenthub.app",
    password: "demo",
    name: "Carlos Henrique Souza",
    photo: "",
    headline: "Analista de Dados / BI",
    area: "Dados & Analytics",
    location: "Belo Horizonte, MG",
    status: "desempregado",
    about: "Transformo dados em decisão. Forte em SQL, Python e storytelling de dados.",
    skills: ["SQL", "Python", "Power BI", "Looker", "ETL", "Estatística", "Pandas"],
    academics: [
      { title: "Estatística", org: "UFMG", period: "2014 — 2018" },
      { title: "Pós em Data Science", org: "PUC Minas", period: "2019 — 2020" }
    ],
    experiences: [
      { role: "Analista de BI Pleno", org: "Varejo Mais", period: "2019 — 2024", desc: "Construí dashboards de vendas que aumentaram a conversão em 18%." }
    ],
    cases: [
      { title: "Previsão de demanda", desc: "Modelo que reduziu rupturas de estoque em 25%." }
    ],
    contact: { phone: "(31) 90000-0002", linkedin: "linkedin.com/in/carlos-demo", email: "carlos.demo@talenthub.app" },
    visibility: "public",
    accessPassword: ""
  },
  {
    id: "demo-julia",
    role: "candidate",
    email: "julia.demo@talenthub.app",
    password: "demo",
    name: "Júlia Mendonça",
    photo: "",
    headline: "Designer de Produto (UX/UI)",
    area: "Design",
    location: "Remoto",
    status: "empregado",
    about: "Designer orientada a problema e a métricas. Pesquisa, protótipo e valido com usuários reais.",
    skills: ["Figma", "UX Research", "Prototipagem", "Design System", "UI", "Usabilidade"],
    academics: [
      { title: "Design Gráfico", org: "UFPR", period: "2015 — 2019" }
    ],
    experiences: [
      { role: "Product Designer", org: "SaaS Flow", period: "2021 — atual", desc: "Redesenhei o onboarding e aumentei a ativação em 30%." }
    ],
    cases: [
      { title: "App de saúde", desc: "Pesquisa com 40 usuários resultou em NPS +22." }
    ],
    contact: { phone: "(41) 90000-0003", linkedin: "linkedin.com/in/julia-demo", email: "julia.demo@talenthub.app" },
    visibility: "public",
    accessPassword: ""
  },
  {
    id: "demo-rafael",
    role: "candidate",
    email: "rafael.demo@talenthub.app",
    password: "demo",
    name: "Rafael Oliveira Lima",
    photo: "",
    headline: "Engenheiro de Software Back-end",
    area: "Tecnologia",
    location: "Recife, PE",
    status: "aberto",
    about: "Especialista em sistemas distribuídos e APIs de alta escala.",
    skills: ["Node.js", "Go", "PostgreSQL", "Kubernetes", "AWS", "Microserviços", "TypeScript"],
    academics: [
      { title: "Engenharia de Computação", org: "UFPE", period: "2012 — 2017" }
    ],
    experiences: [
      { role: "Engenheiro Sênior", org: "LogTech", period: "2019 — atual", desc: "Arquitetei plataforma que processa 2M de eventos/dia." }
    ],
    cases: [
      { title: "Migração para microserviços", desc: "Reduzi custo de infra em 35% e aumentei disponibilidade para 99,95%." }
    ],
    contact: { phone: "(81) 90000-0004", linkedin: "linkedin.com/in/rafael-demo", email: "rafael.demo@talenthub.app" },
    visibility: "public",
    accessPassword: ""
  },
  {
    id: "demo-marina",
    role: "candidate",
    email: "marina.demo@talenthub.app",
    password: "demo",
    name: "Marina Costa",
    photo: "",
    headline: "Analista de Marketing Digital",
    area: "Marketing",
    location: "Rio de Janeiro, RJ",
    status: "desempregado",
    about: "Performance, conteúdo e CRM. Gosto de testar, medir e escalar o que funciona.",
    skills: ["Google Ads", "Meta Ads", "SEO", "CRM", "Inbound", "Analytics", "Copywriting"],
    academics: [
      { title: "Publicidade e Propaganda", org: "ESPM", period: "2016 — 2020" }
    ],
    experiences: [
      { role: "Analista de Marketing", org: "EduStartup", period: "2020 — 2024", desc: "Gestão de mídia paga com ROAS médio de 6x." }
    ],
    cases: [
      { title: "Lançamento de curso", desc: "Campanha que gerou R$ 480 mil em 10 dias." }
    ],
    contact: { phone: "(21) 90000-0005", linkedin: "linkedin.com/in/marina-demo", email: "marina.demo@talenthub.app" },
    visibility: "public",
    accessPassword: ""
  }
];
