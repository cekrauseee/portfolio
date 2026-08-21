"use client";

import { mutedButtonClassName } from "@/components/links";
import { localeTag, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { GlobePoint } from "@/features/guestbook/globe/geometry";

type GlobeDictionary = Dictionary["guestbook"]["globe"];

function messageCount(template: string, count: number, locale: Locale) {
  return template.replace("{count}", count.toLocaleString(localeTag(locale)));
}

export function HoverTooltip({
  point,
  dictionary,
  locale,
}: {
  point: GlobePoint;
  dictionary: GlobeDictionary;
  locale: Locale;
}) {
  const firstMessage = point.messages[0];
  const location = [firstMessage.city, firstMessage.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="bg-background text-foreground pointer-events-none w-max max-w-56 -translate-y-8 px-3 py-2 text-center text-sm leading-5 break-words select-none">
      <p className="font-medium text-pretty">
        {point.messages.length === 1
          ? firstMessage.name
          : messageCount(
              dictionary.messageCountMany,
              point.messages.length,
              locale,
            )}
      </p>
      {location ? (
        <p className="mt-0.5 text-xs leading-4 text-pretty text-black/60 dark:text-white/65">
          {location}
        </p>
      ) : null}
    </div>
  );
}

export function MessagePanel({
  point,
  dictionary,
  locale,
  onClose,
}: {
  point: GlobePoint;
  dictionary: GlobeDictionary;
  locale: Locale;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label={dictionary.visitorMessages}
      className="bg-background text-foreground absolute [inset-inline-start:calc(1rem+env(safe-area-inset-left))] [inset-inline-end:calc(1rem+env(safe-area-inset-right))] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex max-h-[min(60dvh,28rem)] flex-col p-4 outline outline-black/10 sm:[inset-inline-start:auto] sm:w-80 dark:outline-white/15"
      onWheel={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">
            {point.id === "all-messages"
              ? dictionary.visitorMessages
              : point.messages.length === 1
                ? dictionary.message
                : messageCount(
                    dictionary.nearbyMessages,
                    point.messages.length,
                    locale,
                  )}
          </h2>
          {point.id !== "all-messages" ? (
            <p className="mt-1 text-xs text-black/55 dark:text-white/55">
              {[point.messages[0].city, point.messages[0].country]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}
        </div>
        <button
          autoFocus
          type="button"
          className={`${mutedButtonClassName} inline-flex min-h-8 shrink-0 items-center text-sm`}
          onClick={onClose}
        >
          {dictionary.close}
        </button>
      </header>

      <div className="mt-5 min-h-0 overflow-y-auto overscroll-contain pr-2">
        <div className="flex flex-col gap-6">
          {point.messages.map((message) => {
            const location = [message.city, message.country]
              .filter(Boolean)
              .join(", ");

            return (
              <article key={message.id}>
                <header>
                  <h3 className="text-sm font-medium">{message.name}</h3>
                  {location && point.id === "all-messages" ? (
                    <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                      {location}
                    </p>
                  ) : null}
                </header>
                <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap text-black/75 dark:text-white/85">
                  {message.message}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
