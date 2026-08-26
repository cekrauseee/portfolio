import type { Dictionary } from "@/i18n/dictionary";

export const ja: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "リスボンを拠点に、人とエージェントのためのプロダクト、インターフェース、ツールを丁寧につくるソフトウェアエンジニア。",
    role: "ソフトウェアエンジニア",
    location: "リスボン",
    profileSummary: "{location}を拠点とする{role}。",
  },
  navigation: {
    primaryLinks: "主なリンク",
    preferencesNavigation: "設定",
    languageNavigation: "言語",
    appearanceNavigation: "表示",
    externalLinkNewTab: "（新しいタブで開きます）",
    languages: { en: "English", pt: "Português", ja: "日本語" },
    appearance: { system: "システム", light: "ライト", dark: "ダーク" },
  },
  home: {
    assessFit: "適性を確認",
    scheduleConversation: "面談を予約",
    leaveMessage: "地球儀にメッセージを残す",
    projects: "プロジェクト",
    readProjectNotes: "プロジェクトの記録を読む",
  },
  fit: {
    title: "適性を確認",
    description: "募集内容を貼り付けると、経験との適性を比較できます。",
    back: "戻る",
    form: {
      roleDescription: "募集内容",
      placeholder: "5年以上の経験を持つシニアソフトウェアエンジニア",
      assess: "適性を確認",
      assessing: "適性を確認中…",
      assessment: "適性の評価",
      assessmentReady: "適性の評価が完了しました。",
      emptyDescription: "適性を確認する前に、募集内容を貼り付けてください。",
      invalidDescription: "募集内容は16,000文字以内で入力してください。",
      descriptionRejected:
        "この内容は仕事の機会として評価できません。募集またはプロジェクトの説明のみを入力してください。",
      rateLimited:
        "適性確認の試行回数が多すぎます。少し待ってからもう一度お試しください。",
      requestDenied: "この募集内容の適性を確認できませんでした。",
      serviceUnavailable:
        "現在、適性を確認できません。しばらくしてからもう一度お試しください。",
      unableToAssess: "適性を確認できませんでした。もう一度お試しください。",
      connectionError:
        "適性を確認できませんでした。接続を確認して、もう一度お試しください。",
      characterCount: "{count} / {max}",
      scheduleConversation: "面談を予約",
    },
  },
  schedule: {
    title: "面談を予約",
    description: "Henrique Krauseとの1時間の面談の時間を選択してください。",
    back: "戻る",
    form: {
      name: "名前",
      email: "メールアドレス",
      date: "日付",
      time: "時刻",
      namePlaceholder: "Alex Morgan",
      emailPlaceholder: "alex@example.com",
      chooseTime: "時刻を選択",
      dateHint:
        "すべての日付を選択できます。時刻はお使いのタイムゾーンで表示されます。",
      timeHint: "選択した時刻から1時間です。",
      enterName: "名前を入力してください。",
      validName: "名前は2文字以上120文字以内で入力してください。",
      enterEmail: "メールアドレスを入力してください。",
      validEmail: "有効なメールアドレスを入力してください。",
      chooseDate: "日付を選択してください。",
      futureDate: "今日以降の日付を選択してください。",
      chooseTimeError: "時刻を選択してください。",
      futureTime: "現在より後の時刻を選択してください。",
      conflict:
        "その時刻は利用できなくなりました。別の時刻を選択してください。",
      rateLimited:
        "予約の試行回数が多すぎます。少し待ってからもう一度お試しください。",
      requestDenied: "この面談を予約できませんでした。",
      serviceUnavailable:
        "現在、面談を予約できません。しばらくしてからもう一度お試しください。",
      unableToSchedule:
        "面談を予約できませんでした。入力内容を確認して、もう一度お試しください。",
      connectionError:
        "面談を予約できませんでした。接続を確認して、もう一度お試しください。",
      booking: "面談を予約中…",
      book: "面談を予約",
      bookingStatus: "面談を予約しています。",
      success:
        "面談を予約しました。カレンダーの招待状をメールでご確認ください。",
      meetingDetails: "面談の詳細を開く",
      externalLinkNewTab: "（新しいタブで開きます）",
    },
  },
  guestbook: {
    title: "訪問者からのメッセージ",
    description:
      "地球儀にメッセージを残してください。世界中の訪問者が光の点として表示されます。",
    back: "戻る",
    newTitle: "メッセージを残す",
    newDescription: "地球儀に表示されるメッセージを残せます。",
    backToGlobe: "地球儀に戻る",
    form: {
      name: "名前",
      message: "メッセージ",
      namePlaceholder: "Alex Morgan",
      messagePlaceholder: "あなたの仕事についてもっと知りたいです。",
      enterName: "名前を入力してください。",
      nameTooLong: "名前は{max}文字以内で入力してください。",
      writeMessage: "メッセージを入力してください。",
      messageTooLong: "メッセージは{max}文字以内で入力してください。",
      contentRejected:
        "このメッセージは公開できません。名前とメッセージを見直して、もう一度お試しください。",
      locationUnavailable:
        "メッセージを地球儀のどこに表示するか判定できませんでした。しばらくしてからもう一度お試しください。",
      rateLimited:
        "公開の試行回数が多すぎます。少し待ってからもう一度お試しください。",
      requestDenied: "このメッセージを公開できませんでした。",
      serviceUnavailable:
        "現在、メッセージを公開できません。しばらくしてからもう一度お試しください。",
      unableToPublish:
        "メッセージを公開できませんでした。しばらくしてからもう一度お試しください。",
      connectionError:
        "メッセージを公開できませんでした。接続を確認して、もう一度お試しください。",
      publishing: "公開中…",
      publish: "メッセージを公開",
      publishingStatus: "メッセージを公開しています。",
      success: "メッセージを地球儀に表示しました。",
      redirecting: "メッセージを地球儀に表示しました。移動中…",
    },
    globe: {
      loading: "地球儀を読み込み中",
      loadBordersError: "国境を読み込めませんでした。",
      leaveMessage: "メッセージを残す",
      centerGlobe: "地球儀を中央に戻す",
      centering: "中央に移動中…",
      useMyLocation: "現在地を使う",
      requestingLocation: "現在地を確認中…",
      locationDenied:
        "位置情報へのアクセスが拒否されました。ブラウザの権限または設定を確認してください。",
      locationUnavailable: "位置情報を利用できません。もう一度お試しください。",
      messageCountOne: "{count}件のメッセージ",
      messageCountMany: "{count}件のメッセージ",
      visitorMessages: "訪問者からのメッセージ",
      message: "メッセージ",
      nearbyMessages: "近くのメッセージ（{count}件）",
      close: "閉じる",
      empty: "まだメッセージはありません。最初のメッセージを残してください。",
    },
  },
  projects: {
    portfolio: "ポートフォリオ",
    repository: "リポジトリ",
    projectNotes: "プロジェクトの記録",
    back: "戻る",
    projectNotesAlt: "{name}のプロジェクトの記録",
    externalLinkNewTab: "（新しいタブで開きます）",
  },
  notFound: {
    title: "ページが見つかりません",
    description: "このアドレスには何もありません。",
    home: "ポートフォリオに戻る",
  },
};
