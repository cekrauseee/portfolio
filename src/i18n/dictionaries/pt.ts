import type { Dictionary } from "@/i18n/dictionary";

export const pt: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "sou engenheiro de software em lisboa. crio produtos, interfaces e ferramentas para pessoas e agentes de ia.",
    role: "engenheiro de software",
    location: "lisboa",
  },
  navigation: {
    primaryLinks: "links principais",
    preferencesNavigation: "preferências",
    languageNavigation: "idioma",
    appearanceNavigation: "aparência",
    externalLinkNewTab: " (abre em uma nova aba)",
    languages: { en: "english", pt: "português", ja: "日本語" },
    appearance: { system: "sistema", light: "claro", dark: "escuro" },
  },
  home: {
    projects: "projetos",
    bio: {
      intro:
        "sou engenheiro de software em lisboa. crio produtos, interfaces e ferramentas para pessoas e agentes de ia.",
      process:
        "gosto de tirar ideias do papel e cuidar dos detalhes que fazem diferença para quem usa.",
      interests:
        "trabalho principalmente com typescript e node.js. ultimamente, tenho explorado como agentes de ia podem trabalhar juntos e manter o contexto de que precisam.",
    },
    experience: {
      title: "experiência",
      entries: {
        teamIt: {
          role: "engenheiro de software",
          period: "fevereiro–julho de 2026",
          description:
            "desenvolvi um aplicativo de ia para ajudar em entrevistas pelo computador. trabalhei com o diretor de pesquisa e desenvolvimento para definir o que ele precisava fazer e cuidei do desenvolvimento até a publicação na microsoft store. alguns consultores já usavam o aplicativo em reuniões quando saí.",
        },
        clinia: {
          role: "engenheiro de software",
          period: "novembro de 2023–novembro de 2025",
          description:
            "entrei como estagiário e segui na equipe como engenheiro. trabalhei no software para clínicas, nas automações com editor visual e no primeiro agente de ia da plataforma. também ajudei a tornar o sistema mais estável e a rever a arquitetura de backend e ia.",
        },
        killing: {
          role: "estagiário de ti",
          period: "setembro de 2022–abril de 2023",
          description:
            "além do trabalho com suporte de ti, desenvolvi um sistema de checklists para visitas a clientes, que entrou em produção. também fiz um protótipo para acompanhar os equipamentos da fábrica.",
        },
      },
    },
    contact: {
      close: "fechar",
      description:
        "estou aberto a uma nova vaga ou a projetos freelance. me conta no que você está trabalhando.",
      schedule: "agendar uma conversa",
      roleFit: "comparar uma vaga",
    },
    guestbook: {
      title: "livro de visitas",
    },
  },
  fit: {
    title: "comparar com minha experiência",
    description:
      "cole a descrição de uma vaga para ver como ela se encaixa na minha experiência.",
    back: "voltar",
    form: {
      roleDescription: "descrição da vaga",
      placeholder:
        "engenheiro de software sênior com 5 anos de experiência ou mais",
      assess: "comparar com minha experiência",
      assessing: "comparando…",
      assessment: "resultado da comparação",
      assessmentReady: "a comparação está pronta.",
      emptyDescription: "cole a descrição de uma vaga para fazer a comparação.",
      invalidDescription:
        "cole uma descrição de vaga com no máximo 16.000 caracteres.",
      descriptionRejected:
        "esse conteúdo não pode ser usado na comparação. cole apenas a descrição da vaga ou do projeto.",
      rateLimited:
        "muitas tentativas de comparação. espere um pouco e tente de novo.",
      requestDenied:
        "não foi possível comparar esta vaga com minha experiência.",
      serviceUnavailable:
        "a comparação está indisponível no momento. tente de novo daqui a pouco.",
      unableToAssess: "não foi possível fazer a comparação. tente de novo.",
      connectionError:
        "não foi possível fazer a comparação. confira sua conexão e tente de novo.",
      characterCount: "{count} / {max}",
      scheduleConversation: "agendar uma conversa",
    },
  },
  schedule: {
    title: "agendar uma conversa",
    description:
      "escolha um horário para conversar comigo. a conversa dura uma hora.",
    back: "voltar",
    form: {
      name: "nome",
      email: "e-mail",
      date: "data",
      time: "horário",
      namePlaceholder: "alex morgan",
      emailPlaceholder: "alex@example.com",
      chooseTime: "escolha um horário",
      dateHint: "os horários aparecem no seu fuso horário.",
      timeHint: "a conversa dura uma hora a partir do horário escolhido.",
      enterName: "digite seu nome.",
      validName: "use entre 2 e 120 caracteres no nome.",
      enterEmail: "digite seu endereço de e-mail.",
      validEmail: "digite um endereço de e-mail válido.",
      chooseDate: "escolha uma data.",
      futureDate: "escolha uma data a partir de hoje.",
      chooseTimeError: "escolha um horário.",
      futureTime: "escolha um horário que ainda não passou.",
      conflict: "esse horário não está mais disponível. escolha outro.",
      rateLimited:
        "muitas tentativas de agendamento. espere um pouco e tente de novo.",
      requestDenied: "não foi possível agendar esta conversa.",
      serviceUnavailable:
        "não dá para agendar agora. tente de novo daqui a pouco.",
      unableToSchedule:
        "não foi possível agendar a conversa. confira seus dados e tente de novo.",
      connectionError:
        "não foi possível agendar a conversa. confira sua conexão e tente de novo.",
      booking: "agendando conversa…",
      book: "agendar conversa",
      bookingStatus: "agendando sua conversa.",
      success: "conversa agendada. o convite chega por e-mail.",
      meetingDetails: "ver detalhes da conversa",
      externalLinkNewTab: " (abre em uma nova aba)",
    },
  },
  guestbook: {
    title: "livro de visitas",
    description:
      "deixe uma mensagem por aqui. cada mensagem aparece como um ponto de luz no globo.",
    back: "voltar",
    newTitle: "deixe uma mensagem",
    newDescription:
      "escreva uma mensagem para deixar no globo. ela ficará visível para quem visitar o site.",
    backToGlobe: "voltar ao globo",
    form: {
      name: "nome",
      message: "mensagem",
      namePlaceholder: "alex morgan",
      messagePlaceholder: "passei por aqui e gostei de conhecer seus projetos.",
      enterName: "digite seu nome.",
      nameTooLong: "use no máximo {max} caracteres no nome.",
      writeMessage: "escreva uma mensagem.",
      messageTooLong: "use no máximo {max} caracteres na mensagem.",
      contentRejected:
        "esta mensagem não pode ser publicada. revise o nome e a mensagem e tente de novo.",
      locationUnavailable:
        "não foi possível encontrar sua localização para colocar a mensagem no globo. tente de novo mais tarde.",
      rateLimited:
        "muitas tentativas de publicação. espere um pouco e tente de novo.",
      requestDenied: "não foi possível publicar esta mensagem.",
      serviceUnavailable:
        "não dá para publicar agora. tente de novo daqui a pouco.",
      unableToPublish:
        "não foi possível publicar sua mensagem. tente de novo mais tarde.",
      connectionError:
        "não foi possível publicar sua mensagem. confira sua conexão e tente de novo.",
      publishing: "publicando…",
      publish: "publicar mensagem",
      publishingStatus: "publicando sua mensagem.",
      success: "sua mensagem está no globo.",
      redirecting: "mensagem publicada. voltando ao globo…",
    },
    globe: {
      loading: "carregando o globo",
      loadBordersError: "não foi possível carregar as fronteiras dos países.",
      leaveMessage: "deixar uma mensagem",
      centerGlobe: "centralizar globo",
      centering: "centralizando…",
      useMyLocation: "usar minha localização",
      requestingLocation: "buscando sua localização…",
      locationDenied:
        "o acesso à localização foi negado. confira as permissões ou configurações do navegador.",
      locationUnavailable: "a localização está indisponível. tente de novo.",
      messageCountOne: "{count} mensagem",
      messageCountMany: "{count} mensagens",
      visitorMessages: "mensagens de visitantes",
      message: "mensagem",
      nearbyMessages: "{count} mensagens próximas",
      close: "fechar",
      empty: "ainda não há mensagens. deixe a primeira.",
    },
  },
  projects: {
    portfolio: "portfólio",
    repository: "repositório",
    projectNotes: "notas do projeto",
    back: "voltar",
    projectNotesAlt: "{name}: notas do projeto",
    externalLinkNewTab: " (abre em uma nova aba)",
  },
  notFound: {
    title: "página não encontrada",
    description: "não encontrei uma página neste endereço.",
    home: "voltar ao portfólio",
  },
};
