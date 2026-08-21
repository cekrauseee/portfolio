"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { MessageForm } from "@/features/guestbook/message-form";

export function NewMessage({
  locale,
  dictionary,
  retry,
}: {
  locale: Locale;
  dictionary: Dictionary["guestbook"]["form"];
  retry: Dictionary["retry"];
}) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitted = useCallback(() => {
    setSubmitted(true);
    setTimeout(() => router.push("/guestbook"), 1500);
  }, [router]);

  if (submitted) {
    return (
      <p className="text-sm text-black/75 dark:text-white/85">
        {dictionary.redirecting}
      </p>
    );
  }

  return (
    <MessageForm
      locale={locale}
      dictionary={dictionary}
      retry={retry}
      onSubmitted={handleSubmitted}
    />
  );
}
