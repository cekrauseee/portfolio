import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/api/fit", method: "POST" },
    { path: "/api/meetings", method: "POST" },
    { path: "/api/guestbook", method: "POST" },
    { path: "/api/visitor-globe", method: "POST" },
  ],
});
