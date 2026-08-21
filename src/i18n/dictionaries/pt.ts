import type { Dictionary } from "@/i18n/dictionary";

export const pt: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "Engenheiro de software em Lisboa, criando produtos, interfaces e ferramentas bem pensados para pessoas e agentes.",
    role: "Engenheiro de software",
    location: "Lisboa",
    profileSummary: "{role} em {location}.",
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
    assessFit: "Avaliar compatibilidade",
    scheduleConversation: "Agendar uma conversa",
    leaveMessage: "Deixar uma mensagem no globo",
    projects: "Projetos",
    readProjectNotes: "Ler notas do projeto",
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
      enterEmail: "Digite seu endereço de e-mail.",
      validEmail: "Digite um endereço de e-mail válido.",
      chooseDate: "Escolha uma data.",
      futureDate: "Escolha uma data futura.",
      chooseTimeError: "Escolha um horário.",
      futureTime: "Escolha um horário futuro.",
      conflict: "Esse horário não está mais disponível. Escolha outro.",
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
      nameTooLong: "Seu nome deve ter menos de {max} caracteres.",
      writeMessage: "Escreva uma mensagem.",
      messageTooLong: "Sua mensagem deve ter menos de {max} caracteres.",
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
  retry: {
    waitMoment: "Antes de tentar novamente, aguarde um momento.",
    waitSeconds: "Antes de tentar novamente, aguarde {count} segundo{plural}.",
  },
};
