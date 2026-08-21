"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageForm } from "@/features/guestbook/message-form";

export function NewMessage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitted = useCallback(() => {
    setSubmitted(true);
    setTimeout(() => router.push("/guestbook"), 1500);
  }, [router]);

  if (submitted) {
    return (
      <p className="text-sm text-black/75 dark:text-white/85">
        Your message is on the globe. Redirecting…
      </p>
    );
  }

  return <MessageForm onSubmitted={handleSubmitted} />;
}
