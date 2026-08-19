import { flag } from "@vercel/flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";

export const assessMyFitFlag = flag<boolean>({
  key: "assess-my-fit",
  description: "Controls visibility of the Assess my fit feature.",
  options: [
    { label: "Hide feature", value: false },
    { label: "Show feature", value: true },
  ],
  defaultValue: false,
  adapter: vercelAdapter(),
});
