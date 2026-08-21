import {
  themePreferences,
  THEME_COOKIE_NAME,
  THEME_MEDIA_QUERY,
} from "@/theme/config";

const themeScript = `(function(){try{var root=document.documentElement;var match=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]*)/);var preference=match?decodeURIComponent(match[1]):"system";if(!${JSON.stringify(themePreferences)}.includes(preference)){preference="system"}root.dataset.theme=preference;root.classList.toggle("dark",preference==="dark"||(preference==="system"&&window.matchMedia(${JSON.stringify(THEME_MEDIA_QUERY)}).matches))}catch(e){}})()`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
