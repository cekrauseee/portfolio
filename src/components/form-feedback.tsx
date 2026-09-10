const layoutTransitionClassName =
  "grid transition-[grid-template-rows] duration-[180ms] ease-out motion-reduce:transition-none";
const textTransitionClassName =
  "transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none";

export function FieldFeedback({
  error,
  errorId,
  hint,
  hintId,
}: {
  error?: string;
  errorId: string;
  hint?: string;
  hintId?: string;
}) {
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);

  return (
    <div
      className={`${layoutTransitionClassName} ${hasError ? "grid-rows-[0fr_1fr]" : hasHint ? "grid-rows-[1fr_0fr]" : "grid-rows-[0fr_0fr]"}`}
    >
      <div className="min-h-0 overflow-hidden">
        <p
          aria-hidden={!hasHint || hasError}
          className={`${textTransitionClassName} pt-2 text-black/60 dark:text-white/65 ${hasHint && !hasError ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-0"}`}
          id={hintId}
        >
          {hint}
        </p>
      </div>
      <div className="min-h-0 overflow-hidden">
        <p
          aria-hidden={!hasError}
          className={`${textTransitionClassName} pt-2 text-red-700 dark:text-red-400 ${hasError ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-0"}`}
          id={errorId}
        >
          {error}
        </p>
      </div>
    </div>
  );
}

export function FormErrorFeedback({ message }: { message: string }) {
  const hasError = Boolean(message);

  return (
    <div
      className={`${layoutTransitionClassName} ${hasError ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className="min-h-0 overflow-hidden">
        <p
          className={`${textTransitionClassName} pb-5 text-red-700 dark:text-red-400 ${hasError ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-0"}`}
          role="alert"
        >
          {message}
        </p>
      </div>
    </div>
  );
}
