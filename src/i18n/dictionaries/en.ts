import type { Dictionary } from "@/i18n/dictionary";

export const en: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "i'm a software engineer in lisbon. i build products, interfaces, and tools for people and ai agents.",
    role: "software engineer",
    location: "lisbon",
  },
  navigation: {
    primaryLinks: "primary links",
    preferencesNavigation: "preferences",
    languageNavigation: "language",
    appearanceNavigation: "appearance",
    externalLinkNewTab: " (opens in a new tab)",
    languages: { en: "english", pt: "português", ja: "日本語" },
    appearance: { system: "system", light: "light", dark: "dark" },
  },
  home: {
    projects: "projects",
    bio: {
      intro:
        "i'm a software engineer in lisbon. i build products, interfaces, and tools for people and ai agents.",
      process:
        "i like turning ideas into software and paying attention to the details that matter to the people using it.",
      interests:
        "i mostly work with typescript and node.js. lately, i've been exploring how ai agents can work together and keep the context they need.",
    },
    experience: {
      title: "experience",
      entries: {
        teamIt: {
          role: "software engineer",
          period: "february–july 2026",
          description:
            "i built a desktop ai assistant for interviews. i worked with the r&d director to figure out what it needed to do and handled development through to its release on the microsoft store. some consultants were already using it in meetings when i left.",
        },
        clinia: {
          role: "software engineer",
          period: "november 2023–november 2025",
          description:
            "i joined as an intern and stayed on as an engineer. i worked on software for clinics, visual automation workflows, and the platform's first ai agent. i also helped make the system more stable and rethink the backend and ai architecture.",
        },
        killing: {
          role: "it intern",
          period: "september 2022–april 2023",
          description:
            "alongside my work in it support, i built a checklist app for customer visits that went into production. i also made a prototype for monitoring factory equipment.",
        },
      },
    },
    contact: {
      close: "close",
      description:
        "i'm open to a new role or freelance projects. tell me what you're working on.",
      schedule: "schedule a conversation",
      roleFit: "compare a job",
    },
    guestbook: {
      title: "guestbook",
    },
  },
  fit: {
    title: "compare with my experience",
    description:
      "paste a job description to see how it lines up with my experience.",
    back: "back",
    form: {
      roleDescription: "job description",
      placeholder: "senior software engineer with 5+ years of experience",
      assess: "compare with my experience",
      assessing: "comparing…",
      assessment: "comparison results",
      assessmentReady: "your comparison is ready.",
      emptyDescription: "paste a job description to make the comparison.",
      invalidDescription: "paste a job description of up to 16,000 characters.",
      descriptionRejected:
        "this content can't be used for the comparison. paste only the job or project description.",
      rateLimited: "too many comparison attempts. wait a moment and try again.",
      requestDenied: "unable to compare this job with my experience.",
      serviceUnavailable:
        "comparisons are unavailable right now. try again in a moment.",
      unableToAssess: "unable to make the comparison. try again.",
      connectionError:
        "unable to make the comparison. check your connection and try again.",
      characterCount: "{count} / {max}",
      scheduleConversation: "schedule a conversation",
    },
  },
  schedule: {
    title: "schedule a conversation",
    description: "pick a time to talk with me. the conversation lasts an hour.",
    back: "back",
    form: {
      name: "name",
      email: "email",
      date: "date",
      time: "time",
      namePlaceholder: "alex morgan",
      emailPlaceholder: "alex@example.com",
      chooseTime: "choose a time",
      dateHint: "times are shown in your time zone.",
      timeHint: "one hour, starting at the selected time.",
      enterName: "enter your name.",
      validName: "use between 2 and 120 characters for your name.",
      enterEmail: "enter your email address.",
      validEmail: "enter a valid email address.",
      chooseDate: "choose a date.",
      futureDate: "choose today or a later date.",
      chooseTimeError: "choose a time.",
      futureTime: "choose a future time.",
      conflict: "that time is no longer available. choose another time.",
      rateLimited: "too many scheduling attempts. wait a moment and try again.",
      requestDenied: "unable to schedule this conversation.",
      serviceUnavailable:
        "scheduling is unavailable right now. try again in a moment.",
      unableToSchedule:
        "unable to schedule the conversation. check your details and try again.",
      connectionError:
        "unable to schedule the conversation. check your connection and try again.",
      booking: "scheduling…",
      book: "schedule a conversation",
      bookingStatus: "scheduling your conversation.",
      success:
        "your conversation is scheduled. check your email for the calendar invitation.",
      meetingDetails: "view booking details",
      externalLinkNewTab: " (opens in a new tab)",
    },
  },
  guestbook: {
    title: "guestbook",
    description:
      "leave a message here. each message appears as a point of light on the globe.",
    back: "back",
    newTitle: "leave a message",
    newDescription:
      "write a message for the globe. anyone visiting the site will be able to read it.",
    backToGlobe: "back to globe",
    form: {
      name: "name",
      message: "message",
      namePlaceholder: "alex morgan",
      messagePlaceholder:
        "stopped by and enjoyed looking through your projects.",
      enterName: "enter your name.",
      nameTooLong: "use {max} characters or fewer for your name.",
      writeMessage: "write a message.",
      messageTooLong: "use {max} characters or fewer for your message.",
      contentRejected:
        "this message can’t be published. review the name and message, then try again.",
      locationUnavailable:
        "unable to determine where to place your message. try again later.",
      rateLimited: "too many publishing attempts. wait a moment and try again.",
      requestDenied: "unable to publish this message.",
      serviceUnavailable:
        "publishing is temporarily unavailable. try again shortly.",
      unableToPublish: "unable to publish your message. try again later.",
      connectionError:
        "unable to publish your message. check your connection and try again.",
      publishing: "publishing…",
      publish: "publish message",
      publishingStatus: "publishing your message.",
      success: "your message is on the globe.",
      redirecting: "message published. back to the globe…",
    },
    globe: {
      loading: "loading globe",
      loadBordersError: "unable to load country borders.",
      leaveMessage: "leave a message",
      centerGlobe: "center globe",
      centering: "centering…",
      useMyLocation: "use my location",
      requestingLocation: "finding your location…",
      locationDenied:
        "location access was denied. check your browser permissions or settings.",
      locationUnavailable: "location is unavailable. you can try again.",
      messageCountOne: "{count} message",
      messageCountMany: "{count} messages",
      visitorMessages: "visitor messages",
      message: "message",
      nearbyMessages: "{count} messages nearby",
      close: "close",
      empty: "no messages yet. be the first.",
    },
  },
  projects: {
    portfolio: "portfolio",
    repository: "repository",
    projectNotes: "project notes",
    back: "back",
    projectNotesAlt: "{name} project notes",
    externalLinkNewTab: " (opens in a new tab)",
  },
  notFound: {
    title: "page not found",
    description: "i couldn't find a page at this address.",
    home: "return to portfolio",
  },
};
