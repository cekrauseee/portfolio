import type { Locale } from "@/i18n/config";

export type Dictionary = {
  site: {
    title: string;
    description: string;
    role: string;
    location: string;
    profileSummary: string;
  };
  navigation: {
    primaryLinks: string;
    preferencesNavigation: string;
    languageNavigation: string;
    appearanceNavigation: string;
    externalLinkNewTab: string;
    languages: Record<Locale, string>;
    appearance: {
      system: string;
      light: string;
      dark: string;
    };
  };
  home: {
    assessFit: string;
    scheduleConversation: string;
    leaveMessage: string;
    projects: string;
    readProjectNotes: string;
  };
  fit: {
    title: string;
    description: string;
    back: string;
    form: {
      roleDescription: string;
      placeholder: string;
      assess: string;
      assessing: string;
      assessment: string;
      assessmentReady: string;
      emptyDescription: string;
      invalidDescription: string;
      descriptionRejected: string;
      rateLimited: string;
      requestDenied: string;
      serviceUnavailable: string;
      unableToAssess: string;
      connectionError: string;
      characterCount: string;
      scheduleConversation: string;
    };
  };
  schedule: {
    title: string;
    description: string;
    back: string;
    form: {
      name: string;
      email: string;
      date: string;
      time: string;
      namePlaceholder: string;
      emailPlaceholder: string;
      chooseTime: string;
      dateHint: string;
      timeHint: string;
      enterName: string;
      validName: string;
      enterEmail: string;
      validEmail: string;
      chooseDate: string;
      futureDate: string;
      chooseTimeError: string;
      futureTime: string;
      conflict: string;
      rateLimited: string;
      requestDenied: string;
      serviceUnavailable: string;
      unableToSchedule: string;
      connectionError: string;
      booking: string;
      book: string;
      bookingStatus: string;
      success: string;
      meetingDetails: string;
      externalLinkNewTab: string;
    };
  };
  guestbook: {
    title: string;
    description: string;
    back: string;
    newTitle: string;
    newDescription: string;
    backToGlobe: string;
    form: {
      name: string;
      message: string;
      namePlaceholder: string;
      messagePlaceholder: string;
      enterName: string;
      nameTooLong: string;
      writeMessage: string;
      messageTooLong: string;
      contentRejected: string;
      locationUnavailable: string;
      rateLimited: string;
      requestDenied: string;
      serviceUnavailable: string;
      unableToPublish: string;
      connectionError: string;
      publishing: string;
      publish: string;
      publishingStatus: string;
      success: string;
      redirecting: string;
    };
    globe: {
      loading: string;
      loadBordersError: string;
      leaveMessage: string;
      centerGlobe: string;
      centering: string;
      useMyLocation: string;
      requestingLocation: string;
      locationDenied: string;
      locationUnavailable: string;
      messageCountOne: string;
      messageCountMany: string;
      visitorMessages: string;
      message: string;
      nearbyMessages: string;
      close: string;
      empty: string;
    };
  };
  projects: {
    portfolio: string;
    repository: string;
    projectNotes: string;
    back: string;
    projectNotesAlt: string;
    externalLinkNewTab: string;
  };
  notFound: {
    title: string;
    description: string;
    home: string;
  };
};
