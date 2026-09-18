import type { Dictionary } from '@/i18n/dictionary'

export const es: Dictionary = {
  site: {
    title: 'henrique krause',
    description:
      'soy ingeniero de software en lisboa. creo productos, interfaces y herramientas para personas y agentes de IA.',
    role: 'ingeniero de software',
    location: 'lisboa',
  },
  navigation: {
    primaryLinks: 'enlaces principales',
    preferencesNavigation: 'preferencias',
    languageNavigation: 'idioma',
    appearanceNavigation: 'apariencia',
    externalLinkNewTab: ' (se abre en una pestaña nueva)',
    languages: { en: 'english', fr: 'français', es: 'español', pt: 'português', ja: '日本語' },
    appearance: { system: 'sistema', light: 'claro', dark: 'oscuro' },
  },
  home: {
    projects: 'proyectos',
    notes: {
      title: 'notas',
      // Note content is currently available only in English, Portuguese, and Japanese.
      pageTitles: {
        'between-starting-and-shipping': 'The gap between starting and shipping',
        'thinking-in-public': 'thinking in public',
      },
      reader: {
        closeReading: 'volver',
        minimizeToolbar: 'minimizar controles',
        expandToolbar: 'ampliar controles',
        toolbarLabel: 'controles de lectura',
        playerLabel: 'narración de la nota',
        audioLabel: 'audio de la narración',
        preparing: 'preparando la narración…',
        buffering: 'cargando la narración…',
        play: 'escuchar',
        pause: 'pausar',
        speed: 'velocidad',
        seek: 'avanzar o retroceder en la narración',
        retry: 'intentarlo de nuevo',
        audioError: 'no se pudo cargar la narración.',
        syncUnavailable: 'la narración no está disponible para esta nota.',
      },
    },
    bio: {
      intro:
        'soy ingeniero de software en lisboa. creo productos, interfaces y herramientas para personas y agentes de IA.',
      process:
        'trabajo en la arquitectura y la implementación de aplicaciones, prestando atención a la experiencia de uso.',
      interests:
        'trabajo principalmente con typescript y node.js. últimamente, exploro cómo pueden colaborar los agentes de IA y conservar el contexto que necesitan.',
    },
    experience: {
      title: 'experiencia',
      entries: {
        teamIt: {
          role: 'ingeniero de software',
          period: 'febrero–julio de 2026',
          description:
            'creé un asistente de IA de escritorio para entrevistas. trabajé con el director de I+D para definir lo que tenía que hacer y me encargué de su desarrollo hasta publicarlo en Microsoft Store. cuando me fui, algunos consultores ya lo usaban en sus reuniones.',
        },
        clinia: {
          role: 'ingeniero de software',
          period: 'noviembre de 2023–noviembre de 2025',
          description:
            'me incorporé como becario y continué como ingeniero. trabajé en software para clínicas, flujos de automatización visual y el primer agente de IA de la plataforma. también ayudé a estabilizar el sistema y a replantear la arquitectura del backend y de IA.',
        },
        killing: {
          role: 'becario de informática',
          period: 'septiembre de 2022–abril de 2023',
          description:
            'mientras trabajaba en soporte informático, creé una aplicación de listas de comprobación para visitas a clientes que llegó a producción. también hice un prototipo para supervisar equipos de fábrica.',
        },
      },
    },
    contact: {
      close: 'cerrar',
      description:
        'estoy abierto a nuevas oportunidades y proyectos freelance. podemos hablar de lo que estás construyendo.',
      schedule: 'concertar una conversación',
      roleFit: 'comprobar encaje con el puesto',
      guestbook: 'libro de visitas',
    },
  },
  guestbook: {
    publicNotice: 'los mensajes publicados aquí son públicos.',
    writeMessage: 'dejar un mensaje',
    backToMessages: 'volver a los mensajes',
    name: 'nombre o apodo',
    namePlaceholder: 'alex',
    message: 'mensaje',
    messagePlaceholder: 'deja una nota…',
    send: 'publicar mensaje',
    sending: 'enviando…',
    sendingStatus: 'enviando tu mensaje.',
    success: 'tu mensaje ya está en el libro de visitas.',
    enterName: 'escribe tu nombre o apodo.',
    validName: 'usa como máximo 80 caracteres para tu nombre o apodo.',
    enterMessage: 'escribe un mensaje antes de enviarlo.',
    validMessage: 'usa como máximo 500 caracteres para tu mensaje.',
    messageRejected: 'este mensaje no se puede publicar. prueba con otra redacción.',
    rateLimited:
      'se han enviado demasiados mensajes seguidos. espera un momento y vuelve a intentarlo.',
    requestDenied: 'no se pudo publicar este mensaje.',
    serviceUnavailable:
      'el libro de visitas no está disponible ahora. vuelve a intentarlo en un momento.',
    submissionConflict: 'no se pudo reintentar este envío. vuelve a enviar el mensaje.',
    unableToSend: 'no se pudo publicar este mensaje. vuelve a intentarlo.',
    connectionError:
      'no se pudo publicar este mensaje. comprueba tu conexión y vuelve a intentarlo.',
    loading: 'cargando mensajes…',
    loadingStatus: 'cargando los mensajes del libro de visitas.',
    loadError: 'no se pudo cargar el libro de visitas. vuelve a intentarlo.',
    retry: 'volver a intentarlo',
    empty: 'todavía no hay mensajes.',
    seeMore: 'ver más',
    seeLess: 'ver menos',
    loadingMore: 'cargando más…',
    loadingMoreStatus: 'cargando más mensajes del libro de visitas.',
    loadMoreError: 'no se pudieron cargar más mensajes. vuelve a intentarlo.',
    loadedMore: 'se han cargado más mensajes del libro de visitas.',
  },
  notes: {
    closeReading: 'volver',
    minimizeToolbar: 'minimizar controles',
    expandToolbar: 'ampliar controles',
    toolbarLabel: 'controles de lectura',
    playerLabel: 'narración de la nota',
    audioLabel: 'audio de la narración',
    preparing: 'preparando la narración…',
    buffering: 'cargando la narración…',
    play: 'escuchar',
    pause: 'pausar',
    speed: 'velocidad',
    seek: 'avanzar o retroceder en la narración',
    retry: 'intentarlo de nuevo',
    audioError: 'no se pudo cargar la narración.',
    syncUnavailable: 'la narración no está disponible para esta nota.',
  },
  fit: {
    description:
      'pega la descripción del puesto o proyecto. la IA compara los requisitos con mi experiencia y los proyectos de este portafolio.',
    form: {
      roleDescription: 'descripción del puesto',
      placeholder: 'ingeniero de software sénior\ncrea productos fiables con typescript…',
      assess: 'comprobar encaje con el puesto',
      assessing: 'comparando…',
      assessment: 'cómo encaja',
      assessmentReady: 'la comparación está lista.',
      emptyDescription: 'pega la descripción del puesto para compararla.',
      invalidDescription: 'usa una descripción del puesto de 16.000 caracteres como máximo.',
      descriptionRejected:
        'este contenido no se puede comparar. pega solo la descripción del puesto o del proyecto.',
      rateLimited:
        'se han hecho demasiados intentos de comparación. espera un momento y vuelve a intentarlo.',
      requestDenied: 'no se pudo comparar este puesto.',
      serviceUnavailable:
        'la comparación no está disponible ahora. vuelve a intentarlo en un momento.',
      unableToAssess: 'no se pudo comparar este puesto. vuelve a intentarlo.',
      connectionError:
        'no se pudo comparar este puesto. comprueba tu conexión y vuelve a intentarlo.',
      characterCount: '{count} / {max} caracteres',
      scheduleConversation: 'concertar una conversación',
      editDescription: 'editar descripción',
    },
  },
  schedule: {
    description: 'elige un momento para hablar conmigo. la conversación dura una hora.',
    form: {
      name: 'nombre',
      email: 'correo electrónico',
      date: 'fecha',
      time: 'hora',
      namePlaceholder: 'alex morgan',
      emailPlaceholder: 'alex@example.com',
      chooseTime: 'elige una hora',
      dateHint: 'las horas se muestran en tu zona horaria.',
      timeHint: 'una hora a partir de la hora elegida.',
      enterName: 'escribe tu nombre.',
      validName: 'usa entre 2 y 120 caracteres para tu nombre.',
      enterEmail: 'escribe tu dirección de correo electrónico.',
      validEmail: 'escribe una dirección de correo electrónico válida.',
      chooseDate: 'elige una fecha.',
      futureDate: 'elige una fecha posterior a hoy.',
      availableDays: 'elige un día laborable, de lunes a viernes.',
      chooseTimeError: 'elige una hora.',
      futureTime: 'elige una hora futura.',
      availableHours: 'elige una hora entre las 9:00 y las 17:00.',
      conflict: 'esa hora ya no está disponible. elige otra.',
      rateLimited:
        'se han hecho demasiados intentos de reserva. espera un momento y vuelve a intentarlo.',
      requestDenied: 'no se pudo concertar esta conversación.',
      serviceUnavailable: 'la reserva no está disponible ahora. vuelve a intentarlo en un momento.',
      unableToSchedule: 'no se pudo concertar la conversación. vuelve a intentarlo.',
      connectionError:
        'no se pudo concertar la conversación. comprueba tu conexión y vuelve a intentarlo.',
      booking: 'reservando…',
      book: 'concertar la conversación',
      bookingStatus: 'concertando tu conversación.',
      success:
        'tu conversación está programada. revisa tu correo para ver la invitación de calendario.',
      joinMeeting: 'unirse a la llamada',
      viewBooking: 'ver la reserva',
      externalLinkNewTab: ' (se abre en una pestaña nueva)',
    },
  },
  projects: {
    repository: 'repositorio',
    externalLinkNewTab: ' (se abre en una pestaña nueva)',
  },
  notFound: {
    title: 'página no encontrada',
    description: 'no he encontrado ninguna página en esta dirección.',
    home: 'volver al portafolio',
  },
}
