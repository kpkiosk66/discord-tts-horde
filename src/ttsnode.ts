import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import fetch from "node-fetch";

import { Channel, Client, GatewayIntentBits, Message } from "discord.js";
import { botCredential, config } from "./config.js";

import { createWriteStream, unlinkSync, existsSync, mkdirSync } from "fs";

const TEMP_DIR = "./temp";

export class TTSNode {
  client: Client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
  player: AudioPlayer | null = null;
  connection: VoiceConnection | null = null;
  connected_channel: Channel | undefined = undefined;
  source_channel_id: string = "";
  message_queue: any[] = [];
  //require input
  secret: botCredential;

  constructor(credential: botCredential) {
    //used when summon

    this.secret = credential;

    this.client.login(this.secret.token);

    this.client.once("ready", async () => {
      if (this.client.user) {
        console.log(`${this.client.user.tag} Online`);
      }
    });
  }

  public join(channel_id: string, masterClient: Client) {
    this.source_channel_id = channel_id;
    console.log(channel_id);
    this.client.channels.fetch(this.source_channel_id).then((channel) => {
      this.connected_channel = channel || undefined;
      if (this.connected_channel && this.connected_channel.type === 2) {
        this.connection = joinVoiceChannel({
          channelId: this.connected_channel.id,
          guildId: this.connected_channel.guildId,
          group: this.secret.identifier,
          adapterCreator: this.connected_channel.guild.voiceAdapterCreator,
        });
        this.player = createAudioPlayer();
        this.connection.subscribe(this.player);
      }
    });
    // this.connected_channel = this.client.channels.cache.get(
    //   this.source_channel_id
    // );
    // if (this.connected_channel && this.connected_channel.type === 2) {
    //   this.connection = joinVoiceChannel({
    //     channelId: this.connected_channel.id,
    //     guildId: this.connected_channel.guildId,
    //     group: this.secret.identifier,
    //     adapterCreator: this.connected_channel.guild.voiceAdapterCreator,
    //   });
    //   this.player = createAudioPlayer();
    //   this.connection.subscribe(this.player);
    // }
  }

  public quit() {
    if (this.player) {
      this.player.stop();
    }

    if (this.connection) {
      this.connection.destroy();
    }
  }

  public pass() {
    if (this.player) {
      this.player.stop();
    }
  }

  public async fetchAndQueueTTS(messageContent: string): Promise<void> {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th-TH&client=tw-ob&q=${encodeURIComponent(
      messageContent
    )}`;
    const ttsFileName = `tts_${Date.now()}.mp3`;
    const ttsFilePath = `${TEMP_DIR}/${ttsFileName}`;
    const writer = createWriteStream(ttsFilePath);

    try {
      const response = await fetch(url);
      await new Promise<void>((resolve, reject) => {
        response.body?.pipe(writer);
        writer.on("finish", () => resolve());
        writer.on("error", (err: Error) => reject(err));
      });
      this.message_queue.push(ttsFilePath);
      if (this.player?.state.status === AudioPlayerStatus.Idle) {
        this.playNextTTS();
      }
    } catch (error) {
      console.error("Error generating TTS audio:", error);
    }
  }

  public async playNextTTS(): Promise<void> {
    if (this.source_channel_id === "" || this.message_queue.length === 0) {
      return;
    }
    const ttsFilePath = this.message_queue.shift();
    if (ttsFilePath) {
      const resource = createAudioResource(ttsFilePath);
      this.player?.play(resource);
      this.player?.once(AudioPlayerStatus.Idle, () => {
        // console.log("TTS Audio Finished");
        unlinkSync(ttsFilePath);
        this.playNextTTS();
      });
    }
  }
}
