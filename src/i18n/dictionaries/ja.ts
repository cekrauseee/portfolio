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
    },
    guestbook: {
      title: "ゲストブック",
    },
  },
  fit: {
    title: "求人と経験を比べる",
    description:
      "求人の説明を貼り付けると、私の経験とどのくらい合っているかを確認できます。",
    back: "戻る",
    form: {
      roleDescription: "募集内容",
      placeholder: "5年以上の経験を持つシニアソフトウェアエンジニア",
      assess: "求人と経験を比べる",
      assessing: "求人と経験を比較中…",
      assessment: "比較結果",
      assessmentReady: "比較結果ができました。",
      emptyDescription: "求人やプロジェクトの説明を貼り付けてください。",
      invalidDescription: "募集内容は16,000文字以内で入力してください。",
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
      characterCount: "{count} / {max}",
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
  guestbook: {
    title: "訪れた人のメッセージ",
    description:
      "ここにメッセージを残せます。一つひとつのメッセージが、地球儀の上に光の点として表示されます。",
    back: "戻る",
    newTitle: "メッセージを残す",
    newDescription:
      "地球儀に残すメッセージを書いてください。サイトを訪れた人なら誰でも読めます。",
    backToGlobe: "地球儀に戻る",
    form: {
      name: "名前",
      message: "メッセージ",
      namePlaceholder: "alex morgan",
      messagePlaceholder: "プロジェクト、楽しく見させてもらいました。",
      enterName: "名前を入力してください。",
      nameTooLong: "名前は{max}文字以内で入力してください。",
      writeMessage: "メッセージを入力してください。",
      messageTooLong: "メッセージは{max}文字以内で入力してください。",
      contentRejected:
        "このメッセージは公開できません。名前とメッセージを見直して、もう一度お試しください。",
      locationUnavailable:
        "地球儀に表示する位置を確認できませんでした。しばらくしてからもう一度お試しください。",
      rateLimited:
        "続けて投稿できる回数を超えました。少し待ってからもう一度お試しください。",
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
      redirecting: "メッセージを公開しました。地球儀に戻ります…",
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
      visitorMessages: "訪れた人のメッセージ",
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
    description: "このアドレスのページは見つかりませんでした。",
    home: "ポートフォリオに戻る",
  },
};
