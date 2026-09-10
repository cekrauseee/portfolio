import type { Dictionary } from "@/i18n/dictionary";

export const ja: Dictionary = {
  site: {
    title: "cekrause",
    description:
      "リスボンでソフトウェアエンジニアをしています。人やaiエージェントが使うプロダクト、インターフェース、ツールをつくっています。",
    role: "ソフトウェアエンジニア",
    location: "リスボン",
  },
  navigation: {
    primaryLinks: "主なリンク",
    preferencesNavigation: "設定",
    languageNavigation: "言語",
    appearanceNavigation: "表示",
    externalLinkNewTab: "（新しいタブで開きます）",
    languages: { en: "english", pt: "português", ja: "日本語" },
    appearance: { system: "システム", light: "ライト", dark: "ダーク" },
  },
  home: {
    projects: "プロジェクト",
    bio: {
      intro:
        "リスボンでソフトウェアエンジニアをしています。人やaiエージェントが使うプロダクト、インターフェース、ツールをつくっています。",
      process:
        "アイデアを形にするのが好きです。使う人のことを考えながら、細かいところまでつくっています。",
      interests:
        "主にtypescriptとnode.jsを使っています。最近は、aiエージェントが連携して働く仕組みや、必要な文脈を引き継ぐ方法を試しています。",
    },
    experience: {
      title: "これまでの仕事",
      entries: {
        teamIt: {
          role: "ソフトウェアエンジニア",
          period: "2026年2月–7月",
          description:
            "面接を手助けするデスクトップaiアシスタントをつくりました。研究開発の責任者と必要な機能を考え、開発からmicrosoft storeでの公開まで担当しました。会社を離れるころには、一部のコンサルタントが実際の会議で使っていました。",
        },
        clinia: {
          role: "ソフトウェアエンジニア",
          period: "2023年11月–2025年11月",
          description:
            "インターンとして入り、そのままエンジニアとして働きました。クリニック向けのソフトウェアで、画面上で組み立てる自動化の仕組みや、初めてのaiエージェントの開発に携わりました。システムを安定させる作業や、バックエンドとaiの設計の見直しにも取り組みました。",
        },
        killing: {
          role: "itインターン",
          period: "2022年9月–2023年4月",
          description:
            "itサポートの仕事をしながら、顧客訪問用のチェックリストアプリをつくり、実際の業務で使われるようになりました。工場設備の状態を確認するツールも試作しました。",
        },
      },
    },
    contact: {
      close: "閉じる",
      description:
        "転職やフリーランスの仕事のお話も歓迎しています。今取り組んでいることを、聞かせてもらえたらうれしいです。",
      schedule: "話す時間を予約",
      roleFit: "求人と経験を比べる",
      guestbook: "ゲストブック",
    },
  },
  guestbook: {
    publicNotice: "ここに投稿したメッセージは公開されます。",
    writeMessage: "メッセージを残す",
    backToMessages: "メッセージ一覧に戻る",
    name: "名前またはニックネーム",
    namePlaceholder: "alex",
    message: "メッセージ",
    messagePlaceholder: "ひとこと残す…",
    send: "投稿する",
    sending: "送信中…",
    sendingStatus: "メッセージを送信しています。",
    success: "メッセージをゲストブックに追加しました。",
    enterName: "名前またはニックネームを入力してください。",
    validName: "名前またはニックネームは80文字以内で入力してください。",
    enterMessage: "送信するメッセージを入力してください。",
    validMessage: "メッセージは500文字以内で入力してください。",
    messageRejected:
      "このメッセージは投稿できません。表現を変えてお試しください。",
    rateLimited:
      "短時間に送信できる回数を超えました。少し待ってからもう一度お試しください。",
    requestDenied: "このメッセージを投稿できませんでした。",
    serviceUnavailable:
      "現在、ゲストブックを利用できません。しばらくしてからもう一度お試しください。",
    submissionConflict:
      "この送信を再試行できませんでした。もう一度送信してください。",
    unableToSend: "メッセージを投稿できませんでした。もう一度お試しください。",
    connectionError:
      "メッセージを投稿できませんでした。接続を確認して、もう一度お試しください。",
    loading: "メッセージを読み込み中…",
    loadingStatus: "ゲストブックのメッセージを読み込んでいます。",
    loadError: "ゲストブックを読み込めませんでした。もう一度お試しください。",
    retry: "もう一度試す",
    empty: "まだメッセージはありません。",
    seeMore: "もっと見る",
    seeLess: "折りたたむ",
    loadingMore: "さらに読み込み中…",
    loadingMoreStatus: "ゲストブックのメッセージをさらに読み込んでいます。",
    loadMoreError:
      "追加のメッセージを読み込めませんでした。もう一度お試しください。",
    loadedMore: "追加のメッセージを読み込みました。",
  },
  fit: {
    description: "募集内容を貼り付けると、これまでの仕事と照らし合わせます。",
    form: {
      roleDescription: "募集内容",
      placeholder:
        "シニアソフトウェアエンジニア\ntypescriptで信頼性の高いプロダクトを開発…",
      assess: "求人と経験を比べる",
      assessing: "求人と経験を比較中…",
      assessment: "経験との比較",
      assessmentReady: "比較結果ができました。",
      emptyDescription: "求人やプロジェクトの説明を貼り付けてください。",
      invalidDescription: "募集内容は16,000文字以内にしてください。",
      descriptionRejected:
        "この内容では比較できません。求人やプロジェクトの説明だけを入力してください。",
      rateLimited:
        "続けて比較できる回数を超えました。少し待ってからもう一度お試しください。",
      requestDenied: "この求人と経験を比較できませんでした。",
      serviceUnavailable:
        "現在、求人と経験を比較できません。しばらくしてからもう一度お試しください。",
      unableToAssess: "比較できませんでした。もう一度お試しください。",
      connectionError:
        "比較できませんでした。接続を確認して、もう一度お試しください。",
      characterCount: "{count} / {max}文字",
      scheduleConversation: "話す時間を予約",
    },
  },
  schedule: {
    title: "話す時間を予約",
    description:
      "話せる日時を選んでください。1時間ほどお話しできればと思っています。",
    back: "戻る",
    form: {
      name: "名前",
      email: "メールアドレス",
      date: "日付",
      time: "時刻",
      namePlaceholder: "alex morgan",
      emailPlaceholder: "alex@example.com",
      chooseTime: "時刻を選択",
      dateHint: "日時はお使いのタイムゾーンで表示されます。",
      timeHint: "選択した時刻から1時間です。",
      enterName: "名前を入力してください。",
      validName: "名前は2文字以上120文字以内で入力してください。",
      enterEmail: "メールアドレスを入力してください。",
      validEmail: "有効なメールアドレスを入力してください。",
      chooseDate: "日付を選択してください。",
      futureDate: "今日以降の日付を選択してください。",
      chooseTimeError: "時刻を選択してください。",
      futureTime: "現在より後の時刻を選択してください。",
      conflict: "その時間は予約できなくなりました。別の時間を選んでください。",
      rateLimited:
        "続けて予約できる回数を超えました。少し待ってからもう一度お試しください。",
      requestDenied: "予約できませんでした。",
      serviceUnavailable:
        "現在、予約できません。しばらくしてからもう一度お試しください。",
      unableToSchedule:
        "予約できませんでした。入力内容を確認して、もう一度お試しください。",
      connectionError:
        "予約できませんでした。接続を確認して、もう一度お試しください。",
      booking: "予約中…",
      book: "話す時間を予約",
      bookingStatus: "予約しています。",
      success: "予約ができました。カレンダーへの招待メールをご確認ください。",
      meetingDetails: "予約の詳細を見る",
      externalLinkNewTab: "（新しいタブで開きます）",
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
    description: "このアドレスのページは見つかりませんでした。",
    home: "ポートフォリオに戻る",
  },
};
