import type { Dictionary } from "@/i18n/dictionary";

export const pt: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "Engenheiro de software em Lisboa, criando produtos, interfaces e ferramentas bem pensados para pessoas e agentes.",
    role: "Engenheiro de software",
    location: "Lisboa",
  },
  navigation: {
    primaryLinks: "Links principais",
    preferencesNavigation: "Preferências",
    languageNavigation: "Idioma",
    appearanceNavigation: "Aparência",
    externalLinkNewTab: " (abre em uma nova aba)",
    languages: { en: "English", pt: "Português", ja: "日本語" },
    appearance: { system: "Sistema", light: "Claro", dark: "Escuro" },
  },
  home: {
    assessFit: "avaliar compatibilidade",
    scheduleConversation: "agendar uma conversa",
    leaveMessage: "deixar uma mensagem no globo",
    projects: "projetos",
    readProjectNotes: "ler notas do projeto",
    bio: {
      intro:
        "sou engenheiro de software em lisboa, criando produtos, interfaces e ferramentas bem pensados para pessoas e agentes.",
      process:
        "gosto de entender o que as pessoas precisam e descobrir como transformar isso em software. conversar sobre ideias, questionar premissas, pensar na arquitetura e escrever o código são partes do trabalho que eu gosto. também me importo com a sensação de usar a aplicação.",
      interests:
        "trabalho principalmente com typescript e node.js. ultimamente, tenho explorado agentes de ia e orquestração: como eles trabalham juntos, como mantêm contexto útil e até onde consigo levá-los.",
    },
    experience: {
      title: "experiência",
      linkedin: "mais sobre minha experiência no linkedin",
      entries: {
        teamIt: {
          roleAndPeriod: "engenheiro de software · fevereiro–julho de 2026",
          paragraphs: {
            first:
              "trabalhei em experimentos de ia e agentes em p&d. o principal foi um assistente desktop para gestores entrevistando consultores. trabalhei com o diretor de p&d nos requisitos e construí a aplicação, da arquitetura até a publicação na microsoft store.",
            second:
              "ele podia sugerir perguntas durante uma reunião e ajudar a trabalhar com transcrições e arquivos depois. um pequeno grupo de consultores já o usava em reuniões antes de eu sair.",
          },
        },
        clinia: {
          roleAndPeriod:
            "estagiário full-stack → engenheiro de software · novembro de 2023–novembro de 2025",
          paragraphs: {
            first:
              "entrei como a quarta pessoa do time de engenharia, começando com um ano de estágio. construíamos software para ajudar clínicas a gerenciar conversas com pacientes e automatizar tarefas do dia a dia.",
            second:
              "trabalhei em funcionalidades do produto e fluxos visuais, e construí o módulo inicial do primeiro agente de ia da plataforma. conforme o produto cresceu, também trabalhei em suporte, estabilidade e mudanças na arquitetura de backend e ia.",
          },
        },
        killing: {
          roleAndPeriod: "estagiário de ti · setembro de 2022–abril de 2023",
          paragraph:
            "trabalhei com suporte de ti em uma fabricante de tintas e construí algumas aplicações junto desse trabalho. uma ajudava consultores comerciais a preencher checklists de visitas a clientes e entrou em produção. a outra foi um protótipo para monitorar equipamentos da fábrica.",
        },
      },
    },
    contact: {
      title: "entre em contato",
      description:
        "estou aberto a uma nova vaga ou trabalho freelance. se você tem algo em mente, gostaria de saber mais.",
      email: "enviar e-mail",
      roleFitDescription:
        "você também pode comparar a descrição de uma vaga com o trabalho que compartilhei aqui.",
      roleFit: "comparar uma vaga com meu trabalho",
    },
    guestbook: {
      title: "livro de visitas",
      description: "deixe uma mensagem no globo ou veja quem passou por aqui.",
      visit: "visitar o livro de visitas",
    },
  },
  fit: {
    title: "Avaliar compatibilidade",
    description:
      "Cole a descrição da vaga para compará-la com minha experiência.",
    back: "Voltar",
    form: {
      roleDescription: "Descrição da vaga",
      placeholder:
        "Engenheiro de software sênior com mais de 5 anos de experiência",
      assess: "Avaliar compatibilidade",
      assessing: "Avaliando compatibilidade…",
      assessment: "Avaliação de compatibilidade",
      assessmentReady: "A avaliação de compatibilidade está pronta.",
      emptyDescription:
        "Cole uma descrição de vaga antes de avaliar a compatibilidade.",
      invalidDescription:
        "Cole uma descrição de vaga com no máximo 16.000 caracteres.",
      descriptionRejected:
        "Este conteúdo não pode ser avaliado como uma oportunidade profissional. Cole apenas a descrição da vaga ou do projeto.",
      rateLimited:
        "Muitas tentativas de avaliação. Aguarde um momento e tente novamente.",
      requestDenied: "Não foi possível avaliar esta vaga.",
      serviceUnavailable:
        "A avaliação de compatibilidade está temporariamente indisponível. Tente novamente em instantes.",
      unableToAssess:
        "Não foi possível avaliar a compatibilidade. Tente novamente.",
      connectionError:
        "Não foi possível avaliar a compatibilidade. Verifique sua conexão e tente novamente.",
      characterCount: "{count} / {max}",
      scheduleConversation: "Agendar uma conversa",
    },
  },
  schedule: {
    title: "Agendar uma conversa",
    description:
      "Escolha um horário para uma conversa de uma hora com Henrique Krause.",
    back: "Voltar",
    form: {
      name: "Nome",
      email: "E-mail",
      date: "Data",
      time: "Horário",
      namePlaceholder: "Alex Morgan",
      emailPlaceholder: "alex@example.com",
      chooseTime: "Escolha um horário",
      dateHint:
        "Todas as datas estão disponíveis. Os horários seguem seu fuso horário local.",
      timeHint: "Uma hora, começando no horário selecionado.",
      enterName: "Digite seu nome.",
      validName: "Use entre 2 e 120 caracteres no nome.",
      enterEmail: "Digite seu endereço de e-mail.",
      validEmail: "Digite um endereço de e-mail válido.",
      chooseDate: "Escolha uma data.",
      futureDate: "Escolha uma data futura.",
      chooseTimeError: "Escolha um horário.",
      futureTime: "Escolha um horário futuro.",
      conflict: "Esse horário não está mais disponível. Escolha outro.",
      rateLimited:
        "Muitas tentativas de agendamento. Aguarde um momento e tente novamente.",
      requestDenied: "Não foi possível agendar esta reunião.",
      serviceUnavailable:
        "O agendamento está temporariamente indisponível. Tente novamente em instantes.",
      unableToSchedule:
        "Não foi possível agendar a reunião. Confira seus dados e tente novamente.",
      connectionError:
        "Não foi possível agendar a reunião. Verifique sua conexão e tente novamente.",
      booking: "Agendando reunião…",
      book: "Agendar esta reunião",
      bookingStatus: "Agendando a reunião.",
      success:
        "Sua reunião está agendada. Confira seu e-mail para ver o convite do calendário.",
      meetingDetails: "Abrir detalhes da reunião",
      externalLinkNewTab: " (abre em uma nova aba)",
    },
  },
  guestbook: {
    title: "Livro de visitas",
    description:
      "Deixe uma mensagem no globo. Visitantes de todo o mundo aparecem como pontos de luz.",
    back: "Voltar",
    newTitle: "Deixe uma mensagem",
    newDescription:
      "Compartilhe uma mensagem que aparecerá no globo de visitantes.",
    backToGlobe: "Voltar ao globo",
    form: {
      name: "Nome",
      message: "Mensagem",
      namePlaceholder: "Alex Morgan",
      messagePlaceholder: "Gostaria de saber mais sobre seu trabalho.",
      enterName: "Digite seu nome.",
      nameTooLong: "Use no máximo {max} caracteres no nome.",
      writeMessage: "Escreva uma mensagem.",
      messageTooLong: "Use no máximo {max} caracteres na mensagem.",
      contentRejected:
        "Esta mensagem não pode ser publicada. Revise o nome e a mensagem e tente novamente.",
      locationUnavailable:
        "Não foi possível determinar onde colocar sua mensagem no globo. Tente novamente mais tarde.",
      rateLimited:
        "Muitas tentativas de publicação. Aguarde um momento e tente novamente.",
      requestDenied: "Não foi possível publicar esta mensagem.",
      serviceUnavailable:
        "A publicação está temporariamente indisponível. Tente novamente em instantes.",
      unableToPublish:
        "Não foi possível publicar sua mensagem. Tente novamente mais tarde.",
      connectionError:
        "Não foi possível publicar sua mensagem. Verifique sua conexão e tente novamente.",
      publishing: "Publicando…",
      publish: "Publicar mensagem",
      publishingStatus: "Publicando sua mensagem.",
      success: "Sua mensagem está no globo.",
      redirecting: "Sua mensagem está no globo. Redirecionando…",
    },
    globe: {
      loading: "Carregando o globo",
      loadBordersError: "Não foi possível carregar as fronteiras dos países.",
      leaveMessage: "Deixar uma mensagem",
      centerGlobe: "Centralizar globo",
      centering: "Centralizando…",
      useMyLocation: "Usar minha localização",
      requestingLocation: "Buscando sua localização…",
      locationDenied:
        "O acesso à localização foi negado. Verifique as permissões ou configurações do navegador.",
      locationUnavailable: "A localização está indisponível. Tente novamente.",
      messageCountOne: "{count} mensagem",
      messageCountMany: "{count} mensagens",
      visitorMessages: "Mensagens de visitantes",
      message: "Mensagem",
      nearbyMessages: "{count} mensagens próximas",
      close: "Fechar",
      empty: "Ainda não há mensagens. Deixe a primeira.",
    },
  },
  projects: {
    portfolio: "Portfólio",
    repository: "Repositório",
    projectNotes: "notas do projeto",
    back: "Voltar",
    projectNotesAlt: "{name}: notas do projeto",
    externalLinkNewTab: " (abre em uma nova aba)",
  },
  notFound: {
    title: "Página não encontrada",
    description: "Não há nada neste endereço.",
    home: "Voltar ao portfólio",
  },
};
