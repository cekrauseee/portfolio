import { MAX_GUESTBOOK_NAME_LENGTH } from "./contract";

export function rememberedGuestbookName(request: Request): string {
  const value = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)guestbook_name=([^;]*)/)?.[1];
  if (!value) {
    return "";
  }
  try {
    const name = decodeURIComponent(value).trim();
    return name.length <= MAX_GUESTBOOK_NAME_LENGTH &&
      !/[\r\n\u0000]/.test(name)
      ? name
      : "";
  } catch {
    return "";
  }
}
export function rememberGuestbookName(response: Response, name: string) {
  response.headers.append(
    "Set-Cookie",
    `guestbook_name=${encodeURIComponent(name)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return response;
}
