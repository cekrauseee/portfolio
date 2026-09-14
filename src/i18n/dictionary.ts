import type { Locale } from '@/i18n/config'

export type Dictionary = {
  site: {
    title: string
    description: string
    role: string
    location: string
  }
  navigation: {
    primaryLinks: string
    preferencesNavigation: string
    languageNavigation: string
    appearanceNavigation: string
    externalLinkNewTab: string
    languages: Record<Locale, string>
    appearance: {
      system: string
      light: string
      dark: string
    }
  }
  home: {
    projects: string
    notes: {
      title: string
      pageTitles: Record<string, string>
      reader: Dictionary['notes']
    }
    bio: { intro: string; process: string; interests: string }
    experience: {
      title: string
      entries: Record<
        'teamIt' | 'clinia' | 'killing',
        {
          role: string
          period: string
          description: string
        }
      >
    }
    contact: {
      description: string
      schedule: string
      roleFit: string
      guestbook: string
      close: string
    }
  }
  guestbook: {
    publicNotice: string
    writeMessage: string
    backToMessages: string
    name: string
    namePlaceholder: string
    message: string
    messagePlaceholder: string
    send: string
    sending: string
    sendingStatus: string
    success: string
    enterName: string
    validName: string
    enterMessage: string
    validMessage: string
    messageRejected: string
    rateLimited: string
    requestDenied: string
    serviceUnavailable: string
    submissionConflict: string
    unableToSend: string
    connectionError: string
    loading: string
    loadingStatus: string
    loadError: string
    retry: string
    empty: string
    seeMore: string
    seeLess: string
    loadingMore: string
    loadingMoreStatus: string
    loadMoreError: string
    loadedMore: string
  }
  notes: {
    closeReading: string
    minimizeToolbar: string
    expandToolbar: string
    toolbarLabel: string
    playerLabel: string
    audioLabel: string
    preparing: string
    buffering: string
    play: string
    pause: string
    speed: string
    seek: string
    retry: string
    audioError: string
    syncUnavailable: string
  }
  fit: {
    description: string
    form: {
      roleDescription: string
      placeholder: string
      assess: string
      assessing: string
      assessment: string
      assessmentReady: string
      emptyDescription: string
      invalidDescription: string
      descriptionRejected: string
      rateLimited: string
      requestDenied: string
      serviceUnavailable: string
      unableToAssess: string
      connectionError: string
      characterCount: string
      scheduleConversation: string
    }
  }
  schedule: {
    description: string
    form: {
      name: string
      email: string
      date: string
      time: string
      namePlaceholder: string
      emailPlaceholder: string
      chooseTime: string
      dateHint: string
      timeHint: string
      enterName: string
      validName: string
      enterEmail: string
      validEmail: string
      chooseDate: string
      futureDate: string
      chooseTimeError: string
      futureTime: string
      conflict: string
      rateLimited: string
      requestDenied: string
      serviceUnavailable: string
      unableToSchedule: string
      connectionError: string
      booking: string
      book: string
      bookingStatus: string
      success: string
      joinMeeting: string
      viewBooking: string
      externalLinkNewTab: string
    }
  }
  projects: {
    repository: string
    externalLinkNewTab: string
  }
  notFound: {
    title: string
    description: string
    home: string
  }
}
