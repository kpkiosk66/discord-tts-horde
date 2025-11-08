import "dotenv/config";
import fs from "fs";

const CHILD_TOKEN_PATH = process.env.CHILD_TOKEN_PATH;
if (!CHILD_TOKEN_PATH) {
  throw new Error("CONFIG_PATH environment variable not set");
}

const raw = fs.readFileSync(CHILD_TOKEN_PATH, "utf8");
const child_tokens = JSON.parse(raw);

export interface botCredential {
  token: string;
  app_id: string;
  identifier: string;
}

export interface configInterface {
  guild: {
    id: string;
  };
  master: botCredential;
  child: botCredential[];
  language: string;
  notice_message: string;
}

export const config: configInterface = {
  guild: { id: process.env.GUILD_ID || "" },
  master: {
    token: process.env.MASTER_BOT_TOKEN || "",
    app_id: process.env.MASTER_APP_ID || "",
    identifier: "ยานแม่",
  },
  child: child_tokens,
  language: process.env.LANGUAGE || "en-US",
  notice_message: process.env.NOTICE_MESSAGE || "{user} join the channel",
};
