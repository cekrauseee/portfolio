import type { Dictionary } from "@/i18n/dictionary";

export const en: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "Software engineer in Lisbon building thoughtful products, interfaces, and tools for humans and agents.",
    role: "Software engineer",
    location: "Lisbon",
    profileSummary: "{role} based in {location}.",
  },
  navigation: {
    primaryLinks: "Primary links",
    preferencesNavigation: "Preferences",
    languageNavigation: "Language",
    appearanceNavigation: "Appearance",
    externalLinkNewTab: " (opens in a new tab)",
    languages: { en: "English", pt: "Português", ja: "日本語" },
    appearance: { system: "System", light: "Light", dark: "Dark" },
  },
  home: {
    assessFit: "Assess my fit",
    scheduleConversation: "Schedule a conversation",
    leaveMessage: "Leave a message on the globe",
    projects: "Projects",
    readProjectNotes: "Read project notes",
  },
  fit: {
    title: "Assess my fit",
    description: "Paste a role description to compare it with my experience.",
    back: "Back",
    form: {
      roleDescription: "Role description",
      placeholder: "Senior software engineer with 5+ years of experience",
      assess: "Assess fit",
      assessing: "Assessing fit…",
      assessment: "Fit assessment",
      assessmentReady: "Fit assessment ready.",
      emptyDescription: "Paste a role description before assessing the fit.",
      invalidDescription:
        "Paste a role description of up to 16,000 characters.",
      descriptionRejected:
        "This content can’t be assessed as a professional opportunity. Paste only the role or project description.",
      rateLimited: "Too many assessment attempts. Wait a moment and try again.",
      requestDenied: "Unable to assess this role.",
      serviceUnavailable:
        "Fit assessment is temporarily unavailable. Try again shortly.",
      unableToAssess: "Unable to assess fit. Try again.",
      connectionError:
        "Unable to assess fit. Check your connection and try again.",
      characterCount: "{count} / {max}",
      scheduleConversation: "Schedule a conversation",
    },
  },
  schedule: {
    title: "Schedule a conversation",
    description:
      "Choose a time for a one-hour conversation with Henrique Krause.",
    back: "Back",
    form: {
      name: "Name",
      email: "Email",
      date: "Date",
      time: "Time",
      namePlaceholder: "Alex Morgan",
      emailPlaceholder: "alex@example.com",
      chooseTime: "Choose a time",
      dateHint: "All dates are available. Times use your local time zone.",
      timeHint: "One hour, starting at the selected time.",
      enterName: "Enter your name.",
      validName: "Use between 2 and 120 characters for your name.",
      enterEmail: "Enter your email address.",
      validEmail: "Enter a valid email address.",
      chooseDate: "Choose a date.",
      futureDate: "Choose a future date.",
      chooseTimeError: "Choose a time.",
      futureTime: "Choose a future time.",
      conflict: "That time is no longer available. Choose another time.",
      rateLimited: "Too many scheduling attempts. Wait a moment and try again.",
      requestDenied: "Unable to schedule this meeting.",
      serviceUnavailable:
        "Meeting scheduling is temporarily unavailable. Try again shortly.",
      unableToSchedule:
        "Unable to schedule the meeting. Check your details and try again.",
      connectionError:
        "Unable to schedule the meeting. Check your connection and try again.",
      booking: "Booking meeting…",
      book: "Book this meeting",
      bookingStatus: "Booking your meeting.",
      success:
        "Your meeting is scheduled. Check your email for the calendar invitation.",
      meetingDetails: "Open the meeting details",
      externalLinkNewTab: " (opens in a new tab)",
    },
  },
  guestbook: {
    title: "Visitor guestbook",
    description:
      "Leave a message on the globe. Visitors from everywhere appear as points of light.",
    back: "Back",
    newTitle: "Leave a message",
    newDescription: "Share a message that appears on the visitor globe.",
    backToGlobe: "Back to globe",
    form: {
      name: "Name",
      message: "Message",
      namePlaceholder: "Alex Morgan",
      messagePlaceholder: "I would love to learn more about your work.",
      enterName: "Enter your name.",
      nameTooLong: "Use {max} characters or fewer for your name.",
      writeMessage: "Write a message.",
      messageTooLong: "Use {max} characters or fewer for your message.",
      contentRejected:
        "This message can’t be published. Review the name and message, then try again.",
      locationUnavailable:
        "Unable to determine where to place your message. Try again later.",
      rateLimited: "Too many publishing attempts. Wait a moment and try again.",
      requestDenied: "Unable to publish this message.",
      serviceUnavailable:
        "Publishing is temporarily unavailable. Try again shortly.",
      unableToPublish: "Unable to publish your message. Try again later.",
      connectionError:
        "Unable to publish your message. Check your connection and try again.",
      publishing: "Publishing…",
      publish: "Publish message",
      publishingStatus: "Publishing your message.",
      success: "Your message is on the globe.",
      redirecting: "Your message is on the globe. Redirecting…",
    },
    globe: {
      loading: "Loading globe",
      loadBordersError: "Unable to load country borders.",
      leaveMessage: "Leave a message",
      centerGlobe: "Center globe",
      centering: "Centering…",
      useMyLocation: "Use my location",
      requestingLocation: "Finding your location…",
      locationDenied:
        "Location access was denied. Check your browser permissions or settings.",
      locationUnavailable: "Location is unavailable. You can try again.",
      messageCountOne: "{count} message",
      messageCountMany: "{count} messages",
      visitorMessages: "Visitor messages",
      message: "Message",
      nearbyMessages: "{count} messages nearby",
      close: "Close",
      empty: "No messages yet. Be the first.",
    },
  },
  projects: {
    portfolio: "Portfolio",
    repository: "Repository",
    projectNotes: "project notes",
    back: "Back",
    projectNotesAlt: "{name} project notes",
    externalLinkNewTab: " (opens in a new tab)",
  },
  notFound: {
    title: "Page not found",
    description: "There is nothing at this address.",
    home: "Return to portfolio",
  },
};
