import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/api/fit", method: "POST" },
    { path: "/api/meetings", method: "POST" },
  ],
});
