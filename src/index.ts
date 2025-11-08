import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Interaction,
  CommandInteraction,
  Message,
  VoiceChannel,
  VoiceBasedChannel,
  Guild,
  VoiceState,
} from "discord.js";
import fetch from "node-fetch";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
} from "@discordjs/voice";
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from "fs";
import { promisify } from "util";
import os from "os";
import path from "path";
import { TTSNode } from "./ttsnode.js";
import {
  cleanEmojiString,
  cleanOutsideEmojiString,
  hasMultipleFives,
  markdownToPlainText,
  replaceConsecutiveFives,
} from "./helper.js";

const TEMP_DIR = "./temp";
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR);
}

const masterClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

import { botCredential, config } from "./config.js";

interface TTSMap {
  [key: string]: TTSNode;
}

const workerMap: TTSMap = {};
const freeWorker: TTSNode[] = [];
const secretList: botCredential[] = JSON.parse(JSON.stringify(config.child));

masterClient.once("ready", async () => {
  if (masterClient.user) {
    console.log(`Master logged in as ${masterClient.user.tag}`);
    console.log(`TTS node available ${secretList.length}`);
  }
});

masterClient.on(
  "voiceStateUpdate",
  async (oldState: VoiceState, newState: VoiceState) => {
    const memberNextChannelId = newState.member?.voice?.channelId || "";
    const oldId = oldState.channelId || "";
    const oldWorker = workerMap[oldId];
    const newId = newState.channelId;
    if (
      oldWorker &&
      oldId &&
      newState.member?.user?.id === oldWorker.client?.user?.id &&
      !newId
    ) {
      freeWorker.push(workerMap[oldId]);
      workerMap[oldId].quit();
      delete workerMap[oldId];
    } else if (
      memberNextChannelId in workerMap &&
      newState.member?.voice.channelId &&
      oldState.mute === newState.mute &&
      oldState.selfDeaf === newState.selfDeaf &&
      oldState.selfVideo === newState.selfVideo &&
      oldState.streaming === newState.streaming
    ) {
      let nickname = newState?.member?.nickname || "";
      let messageToSpeak = config.notice_message;
      messageToSpeak = messageToSpeak.replaceAll("{user}", nickname);
      workerMap[newState.member?.voice?.channelId]?.fetchAndQueueTTS(
        messageToSpeak
      );
    }
  }
);

masterClient.on("messageCreate", async (message: Message) => {
  const channelId = message?.channel?.id;

  if (channelId && message.content && !message.author.bot) {
    try {
      // filter possibly long url stuff from message
      let msg = markdownToPlainText(message.content);
      let tok = msg.split(" ");
      for (let i in tok) {
        if (tok[i][0] === ">") {
          tok[i] = "";
        } else if (tok[i].includes("http")) {
          // clean url in text
          tok[i] = "link";
        } else if (tok[i].includes("<:")) {
          tok[i] = cleanEmojiString(tok[i]);
        } else if (tok[i].includes("<a")) {
          tok[i] = cleanOutsideEmojiString(tok[i]);
        } else if (tok[i].includes("<@")) {
          // clean mentions in text
          tok[i] = "";
        } else if (tok[i].includes("<#")) {
          // clean channel mention in text
          tok[i] = "";
        } else if (hasMultipleFives(tok[i]) > 3) {
          // handle thai language laughing with 5555 and annoy people
          tok[i] = replaceConsecutiveFives(tok[i]);
        }
      }
      msg = tok.join(" ");
      if (channelId in workerMap) {
        workerMap[channelId].fetchAndQueueTTS(msg);
      }
    } catch (error) {
      5;
      console.error("Error generating or playing TTS audio:", error);
    }
  }
});

masterClient.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;
  let channel_id = interaction.channelId;
  if (interaction.commandName === "debug") {
    await interaction.reply("breakpoint hit");
  }
  if (interaction.commandName === "summon") {
    try {
      if (channel_id in workerMap) {
        await interaction.reply("tts worker already summoned to this channel");
        return;
      }
      if (interaction.channel?.type !== 2) {
        await interaction.reply("cannot summon tts worker into text channel");
        return;
      }
      const worker = freeWorker.pop();
      if (worker) {
        await interaction.reply(`tts worker joined`);
        workerMap[channel_id] = worker;
        workerMap[channel_id].join(channel_id, masterClient);
      } else {
        await interaction.reply("no free tts worker to join this channel");
      }
    } catch (error) {
      console.log("Bot join fail");
      await interaction.reply("tts worker failed to join this channel");
    }
  }

  if (interaction.commandName === "quit") {
    if (channel_id in workerMap) {
      freeWorker.push(workerMap[channel_id]);
      workerMap[channel_id].quit();
      delete workerMap[channel_id];
      await interaction.reply(`tts worker leave the channel`);
    } else {
      await interaction.reply(
        "tts worker is not in this channel, thus cannot leave"
      );
    }
  }

  if (interaction.commandName === "quitall") {
    for (let channel_id in workerMap) {
      freeWorker.push(workerMap[channel_id]);
      workerMap[channel_id].quit();
      delete workerMap[channel_id];
      await interaction.reply(`tts worker leave the channel`);
    }
  }

  if (interaction.commandName === "pass") {
    if (channel_id in workerMap) {
      if (
        workerMap[channel_id].player &&
        workerMap[channel_id].player.state.status !== AudioPlayerStatus.Idle
      ) {
        workerMap[channel_id].pass();
        await interaction.reply("skip current message");
      } else {
        await interaction.reply("no message to skip");
      }
    } else {
      await interaction.reply(
        "tts worker is not in this channel, thus cannot skip"
      );
    }
  }

  if (interaction.commandName === "list") {
    await interaction.reply(`free tts worker: ${freeWorker.length}`);
  }
});

(async () => {
  const commands = [
    new SlashCommandBuilder()
      .setName("summon")
      .setDescription(
        "Create an instance of worker bot to join the voice channel."
      ),
    new SlashCommandBuilder()
      .setName("quit")
      .setDescription("Remove worker bot from voice channel"),
    new SlashCommandBuilder()
      .setName("quitall")
      .setDescription("Remove all worker bot from voice channel"),
    new SlashCommandBuilder()
      .setName("pass")
      .setDescription("Skip the current TTS message"),
    new SlashCommandBuilder().setName("debug").setDescription("For debugging"),
    new SlashCommandBuilder()
      .setName("list")
      .setDescription("Show list of free TTS workers"),
  ];

  const rest = new REST({ version: "10" }).setToken(config?.master?.token);

  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(config.master.app_id), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

//initiate master node
masterClient.login(config.master.token);
for (let i in secretList) {
  const node = new TTSNode(secretList[i]);
  freeWorker.push(node);
}
