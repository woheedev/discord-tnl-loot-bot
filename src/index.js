import {
  Client,
  GatewayIntentBits,
  ApplicationCommandOptionType,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import dotenv from "dotenv";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import { initializeDb, getIngameName } from "./utils/db.js";
import { Logger } from "./utils/logger.js";

dotenv.config();

const AUTHORIZED_ROLES = {
  LEADERSHIP: "1309271313398894643",
  //OFFICER: "1309284427553312769",
  LOOTCOUNCIL: "1322046352410279987",
};

const BACKGROUND_IMAGE = "./images/background.png"; // or .webp
const TEMP_DIR = "./temp";

const ITEM_CATEGORIES = {
  WEAPON: "Weapon",
  HEAD: "Head",
  CLOAK: "Cloak",
  CHEST: "Chest",
  HANDS: "Hands",
  LEGS: "Legs",
  FEET: "Feet",
  NECKLACE: "Necklace",
  BRACELET: "Bracelet",
  RING: "Ring",
  BELT: "Belt",
};

const ROLE_TO_FORUM = {
  "1315072149173698580": {
    channel: "LOOT_CHANNEL_ID",
    enabled: false,
    name: "Tsunami",
    tags: {
      [ITEM_CATEGORIES.WEAPON]: "TAG_ID_1",
      [ITEM_CATEGORIES.HEAD]: "TAG_ID_2",
      [ITEM_CATEGORIES.CLOAK]: "TAG_ID_3",
      [ITEM_CATEGORIES.CHEST]: "TAG_ID_4",
      [ITEM_CATEGORIES.HANDS]: "TAG_ID_5",
      [ITEM_CATEGORIES.LEGS]: "TAG_ID_6",
      [ITEM_CATEGORIES.FEET]: "TAG_ID_7",
      [ITEM_CATEGORIES.NECKLACE]: "TAG_ID_8",
      [ITEM_CATEGORIES.BRACELET]: "TAG_ID_9",
      [ITEM_CATEGORIES.RING]: "TAG_ID_10",
      [ITEM_CATEGORIES.BELT]: "TAG_ID_11",
    },
  },
  "1315071746721976363": {
    channel: "1327037804663930890",
    enabled: true,
    name: "Hurricane",
    tags: {
      [ITEM_CATEGORIES.WEAPON]: "1327038422791225364",
      [ITEM_CATEGORIES.HEAD]: "1327038433008418866",
      [ITEM_CATEGORIES.CLOAK]: "1327038444483907604",
      [ITEM_CATEGORIES.CHEST]: "1327038454672130048",
      [ITEM_CATEGORIES.HANDS]: "1327038466478964786",
      [ITEM_CATEGORIES.LEGS]: "1327038479133311009",
      [ITEM_CATEGORIES.FEET]: "1327038492085063690",
      [ITEM_CATEGORIES.NECKLACE]: "1327038503380582441",
      [ITEM_CATEGORIES.BRACELET]: "1327038515707641907",
      [ITEM_CATEGORIES.RING]: "1327038528634491031",
      [ITEM_CATEGORIES.BELT]: "1327038539124179115",
    },
  },
  "1314816353797935214": {
    channel: "1319890640825356362",
    enabled: true,
    name: "Avalanche",
    tags: {
      [ITEM_CATEGORIES.WEAPON]: "1319911319251582976",
      [ITEM_CATEGORIES.HEAD]: "1319911380903657512",
      [ITEM_CATEGORIES.CLOAK]: "1319911398926712862",
      [ITEM_CATEGORIES.CHEST]: "1319911419147452526",
      [ITEM_CATEGORIES.HANDS]: "1319911435933057095",
      [ITEM_CATEGORIES.LEGS]: "1319911451384746028",
      [ITEM_CATEGORIES.FEET]: "1319911471760539648",
      [ITEM_CATEGORIES.NECKLACE]: "1319911490874249247",
      [ITEM_CATEGORIES.BRACELET]: "1319911511262625863",
      [ITEM_CATEGORIES.RING]: "1319911526110462053",
      [ITEM_CATEGORIES.BELT]: "1319911539012014121",
    },
  },
  "1315072176839327846": {
    channel: "LOOT_CHANNEL_ID",
    enabled: false,
    name: "Hailstorm",
    tags: {
      [ITEM_CATEGORIES.WEAPON]: "TAG_ID_1",
      [ITEM_CATEGORIES.HEAD]: "TAG_ID_2",
      [ITEM_CATEGORIES.CLOAK]: "TAG_ID_3",
      [ITEM_CATEGORIES.CHEST]: "TAG_ID_4",
      [ITEM_CATEGORIES.HANDS]: "TAG_ID_5",
      [ITEM_CATEGORIES.LEGS]: "TAG_ID_6",
      [ITEM_CATEGORIES.FEET]: "TAG_ID_7",
      [ITEM_CATEGORIES.NECKLACE]: "TAG_ID_8",
      [ITEM_CATEGORIES.BRACELET]: "TAG_ID_9",
      [ITEM_CATEGORIES.RING]: "TAG_ID_10",
      [ITEM_CATEGORIES.BELT]: "TAG_ID_11",
    },
  },
};

const REACTION_EMOJIS = {
  MAIN_ITEM: "🏅",
  MAIN_UNLOCK: "🔓",
  MAIN_TRAIT: "🧬",
  OFF_ITEM: "🥈",
  OFF_UNLOCK: "🔑",
  OFF_TRAIT: "🧪",
  LITHO_GREED: "📖",
};

const EMOJI_DESCRIPTIONS = {
  MAIN_ITEM: "Need the item for your main build",
  MAIN_UNLOCK: "Need to unlock a trait for main build",
  MAIN_TRAIT: "Need the base trait for main build",
  OFF_ITEM: "Need the item for offbuild / pve",
  OFF_UNLOCK: "Need to unlock a trait for offbuild / pve",
  OFF_TRAIT: "Need the base trait for offbuild / pve",
  LITHO_GREED: "Litho collection or general greed",
};

const ROLL_OPTIONS = {
  MAIN_ITEM: "mainitem",
  MAIN_UNLOCK: "mainunlock",
  MAIN_TRAIT: "maintrait",
  OFF_ITEM: "offitem",
  OFF_UNLOCK: "offunlock",
  OFF_TRAIT: "offtrait",
  LITHO_GREED: "lithogreed",
};

const ROLL_TO_EMOJI = {
  [ROLL_OPTIONS.MAIN_ITEM]: REACTION_EMOJIS.MAIN_ITEM,
  [ROLL_OPTIONS.MAIN_UNLOCK]: REACTION_EMOJIS.MAIN_UNLOCK,
  [ROLL_OPTIONS.MAIN_TRAIT]: REACTION_EMOJIS.MAIN_TRAIT,
  [ROLL_OPTIONS.OFF_ITEM]: REACTION_EMOJIS.OFF_ITEM,
  [ROLL_OPTIONS.OFF_UNLOCK]: REACTION_EMOJIS.OFF_UNLOCK,
  [ROLL_OPTIONS.OFF_TRAIT]: REACTION_EMOJIS.OFF_TRAIT,
  [ROLL_OPTIONS.LITHO_GREED]: REACTION_EMOJIS.LITHO_GREED,
};

const ITEMS = {
  [ITEM_CATEGORIES.HEAD]: {
    "Arcane Shadow Hat": {
      image: "./images/head/arcane_shadow_hat.png",
    },
    "Ascended Guardian Hood": {
      image: "./images/head/ascended_guardian_hood.png",
    },
    "Blessed Templar Helmet": {
      image: "./images/head/blessed_templar_helmet.png",
    },
    "Gilded Raven Mask": {
      image: "./images/head/gilded_raven_mask.png",
    },
    "Helm of the Field General": {
      image: "./images/head/helm_field_general.png",
    },
    "Phantom Wolf Mask": {
      image: "./images/head/phantom_wolf_mask.png",
    },
    "Shadow Harvester Mask": {
      image: "./images/head/shadow_harvester_mask.png",
    },
    "Shock Commander Visor": {
      image: "./images/head/shock_commander_visor.png",
    },
  },
  [ITEM_CATEGORIES.WEAPON]: {
    "Adentus's Gargantuan Greatsword": {
      image: "./images/weapon/adentus_gargantuan_greatsword.png",
    },
    "Junobote's Juggernaut Warblade": {
      image: "./images/weapon/junobote_juggernaut_warblade.png",
    },
    "Morokai's Greatblade of Corruption": {
      image: "./images/weapon/morokai_greatblade_corruption.png",
    },
    "Tevent's Warblade of Despair": {
      image: "./images/weapon/tevent_warblade_despair.png",
    },
    "Ahzreil's Siphoning Sword": {
      image: "./images/weapon/ahzreil_siphoning_sword.png",
    },
    "Chernobog's Blade of Beheading": {
      image: "./images/weapon/chernobog_blade_beheading.png",
    },
    "Cornelius's Animated Edge": {
      image: "./images/weapon/cornelius_animated_edge.png",
    },
    "Nirma's Sword of Echoes": {
      image: "./images/weapon/nirma_sword_echoes.png",
    },
    "Queen Bellandir's Languishing Blade": {
      image: "./images/weapon/queen_bellandir_languishing_blade.png",
    },
    "Kowazan's Twilight Daggers": {
      image: "./images/weapon/kowazan_twilight_daggers.png",
    },
    "Minzerok's Daggers of Crippling": {
      image: "./images/weapon/minzerok_daggers_crippling.png",
    },
    "Tevent's Fangs of Fury": {
      image: "./images/weapon/tevent_fangs_fury.png",
    },
    "Kowazan's Sunflare Crossbows": {
      image: "./images/weapon/kowazan_sunflare_crossbows.png",
    },
    "Malakar's Energizing Crossbows": {
      image: "./images/weapon/malakar_energizing_crossbows.png",
    },
    "Queen Bellandir's Toxic Spine Throwers": {
      image: "./images/weapon/queen_bellandir_toxic_spine_throwers.png",
    },
    "Aelon's Rejuvenating Longbow": {
      image: "./images/weapon/aelon_rejuvenating_longbow.png",
    },
    "Tevent's Arc of Wailing Death": {
      image: "./images/weapon/tevent_arc_wailing_death.png",
    },
    "Aridus's Gnarled Voidstaff": {
      image: "./images/weapon/aridus_gnarled_voidstaff.png",
    },
    "Queen Bellandir's Hivemind Staff": {
      image: "./images/weapon/queen_bellandir_hivemind_staff.png",
    },
    "Talus's Crystalline Staff": {
      image: "./images/weapon/talus_crystalline_staff.png",
    },
    "Excavator's Mysterious Scepter": {
      image: "./images/weapon/excavators_mysterious_scepter.png",
    },
    "Tevent's Grasp of Withering": {
      image: "./images/weapon/tevent_grasp_withering.png",
    },
    "Junobote's Smoldering Ranseur": {
      image: "./images/weapon/junobote_smoldering_ranseur.png",
    },
    "Queen Bellandir's Serrated Spike": {
      image: "./images/weapon/queen_bellandir_serrated_spike.png",
    },
  },
  [ITEM_CATEGORIES.CLOAK]: {
    "Bile Drenched Veil": {
      image: "./images/cloak/bile_drenched_veil.png",
    },
    "Blessed Templar Cloak": {
      image: "./images/cloak/blessed_templar_cloak.png",
    },
    "Forsaken Embrace": {
      image: "./images/cloak/forsaken_embrace.png",
    },
  },
  [ITEM_CATEGORIES.CHEST]: {
    "Arcane Shadow Robes": {
      image: "./images/chest/arcane_shadow_robes.png",
    },
    "Ascended Guardian Raiment": {
      image: "./images/chest/ascended_guardian_raiment.png",
    },
    "Blessed Templar Plate Mail": {
      image: "./images/chest/blessed_templar_plate_mail.png",
    },
    "Divine Justiciar Attire": {
      image: "./images/chest/divine_justiciar_attire.png",
    },
    "Swirling Essence Robe": {
      image: "./images/chest/swirling_essence_robe.png",
    },
  },
  [ITEM_CATEGORIES.HANDS]: {
    "Arcane Shadow Gloves": {
      image: "./images/hands/arcane_shadow_gloves.png",
    },
    "Divine Justiciar Gloves": {
      image: "./images/hands/divine_justiciar_gloves.png",
    },
    "Ebon Roar Gauntlets": {
      image: "./images/hands/ebon_roar_gauntlets.png",
    },
    "Gauntlets of the Field General": {
      image: "./images/hands/gauntlets_field_general.png",
    },
    "Gilded Raven Grips": {
      image: "./images/hands/gilded_raven_grips.png",
    },
    "Phantom Wolf Gloves": {
      image: "./images/hands/phantom_wolf_gloves.png",
    },
    "Swirling Essence Gloves": {
      image: "./images/hands/swirling_essence_gloves.png",
    },
  },
  [ITEM_CATEGORIES.LEGS]: {
    "Arcane Shadow Pants": {
      image: "./images/legs/arcane_shadow_pants.png",
    },
    "Ascended Guardian Pants": {
      image: "./images/legs/ascended_guardian_pants.png",
    },
    "Divine Justiciar Pants": {
      image: "./images/legs/divine_justiciar_pants.png",
    },
    "Gilded Raven Trousers": {
      image: "./images/legs/gilded_raven_trousers.png",
    },
    "Greaves of the Field General": {
      image: "./images/legs/greaves_field_general.png",
    },
    "Heroic Breeches of the Resistance": {
      image: "./images/legs/heroic_breeches_resistance.png",
    },
    "Shadow Harvester Trousers": {
      image: "./images/legs/shadow_harvester_trousers.png",
    },
    "Shock Commander Greaves": {
      image: "./images/legs/shock_commander_greaves.png",
    },
    "Swirling Essence Pants": {
      image: "./images/legs/swirling_essence_pants.png",
    },
  },
  [ITEM_CATEGORIES.FEET]: {
    "Arcane Shadow Shoes": {
      image: "./images/feet/arcane_shadow_shoes.png",
    },
    "Boots of the Executioner": {
      image: "./images/feet/boots_executioner.png",
    },
    "Divine Justiciar Shoes": {
      image: "./images/feet/divine_justiciar_shoes.png",
    },
    "Phantom Wolf Boots": {
      image: "./images/feet/phantom_wolf_boots.png",
    },
    "Shadow Harvester Boots": {
      image: "./images/feet/shadow_harvester_boots.png",
    },
    "Shock Commander Sabatons": {
      image: "./images/feet/shock_commander_sabatons.png",
    },
  },
  [ITEM_CATEGORIES.NECKLACE]: {
    "Abyssal Grace Pendant": {
      image: "./images/necklace/abyssal_grace_pendant.png",
    },
    "Blessed Templar Choker": {
      image: "./images/necklace/blessed_templar_choker.png",
    },
    "Clasp of the Overlord": {
      image: "./images/necklace/clasp_overlord.png",
    },
    "Collar of Decimation": {
      image: "./images/necklace/collar_decimation.png",
    },
    "Wrapped Coin Necklace": {
      image: "./images/necklace/wrapped_coin_necklace.png",
    },
  },
  [ITEM_CATEGORIES.BRACELET]: {
    "Abyssal Grace Charm": {
      image: "./images/bracelet/abyssal_grace_charm.png",
    },
    "Forged Golden Bangle": {
      image: "./images/bracelet/forged_golden_bangle.png",
    },
    "Gilded Infernal Wristlet": {
      image: "./images/bracelet/gilded_infernal_wristlet.png",
    },
  },
  [ITEM_CATEGORIES.RING]: {
    "Band of Universal Power": {
      image: "./images/ring/band_universal_power.png",
    },
    "Embossed Granite Band": {
      image: "./images/ring/embossed_granite_band.png",
    },
  },
  [ITEM_CATEGORIES.BELT]: {
    "Belt of Bloodlust": {
      image: "./images/belt/belt_bloodlust.png",
    },
    "Girdle of Spectral Skulls": {
      image: "./images/belt/girdle_spectral_skulls.png",
    },
  },
};

const TRAITS = [
  "Added Attack Speed",
  "Attack Range Increase",
  "Bind Chance",
  "Bind Resistance",
  "Buff Duration",
  "Collision Chance",
  "Collision Resistance",
  "Construct Bonus Damage",
  "Cooldown Speed",
  "Critical Hit Chance",
  "Debuff Duration",
  "Demon Bonus Damage",
  "Health Regen",
  "Heavy Attack Chance",
  "Hit Chance",
  "Humanoid Bonus Damage",
  "Magic Endurance",
  "Magic Evasion",
  "Mana Cost Efficiency",
  "Mana Regen",
  "Max Health",
  "Max Mana",
  "Max Stamina",
  "Melee Endurance",
  "Melee Evasion",
  "Movement Speed",
  "Petrification Chance",
  "Petrification Resistance",
  "Ranged Endurance",
  "Ranged Evasion",
  "Silence Chance",
  "Silence Resistance",
  "Skill Damage Boost",
  "Skill Damage Resistance",
  "Sleep Chance",
  "Sleep Resistance",
  "Stun Chance",
  "Stun Resistance",
  "Undead Bonus Damage",
  "Weaken Chance",
  "Weaken Resistance",
  "Wildling Bonus Damage",
];

const ROLL_PRIORITY = [
  ROLL_OPTIONS.MAIN_ITEM,
  ROLL_OPTIONS.MAIN_UNLOCK,
  ROLL_OPTIONS.MAIN_TRAIT,
  ROLL_OPTIONS.OFF_ITEM,
  ROLL_OPTIONS.OFF_UNLOCK,
  ROLL_OPTIONS.OFF_TRAIT,
  ROLL_OPTIONS.LITHO_GREED,
];

const BUTTON_IDS = {
  MARK_SENT: "mark_sent",
  SKIP_WINNER: "skip_winner",
};

const THREAD_SETTINGS = {
  LOCK_DELAY: 10 * 60 * 1000, // 10 minutes in milliseconds
  MIN_ROLL_AGE: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  ROLL_WINDOW: {
    START_HOUR: 19, // 7 PM EST
    END_HOUR: 23, // 11 PM EST
    TIMEZONE: "America/New_York",
  },
  CHECK_INTERVAL: 60 * 60 * 1000, // Check every hour
  AUTO_ROLL_DELAY: 5 * 60 * 1000, // Keep 5-minute delay after entering roll window
  CLEANUP_DELAY: 60 * 60 * 1000, // Delete threads 1 hour after being marked as sent
};

const isAuthorized = (userId, member) => {
  for (const roleId of Object.values(AUTHORIZED_ROLES)) {
    if (member.roles.cache.has(roleId)) return true;
  }
  return false;
};

async function createCompositeImage(foregroundPath, outputPath) {
  try {
    // Get background dimensions
    const background = sharp(BACKGROUND_IMAGE);
    const bgMetadata = await background.metadata();
    const { width, height } = bgMetadata;

    // Resize item image
    const resizedForeground = await sharp(foregroundPath)
      .resize(width, height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Composite
    await background
      .composite([
        {
          input: resizedForeground,
          top: 0,
          left: 0,
        },
      ])
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    Logger.error(`Failed to create composite image: ${error.message}`);
    return null;
  }
}

const getSecureRandom = (min, max) => {
  const range = max - min + 1;
  // Generate 4 bytes for numbers up to 2^32
  const maxNum = Math.floor(0xffffffff / range) * range;
  let num;
  do {
    num = crypto.randomBytes(4).readUInt32BE(0);
  } while (num >= maxNum);
  return min + (num % range);
};

const getItemCategory = (itemName) => {
  for (const [category, items] of Object.entries(ITEMS)) {
    if (itemName in items) return category;
  }
  return null;
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// Add temporary cleanup helper
const temporaryCleanAllClosedThreads = async () => {
  try {
    Logger.info("Starting temporary cleanup of all closed threads...");
    // Get all active forum channels
    const forumChannels = Object.values(ROLE_TO_FORUM)
      .filter((config) => config.enabled)
      .map((config) => config.channel);

    for (const channelId of forumChannels) {
      const forumChannel = await client.channels.fetch(channelId);
      if (!forumChannel) continue;

      Logger.info(`Checking forum channel: ${forumChannel.name}`);

      // Get both active and archived threads
      const allThreads = [
        ...(await forumChannel.threads.fetchActive()).threads.values(),
        ...(await forumChannel.threads.fetchArchived()).threads.values(),
      ];

      for (const thread of allThreads) {
        try {
          // Get thread messages
          const messages = await thread.messages.fetch();
          const itemSentMessage = messages.find(
            (msg) =>
              msg.author.id === client.user.id &&
              msg.embeds[0]?.title === "🎁 Item Marked as Sent"
          );

          // If thread has been marked as sent or is archived
          if (itemSentMessage || thread.archived) {
            await thread.delete();
            Logger.info(`Deleted thread: ${thread.name}`);
          }
        } catch (error) {
          if (error.code === 10008) {
            // Unknown Message error - thread might have been deleted
            continue;
          }
          Logger.error(
            `Error processing thread ${thread.name} for cleanup: ${error.message}`
          );
        }
      }
    }
    Logger.info("Temporary cleanup completed");
  } catch (error) {
    Logger.error(`Temporary cleanup failed: ${error.message}`);
  }
};

// Command registration
client.once("ready", async () => {
  Logger.info(`Bot logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "Bald" }],
    status: "online",
  });

  try {
    await initializeDb();
    Logger.info("Database connected");
  } catch (error) {
    Logger.error(`Database connection failed: ${error.message}`);
  }

  // Run temporary cleanup
  //await temporaryCleanAllClosedThreads();

  // Log initial window timing
  logWindowTiming();

  const commands = [
    {
      name: "listitem",
      description: "List an item for distribution",
      options: [
        {
          name: "piece_name",
          description: "Name of the item piece",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
        {
          name: "trait_name",
          description: "Name of the trait",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "roll",
      description:
        "Roll for users who reacted (follows priority order if no type specified)",
      options: [
        {
          name: "type",
          description: "Specific type of roll to perform (optional)",
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: `${REACTION_EMOJIS.MAIN_ITEM} Main Item`,
              value: ROLL_OPTIONS.MAIN_ITEM,
            },
            {
              name: `${REACTION_EMOJIS.MAIN_UNLOCK} Main Unlock`,
              value: ROLL_OPTIONS.MAIN_UNLOCK,
            },
            {
              name: `${REACTION_EMOJIS.MAIN_TRAIT} Main Trait`,
              value: ROLL_OPTIONS.MAIN_TRAIT,
            },
            {
              name: `${REACTION_EMOJIS.OFF_ITEM} Off Item`,
              value: ROLL_OPTIONS.OFF_ITEM,
            },
            {
              name: `${REACTION_EMOJIS.OFF_UNLOCK} Off Unlock`,
              value: ROLL_OPTIONS.OFF_UNLOCK,
            },
            {
              name: `${REACTION_EMOJIS.OFF_TRAIT} Off Trait`,
              value: ROLL_OPTIONS.OFF_TRAIT,
            },
            {
              name: `${REACTION_EMOJIS.LITHO_GREED} Litho/Greed`,
              value: ROLL_OPTIONS.LITHO_GREED,
            },
          ],
        },
      ],
    },
  ];

  try {
    await client.application.commands.set(commands);
    Logger.info("Successfully registered application commands.");
  } catch (error) {
    Logger.error(`Failed to register commands: ${error.message}`);
  }

  // Perform initial checks
  Logger.info("Performing initial auto-roll check...");
  await checkAndAutoRoll();
  Logger.info("Performing initial thread cleanup...");
  await cleanupOldThreads();

  // Start the check intervals
  setInterval(async () => {
    await checkAndAutoRoll();
    await cleanupOldThreads();
  }, THREAD_SETTINGS.CHECK_INTERVAL);

  Logger.info("Auto-roll checker and thread cleanup intervals started");
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    handleAutocomplete(interaction);
  } else if (interaction.isCommand()) {
    if (interaction.commandName === "listitem") {
      handleCommand(interaction);
    } else if (interaction.commandName === "roll") {
      handleRoll(interaction);
    }
  }
});

const formatUserDisplay = async (user, member) => {
  const ingameName = await getIngameName(user.id);
  const displayName = member?.nickname || user.displayName || user.username;
  const name = ingameName || displayName;
  return `${name} (<@${user.id}>)`;
};

const formatRollResults = async (
  rolls,
  emoji,
  rollType,
  tiebreakNum = null,
  guild
) => {
  const results = await Promise.all(
    rolls.map(async (entry, index) => {
      const member = guild.members.cache.get(entry.user.id);
      const userDisplay = await formatUserDisplay(entry.user, member);
      return `${index + 1}. ${userDisplay} - **${entry.roll}**`;
    })
  );

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(tiebreakNum ? `🎲 Tiebreaker #${tiebreakNum}` : `🎲 Roll Results`)
    .setDescription(results.join("\n"))
    .addFields({
      name: "Roll Type",
      value: `${emoji} ${getRollTypeName(rollType)}`,
      inline: true,
    })
    .setTimestamp();

  return embed;
};

const getRollTypeName = (rollType) => {
  switch (rollType) {
    case ROLL_OPTIONS.MAIN_ITEM:
      return "Main Item";
    case ROLL_OPTIONS.MAIN_UNLOCK:
      return "Main Unlock";
    case ROLL_OPTIONS.MAIN_TRAIT:
      return "Main Trait";
    case ROLL_OPTIONS.OFF_ITEM:
      return "Off Item";
    case ROLL_OPTIONS.OFF_UNLOCK:
      return "Off Unlock";
    case ROLL_OPTIONS.OFF_TRAIT:
      return "Off Trait";
    case ROLL_OPTIONS.LITHO_GREED:
      return "Litho/Greed";
    default:
      return "Unknown";
  }
};

const getWinnerMessage = async (winner, rollType, guild, messageId = null) => {
  const member = guild.members.cache.get(winner.id);
  const userDisplay = await formatUserDisplay(winner, member);

  const markSentButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.MARK_SENT)
    .setLabel("Mark as Sent")
    .setStyle(ButtonStyle.Success);

  const skipWinnerButton = new ButtonBuilder()
    .setCustomId(BUTTON_IDS.SKIP_WINNER)
    .setLabel("Skip Winner")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(
    markSentButton,
    skipWinnerButton
  );

  let winnerText;
  switch (rollType) {
    case ROLL_OPTIONS.MAIN_ITEM:
    case ROLL_OPTIONS.OFF_ITEM:
      winnerText = `Please link what you are currently wearing.\n\nPending reply from winner.`;
      break;
    case ROLL_OPTIONS.LITHO_GREED:
      winnerText = `No steps necessary. Item will be sent shortly.\n\nReady for distribution.`;
      break;
    case ROLL_OPTIONS.MAIN_UNLOCK:
    case ROLL_OPTIONS.OFF_UNLOCK:
      winnerText = `Please link the item you need the unlock on.\n\nPending reply from winner.`;
      break;
    case ROLL_OPTIONS.MAIN_TRAIT:
    case ROLL_OPTIONS.OFF_TRAIT:
      winnerText = `Please link the item you need the trait on.\n\nPending reply from winner.`;
      break;
    default:
      winnerText = `N/A\n\nReady for distribution.`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("🏆 Winner Announced")
    .addFields(
      { name: "Winner", value: userDisplay, inline: true },
      { name: "Next Steps", value: winnerText }
    )
    .setTimestamp();

  if (messageId) {
    embed.setFooter({ text: `Previous Winner Message ID: ${messageId}` });
  }

  // Find the raid team role ID based on the channel
  const raidTeamRoleId = Object.entries(ROLE_TO_FORUM).find(
    ([_, config]) => config.channel === winner.channel.parentId
  )?.[0];

  Logger.info(
    `Found raid team role ID: ${raidTeamRoleId} for channel: ${winner.channel.parentId}`
  );

  // Get all members with Loot Council role
  const lootCouncilMembers = guild.members.cache
    .filter((member) => {
      const hasLootCouncil = member.roles.cache.has(
        AUTHORIZED_ROLES.LOOTCOUNCIL
      );
      const hasRaidTeam = raidTeamRoleId
        ? member.roles.cache.has(raidTeamRoleId)
        : false;
      if (hasLootCouncil) {
        Logger.info(
          `Found Loot Council member: ${member.user.tag} (${member.id}) - Has raid team role: ${hasRaidTeam}`
        );
      }
      // Exclude the winner from loot council pings if they're a council member
      return hasLootCouncil && hasRaidTeam && member.id !== winner.id;
    })
    .map((member) => `<@${member.id}>`)
    .join(" ");

  Logger.info(`Final filtered Loot Council mentions: ${lootCouncilMembers}`);

  return {
    content:
      rollType === ROLL_OPTIONS.LITHO_GREED
        ? lootCouncilMembers
        : `<@${winner.id}> ${lootCouncilMembers}`,
    embed,
    components: [row],
    allowedMentions: { parse: ["users", "roles"] },
  };
};

async function handleRoll(interaction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!isAuthorized(interaction.user.id, member)) {
    await interaction.reply({
      content: "You are not authorized to use this command.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.channel.isThread()) {
    await interaction.reply({
      content: "This command can only be used in item threads",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if thread is ready for rolling (pass false for manual roll)
  const readyCheck = await isThreadReadyForRoll(interaction.channel, false);
  if (!readyCheck.ready) {
    await interaction.reply({
      content: readyCheck.reason,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const specifiedRollType = interaction.options.getString("type");

    // Get first message in thread
    const messages = await interaction.channel.messages.fetch();
    const instructionMsg = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .at(1);

    // If roll type is specified, only check that reaction
    if (specifiedRollType) {
      const emoji = ROLL_TO_EMOJI[specifiedRollType];
      return await processRoll(
        interaction,
        instructionMsg,
        specifiedRollType,
        emoji
      );
    }

    // Otherwise, check reactions in priority order
    for (const rollType of ROLL_PRIORITY) {
      const emoji = ROLL_TO_EMOJI[rollType];
      const reaction = instructionMsg.reactions.cache.find(
        (r) => r.emoji.name === emoji
      );

      if (!reaction) continue;

      await reaction.users.fetch();
      const users = [...reaction.users.cache.values()].filter(
        (user) => !user.bot
      );

      if (users.length > 0) {
        // Found the highest priority reaction with users
        return await processRoll(interaction, instructionMsg, rollType, emoji);
      }
    }

    await interaction.editReply("No valid reactions found to roll for.");
  } catch (error) {
    await interaction.editReply("There was an error performing the roll");
    Logger.error(`Roll failed: ${error.message}`);
  }
}

async function processRoll(interaction, instructionMsg, rollType, emoji) {
  try {
    // Check if thread is archived before proceeding
    if (interaction.channel.isThread() && interaction.channel.archived) {
      await interaction.editReply("Cannot roll in an archived thread.");
      return;
    }

    const reaction = instructionMsg.reactions.cache.find(
      (r) => r.emoji.name === emoji
    );

    if (!reaction) {
      await interaction.editReply("No users found with that reaction");
      return;
    }

    await reaction.users.fetch();
    const users = [...reaction.users.cache.values()].filter(
      (user) => !user.bot
    );

    if (users.length === 0) {
      await interaction.editReply("No users found with that reaction");
      return;
    }

    // If only one user reacted, they automatically win
    if (users.length === 1) {
      const winner = users[0];
      const rollEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("🎲 Roll Results")
        .setDescription("Only one person reacted - automatic win!")
        .addFields({
          name: "Roll Type",
          value: `${emoji} ${getRollTypeName(rollType)}`,
          inline: true,
        })
        .setTimestamp();

      const winnerMessage = await getWinnerMessage(
        {
          id: winner.id,
          channel: interaction.channel,
        },
        rollType,
        interaction.guild
      );

      // Send roll results with no mentions
      await interaction.editReply({
        embeds: [rollEmbed],
        allowedMentions: { parse: [] },
      });

      // Send winner announcement with user and role mentions
      await interaction.channel.send({
        content: winnerMessage.content,
        embeds: [winnerMessage.embed],
        components: winnerMessage.components,
        allowedMentions: { parse: ["users", "roles"] },
      });

      Logger.info(
        `Auto-win in ${interaction.channel.name} for ${rollType} - single reactor`
      );
      return;
    }

    // Multiple users case
    let rolls = users
      .map((user) => ({
        user: user,
        roll: getSecureRandom(1, 100),
      }))
      .sort((a, b) => b.roll - a.roll);

    // Show only roll results initially with no mentions
    let rollEmbed = await formatRollResults(
      rolls,
      emoji,
      rollType,
      null,
      interaction.guild
    );
    const initialRollMsg = await interaction.editReply({
      embeds: [rollEmbed],
      allowedMentions: { parse: [] },
    });

    // Handle tiebreakers
    let tiebreakNum = 1;
    let currentRolls = rolls;

    while (true) {
      const highestRoll = currentRolls[0].roll;
      const tiedUsers = currentRolls.filter((r) => r.roll === highestRoll);

      if (tiedUsers.length === 1) {
        const winner = currentRolls[0].user;
        const winnerMessage = await getWinnerMessage(
          {
            id: winner.id,
            channel: interaction.channel,
          },
          rollType,
          interaction.guild
        );

        // Send winner announcement with user and role mentions
        await interaction.channel.send({
          content: winnerMessage.content,
          embeds: [winnerMessage.embed],
          components: winnerMessage.components,
          allowedMentions: { parse: ["users", "roles"] },
        });
        break;
      }

      // Generate new rolls for tied users
      currentRolls = tiedUsers
        .map((entry) => ({
          user: entry.user,
          roll: getSecureRandom(1, 100),
        }))
        .sort((a, b) => b.roll - a.roll);

      const tiebreakEmbed = await formatRollResults(
        currentRolls,
        emoji,
        rollType,
        tiebreakNum,
        interaction.guild
      );

      rollEmbed = tiebreakEmbed;
      // Update tiebreak results with no mentions
      await initialRollMsg.edit({
        embeds: [rollEmbed],
        allowedMentions: { parse: [] },
      });

      tiebreakNum++;

      if (tiebreakNum > 5) {
        const winner = currentRolls[0].user;
        const winnerMessage = await getWinnerMessage(
          {
            id: winner.id,
            channel: interaction.channel,
          },
          rollType,
          interaction.guild
        );

        rollEmbed.setFooter({ text: "Maximum tiebreaker rounds reached" });

        // Send winner announcement with user and role mentions
        await interaction.channel.send({
          content: winnerMessage.content,
          embeds: [winnerMessage.embed],
          components: winnerMessage.components,
          allowedMentions: { parse: ["users", "roles"] },
        });
        break;
      }
    }
  } catch (error) {
    if (error.code === "50083") {
      // Thread is archived
      Logger.info(
        `Thread ${interaction.channel.name} was archived during roll attempt`
      );
      return;
    }
    Logger.error(`Error processing roll: ${error.message}`);
  }
}

async function handleAutocomplete(interaction) {
  if (interaction.commandName !== "listitem") return;

  const focusedValue = interaction.options.getFocused().toLowerCase();
  let choices = [];

  const focusedOption = interaction.options.getFocused(true).name;

  switch (focusedOption) {
    case "piece_name":
      choices = Object.entries(ITEMS)
        .flatMap(([_, items]) => Object.keys(items))
        .filter((piece) => piece.toLowerCase().includes(focusedValue));
      break;
    case "trait_name":
      choices = TRAITS.filter((trait) =>
        trait.toLowerCase().includes(focusedValue)
      );
      break;
  }

  await interaction.respond(
    choices.map((choice) => ({ name: choice, value: choice })).slice(0, 25)
  );
}

async function handleCommand(interaction) {
  if (interaction.commandName !== "listitem") return;

  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!isAuthorized(interaction.user.id, member)) {
    await interaction.reply({
      content: "You are not authorized to use this command.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member) {
      await interaction.editReply({
        content: "Error: You must be in the guild to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let forumChannelId = null;
    for (const [roleId, config] of Object.entries(ROLE_TO_FORUM)) {
      if (member.roles.cache.has(roleId)) {
        if (!config.enabled) {
          await interaction.editReply({
            content: `Error: The loot system is currently disabled for ${config.name}.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        forumChannelId = config.channel;
        break;
      }
    }

    if (!forumChannelId) {
      await interaction.editReply({
        content: "Error: You don't have the required role to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const pieceName = interaction.options.getString("piece_name");
    const traitName = interaction.options.getString("trait_name");
    const itemCategory = getItemCategory(pieceName);

    if (!itemCategory || !ITEMS[itemCategory][pieceName]) {
      await interaction.editReply({
        content: "Please enter a valid item name.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!TRAITS.includes(traitName)) {
      await interaction.editReply({
        content: "Please enter a valid trait name.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const imagePath = ITEMS[itemCategory][pieceName].image;
    let compositeImagePath = null;

    if (imagePath) {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      const outputPath = path.join(
        TEMP_DIR,
        `${Date.now()}_${path.basename(imagePath)}`
      );
      compositeImagePath = await createCompositeImage(imagePath, outputPath);
      if (!compositeImagePath) {
        Logger.warn(
          `Failed to process image for ${pieceName}, continuing without image`
        );
      }
    }

    const forumChannel = await client.channels.fetch(forumChannelId);

    const config = Object.entries(ROLE_TO_FORUM).find(([id, _]) =>
      member.roles.cache.has(id)
    )?.[1];
    const tagId = config?.tags?.[itemCategory];

    if (!tagId) {
      Logger.warn(`No tag found for category ${itemCategory}`);
    }

    // Create forum post with or without image
    const messageContent = {
      content: `**Item Details**
        • Item Piece: ${pieceName}
        • Trait: ${traitName}`,
    };

    // Only add files if we have an image
    if (compositeImagePath) {
      messageContent.files = [compositeImagePath];
    }

    // Create forum post
    const thread = await forumChannel.threads.create({
      name: `${pieceName} - ${traitName}`,
      appliedTags: [tagId],
      message: messageContent,
    });

    // Clean up temp file if it exists
    if (compositeImagePath) {
      await fs.unlink(compositeImagePath);
    }

    await thread.send(`**React to this message based on your needs:**
      ${REACTION_EMOJIS.MAIN_ITEM} - ${EMOJI_DESCRIPTIONS.MAIN_ITEM}
      ${REACTION_EMOJIS.MAIN_UNLOCK} - ${EMOJI_DESCRIPTIONS.MAIN_UNLOCK}
      ${REACTION_EMOJIS.MAIN_TRAIT} - ${EMOJI_DESCRIPTIONS.MAIN_TRAIT}
      ${REACTION_EMOJIS.OFF_ITEM} - ${EMOJI_DESCRIPTIONS.OFF_ITEM}
      ${REACTION_EMOJIS.OFF_UNLOCK} - ${EMOJI_DESCRIPTIONS.OFF_UNLOCK}
      ${REACTION_EMOJIS.OFF_TRAIT} - ${EMOJI_DESCRIPTIONS.OFF_TRAIT}
      ${REACTION_EMOJIS.LITHO_GREED} - ${EMOJI_DESCRIPTIONS.LITHO_GREED}
      
      *Please react with only one emoji that best describes your need.*`);

    // Add reactions to the instruction message instead of first post
    const instructionMsg = (await thread.messages.fetch()).first();
    await instructionMsg.react(REACTION_EMOJIS.MAIN_ITEM);
    await instructionMsg.react(REACTION_EMOJIS.MAIN_UNLOCK);
    await instructionMsg.react(REACTION_EMOJIS.MAIN_TRAIT);
    await instructionMsg.react(REACTION_EMOJIS.OFF_ITEM);
    await instructionMsg.react(REACTION_EMOJIS.OFF_UNLOCK);
    await instructionMsg.react(REACTION_EMOJIS.OFF_TRAIT);
    await instructionMsg.react(REACTION_EMOJIS.LITHO_GREED);

    await interaction.editReply({
      content: `Item listed successfully in ${thread}`,
      flags: MessageFlags.Ephemeral,
    });
    Logger.thread(`New item thread created: ${pieceName} - ${traitName}`);
  } catch (error) {
    await interaction.editReply({
      content: "There was an error while listing the item.",
      flags: MessageFlags.Ephemeral,
    });
    Logger.error(`Failed to list item: ${error.message}`);
  }
}

// Handle reaction tracking
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;

  const message = reaction.message;
  if (!message.thread) return;

  // Ensure reaction is fully fetched
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      Logger.error(`Error fetching reaction: ${error.message}`);
      return;
    }
  }

  // Remove other reactions from same user
  const userReactions = message.reactions.cache.filter((reaction) =>
    reaction.users.cache.has(user.id)
  );

  for (const [emoji, reaction] of userReactions) {
    if (emoji !== reaction.emoji.name) {
      await reaction.users.remove(user.id);
    }
  }
  Logger.sync(
    `User ${user.tag} updated their reaction in thread ${message.thread.name}`
  );
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!isAuthorized(interaction.user.id, member)) {
    await interaction.reply({
      content: "You are not authorized to use these buttons.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.customId === BUTTON_IDS.MARK_SENT) {
    try {
      const thread = interaction.channel;
      if (!thread.isThread()) return;

      // Respond to the interaction first
      await interaction.reply({
        content: "✅ Item marked as sent and thread closed.",
        flags: MessageFlags.Ephemeral,
      });

      // Remove all Skip Winner buttons from previous messages
      const messages = await thread.messages.fetch();
      for (const [_, message] of messages) {
        if (message.components?.length > 0) {
          const hasSkipButton = message.components[0].components.some(
            (btn) => btn.customId === BUTTON_IDS.SKIP_WINNER
          );
          if (hasSkipButton) {
            const updatedRow = ActionRowBuilder.from(message.components[0]);
            updatedRow.components = updatedRow.components.filter(
              (btn) => btn.customId !== BUTTON_IDS.SKIP_WINNER
            );
            await message.edit({ components: [updatedRow] });
          }
        }
      }

      // Send the item sent embed
      await thread.send({
        embeds: [createItemSentEmbed(interaction.user.tag)],
      });

      // Disable the button
      const message = interaction.message;
      const disabledRow = ActionRowBuilder.from(message.components[0]);
      disabledRow.components.forEach((button) => button.setDisabled(true));
      await message.edit({
        components: [disabledRow],
      });

      // Archive the thread after all other operations
      await thread.setArchived(true);

      Logger.info(
        `Thread ${thread.name} marked as sent by ${interaction.user.tag}`
      );
    } catch (error) {
      // Only try to reply if we haven't already
      if (!interaction.replied) {
        await interaction.reply({
          content: "There was an error marking the item as sent.",
          flags: MessageFlags.Ephemeral,
        });
      }
      Logger.error(`Failed to mark thread as sent: ${error.message}`);
    }
  } else if (interaction.customId === BUTTON_IDS.SKIP_WINNER) {
    try {
      const thread = interaction.channel;
      if (!thread.isThread()) return;

      await interaction.deferReply();

      // Get all messages to find roll results and current winner
      const messages = await thread.messages.fetch();
      const currentWinnerMsg = interaction.message;

      // Find the roll results message that corresponds to this winner
      const rollResultsMsg = messages.find(
        (msg) =>
          msg.author.id === client.user.id &&
          msg.embeds[0]?.title?.includes("Roll Results") &&
          !messages.find(
            (m) =>
              m.createdTimestamp > msg.createdTimestamp &&
              m.embeds[0]?.title?.includes("Roll Results")
          )
      );

      if (!rollResultsMsg) {
        await interaction.editReply("Could not find roll results message.");
        return;
      }

      // Check if this was an automatic win
      const isAutoWin = rollResultsMsg.embeds[0].description.includes(
        "Only one person reacted - automatic win!"
      );

      if (isAutoWin) {
        // For automatic wins, move directly to next roll type
        const instructionMsg = messages
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
          .at(1);

        if (!instructionMsg) {
          await interaction.editReply(
            "Could not find the instruction message."
          );
          return;
        }

        // Get current roll type from roll results message
        const rollTypeField = rollResultsMsg.embeds[0]?.fields?.find(
          (f) => f.name === "Roll Type"
        );
        if (!rollTypeField?.value) {
          await interaction.editReply(
            "Could not find roll type in roll results message."
          );
          return;
        }

        const currentEmoji = rollTypeField.value.split(" ")[0];
        const currentRollType = Object.entries(ROLL_TO_EMOJI).find(
          ([_, emoji]) => emoji === currentEmoji
        )?.[0];

        if (!currentRollType) {
          await interaction.editReply("Could not determine current roll type.");
          return;
        }

        // Find next valid roll type with reactions
        const currentPriorityIndex = ROLL_PRIORITY.indexOf(currentRollType);
        let foundNextRoll = false;

        for (let i = currentPriorityIndex + 1; i < ROLL_PRIORITY.length; i++) {
          const nextRollType = ROLL_PRIORITY[i];
          const emoji = ROLL_TO_EMOJI[nextRollType];
          const reaction = instructionMsg.reactions.cache.find(
            (r) => r.emoji.name === emoji
          );

          if (!reaction) continue;

          await reaction.users.fetch();
          const users = [...reaction.users.cache.values()].filter(
            (user) => !user.bot
          );

          if (users.length > 0) {
            // Process next roll type
            await processRoll(
              {
                channel: thread,
                guild: interaction.guild,
                editReply: async (content) => {
                  const msg = await thread.send(content);
                  const prevRow = ActionRowBuilder.from(
                    currentWinnerMsg.components[0]
                  );
                  prevRow.components.forEach((button) =>
                    button.setDisabled(true)
                  );
                  await currentWinnerMsg.edit({ components: [prevRow] });
                  await interaction.editReply(
                    `✅ Skipped to next roll type: ${getRollTypeName(
                      nextRollType
                    )}`
                  );
                  return msg;
                },
              },
              instructionMsg,
              nextRollType,
              emoji
            );
            foundNextRoll = true;
            break;
          }
        }

        if (!foundNextRoll) {
          await interaction.editReply(
            "No more roll types with reactions found."
          );
          return;
        }
      } else {
        // Get the rolls from the embed description for normal roll results
        const rolls = rollResultsMsg.embeds[0].description
          .split("\n")
          .map((line) => {
            const match = line.match(/(\d+)\. (.+?) - \*\*(\d+)\*\*/);
            if (!match) return null;
            return {
              position: parseInt(match[1]),
              userDisplay: match[2],
              roll: parseInt(match[3]),
            };
          })
          .filter((r) => r !== null);

        // Find the current winner's position
        const currentWinnerMatch = currentWinnerMsg.embeds[0]?.fields
          ?.find((f) => f.name === "Winner")
          ?.value.match(/<@(\d+)>/);

        if (!currentWinnerMatch) {
          await interaction.editReply(
            "Could not find current winner's ID in winner message."
          );
          return;
        }

        const currentWinnerId = currentWinnerMatch[1];
        const currentWinnerPosition = rolls.findIndex((r) =>
          r.userDisplay.includes(`<@${currentWinnerId}>`)
        );

        if (currentWinnerPosition === -1) {
          await interaction.editReply(
            "Could not find current winner in roll results."
          );
          return;
        }

        // If this is the last person in current roll results
        if (currentWinnerPosition === rolls.length - 1) {
          // Try to find next roll type with reactions
          const instructionMsg = messages
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .at(1);

          if (!instructionMsg) {
            await interaction.editReply(
              "Could not find the instruction message."
            );
            return;
          }

          // Get roll type from roll results message
          const rollTypeField = rollResultsMsg.embeds[0]?.fields?.find(
            (f) => f.name === "Roll Type"
          );
          if (!rollTypeField?.value) {
            await interaction.editReply(
              "Could not find roll type in roll results message."
            );
            return;
          }

          const currentEmoji = rollTypeField.value.split(" ")[0];
          const currentRollType = Object.entries(ROLL_TO_EMOJI).find(
            ([_, emoji]) => emoji === currentEmoji
          )?.[0];

          if (!currentRollType) {
            await interaction.editReply(
              "Could not determine current roll type."
            );
            return;
          }

          // Find next valid roll type with reactions
          const currentPriorityIndex = ROLL_PRIORITY.indexOf(currentRollType);
          let foundNextRoll = false;

          for (
            let i = currentPriorityIndex + 1;
            i < ROLL_PRIORITY.length;
            i++
          ) {
            const nextRollType = ROLL_PRIORITY[i];
            const emoji = ROLL_TO_EMOJI[nextRollType];
            const reaction = instructionMsg.reactions.cache.find(
              (r) => r.emoji.name === emoji
            );

            if (!reaction) continue;

            await reaction.users.fetch();
            const users = [...reaction.users.cache.values()].filter(
              (user) => !user.bot
            );

            if (users.length > 0) {
              // Process next roll type
              await processRoll(
                {
                  channel: thread,
                  guild: interaction.guild,
                  editReply: async (content) => {
                    const msg = await thread.send(content);
                    const prevRow = ActionRowBuilder.from(
                      currentWinnerMsg.components[0]
                    );
                    prevRow.components.forEach((button) =>
                      button.setDisabled(true)
                    );
                    await currentWinnerMsg.edit({ components: [prevRow] });
                    await interaction.editReply(
                      `✅ Skipped to next roll type: ${getRollTypeName(
                        nextRollType
                      )}`
                    );
                    return msg;
                  },
                },
                instructionMsg,
                nextRollType,
                emoji
              );
              foundNextRoll = true;
              break;
            }
          }

          if (!foundNextRoll) {
            await interaction.editReply(
              "No more roll types with reactions found."
            );
            return;
          }
        } else {
          // Get next winner's user ID from the userDisplay string
          const nextWinnerUserIdMatch =
            rolls[currentWinnerPosition + 1].userDisplay.match(/<@(\d+)>/);
          if (!nextWinnerUserIdMatch) {
            await interaction.editReply(
              "Could not parse next winner's user ID."
            );
            return;
          }

          const nextWinnerId = nextWinnerUserIdMatch[1];
          const nextWinner = await interaction.guild.members.fetch(
            nextWinnerId
          );

          if (!nextWinner) {
            await interaction.editReply("Could not find the next winner.");
            return;
          }

          // Get roll type from roll results message
          const rollTypeField = rollResultsMsg.embeds[0]?.fields?.find(
            (f) => f.name === "Roll Type"
          );
          if (!rollTypeField?.value) {
            await interaction.editReply(
              "Could not find roll type in roll results message."
            );
            return;
          }
          const rollType = Object.entries(ROLL_TO_EMOJI).find(([_, emoji]) =>
            rollTypeField.value.startsWith(emoji)
          )?.[0];

          if (!rollType) {
            await interaction.editReply("Could not determine roll type.");
            return;
          }

          // Create new winner message
          const winnerMessage = await getWinnerMessage(
            {
              id: nextWinner.id,
              channel: thread,
            },
            rollType,
            interaction.guild,
            currentWinnerMsg.id
          );

          // Disable buttons on previous winner message
          const prevRow = ActionRowBuilder.from(currentWinnerMsg.components[0]);
          prevRow.components.forEach((button) => button.setDisabled(true));
          await currentWinnerMsg.edit({ components: [prevRow] });

          // Send new winner message and update deferred reply
          await thread.send({
            content: winnerMessage.content,
            embeds: [winnerMessage.embed],
            components: winnerMessage.components,
            allowedMentions: { parse: ["users", "roles"] },
          });
          await interaction.editReply(`✅ Skipped to next winner.`);
        }
      }
    } catch (error) {
      if (!interaction.replied) {
        await interaction.editReply(
          "There was an error processing the skip winner action."
        );
      }
      Logger.error(`Failed to skip winner: ${error.message}`);
    }
  }
});

// Add this helper function to check if current time is within roll window
const isWithinRollWindow = () => {
  const estFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: THREAD_SETTINGS.ROLL_WINDOW.TIMEZONE,
    hour: "numeric",
    hour12: false,
  });

  const hour = parseInt(estFormatter.format(new Date()));
  let isWithin;

  if (
    THREAD_SETTINGS.ROLL_WINDOW.END_HOUR <
    THREAD_SETTINGS.ROLL_WINDOW.START_HOUR
  ) {
    // Cross-day window (e.g., 7 PM to 2 AM)
    isWithin =
      hour >= THREAD_SETTINGS.ROLL_WINDOW.START_HOUR ||
      hour < THREAD_SETTINGS.ROLL_WINDOW.END_HOUR;
    Logger.info(
      `Roll window check at ${hour}:00 EST (${
        isWithin ? "within" : "outside"
      } window of ${THREAD_SETTINGS.ROLL_WINDOW.START_HOUR}:00 EST to ${
        THREAD_SETTINGS.ROLL_WINDOW.END_HOUR
      }:00 EST next day)`
    );
  } else {
    // Same-day window (e.g., 7 PM to 11 PM)
    isWithin =
      hour >= THREAD_SETTINGS.ROLL_WINDOW.START_HOUR &&
      hour < THREAD_SETTINGS.ROLL_WINDOW.END_HOUR;
    Logger.info(
      `Roll window check at ${hour}:00 EST (${
        isWithin ? "within" : "outside"
      } window of ${THREAD_SETTINGS.ROLL_WINDOW.START_HOUR}:00-${
        THREAD_SETTINGS.ROLL_WINDOW.END_HOUR
      }:00 EST)`
    );
  }

  return isWithin;
};

// Add this function to calculate and log time until window changes
const logWindowTiming = () => {
  const estFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: THREAD_SETTINGS.ROLL_WINDOW.TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const now = new Date();
  const [currentHour, currentMinute] = estFormatter
    .format(now)
    .split(":")
    .map(Number);

  const isInWindow = isWithinRollWindow();

  let hoursUntilChange, minutesUntilChange;

  if (isInWindow) {
    // Calculate time until window ends
    if (
      THREAD_SETTINGS.ROLL_WINDOW.END_HOUR <
      THREAD_SETTINGS.ROLL_WINDOW.START_HOUR
    ) {
      // Window spans to next day
      if (currentHour < THREAD_SETTINGS.ROLL_WINDOW.END_HOUR) {
        hoursUntilChange = THREAD_SETTINGS.ROLL_WINDOW.END_HOUR - currentHour;
      } else {
        hoursUntilChange =
          24 - currentHour + THREAD_SETTINGS.ROLL_WINDOW.END_HOUR;
      }
    } else {
      hoursUntilChange = THREAD_SETTINGS.ROLL_WINDOW.END_HOUR - currentHour;
    }
    minutesUntilChange = 60 - currentMinute;
    if (minutesUntilChange === 60) {
      minutesUntilChange = 0;
    } else {
      hoursUntilChange--;
    }
    Logger.info(
      `Roll window is ACTIVE. ${hoursUntilChange}h ${minutesUntilChange}m until window closes`
    );
  } else {
    // Calculate time until window starts
    if (currentHour < THREAD_SETTINGS.ROLL_WINDOW.START_HOUR) {
      hoursUntilChange = THREAD_SETTINGS.ROLL_WINDOW.START_HOUR - currentHour;
    } else {
      hoursUntilChange =
        24 - currentHour + THREAD_SETTINGS.ROLL_WINDOW.START_HOUR;
    }
    minutesUntilChange = 60 - currentMinute;
    if (minutesUntilChange === 60) {
      minutesUntilChange = 0;
    } else {
      hoursUntilChange--;
    }
    Logger.info(
      `Roll window is INACTIVE. ${hoursUntilChange}h ${minutesUntilChange}m until window opens`
    );
  }
};

// Add this helper function to check if a thread is ready for rolling
const isThreadReadyForRoll = async (thread, isAutoRoll = false) => {
  // Check if item has been marked as sent
  const messages = await thread.messages.fetch();
  const itemSentMessage = messages.find(
    (msg) =>
      msg.author.id === client.user.id &&
      msg.embeds[0]?.title === "🎁 Item Marked as Sent"
  );

  if (itemSentMessage) {
    return {
      ready: false,
      reason:
        "This item has already been marked as sent and cannot be rolled for.",
    };
  }

  // Only check time-based restrictions for auto-rolls
  if (isAutoRoll) {
    // Get the thread creation time
    const threadAge = Date.now() - thread.createdTimestamp;

    // Check if thread is old enough
    if (threadAge < THREAD_SETTINGS.MIN_ROLL_AGE) {
      return {
        ready: false,
        reason: "Thread is not old enough for rolling yet.",
      };
    }

    // Check time window for auto-rolls
    if (!isWithinRollWindow()) {
      return {
        ready: false,
        reason: "Outside of automatic roll window.",
      };
    }

    // Add small delay to avoid rolling right at window start
    if (
      threadAge <
      THREAD_SETTINGS.MIN_ROLL_AGE + THREAD_SETTINGS.AUTO_ROLL_DELAY
    ) {
      return {
        ready: false,
        reason: "Waiting for auto-roll delay after entering roll window.",
      };
    }
  }

  return { ready: true };
};

// Add this helper function to check if a thread has been rolled
const hasThreadBeenRolled = async (thread) => {
  const messages = await thread.messages.fetch();
  return messages.some(
    (msg) =>
      msg.author.id === client.user.id &&
      // Check for roll result embeds
      (msg.embeds.some(
        (embed) =>
          embed.title?.includes("Roll Results") ||
          embed.title?.includes("Tiebreaker #")
      ) ||
        // Check for winner announcement embeds
        msg.embeds.some((embed) => embed.title === "🏆 Winner Announced") ||
        // Check for item sent embeds
        msg.embeds.some((embed) => embed.title === "🎁 Item Marked as Sent"))
  );
};

// Add this function to handle automatic rolling
const autoRollThread = async (thread) => {
  try {
    // Double check thread status before proceeding
    if (thread.archived) {
      Logger.info(`Skipping auto-roll for archived thread: ${thread.name}`);
      return false;
    }

    // Get instruction message (second message in thread)
    const messages = await thread.messages.fetch();
    const instructionMsg = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .at(1);

    if (!instructionMsg) return;

    // Check reactions in priority order
    for (const rollType of ROLL_PRIORITY) {
      const emoji = ROLL_TO_EMOJI[rollType];
      const reaction = instructionMsg.reactions.cache.find(
        (r) => r.emoji.name === emoji
      );

      if (!reaction) continue;

      await reaction.users.fetch();
      const users = [...reaction.users.cache.values()].filter(
        (user) => !user.bot
      );

      if (users.length > 0) {
        // Found the highest priority reaction with users
        await processRoll(
          {
            channel: thread,
            guild: thread.guild,
            editReply: async (content) => {
              return await thread.send(content);
            },
          },
          instructionMsg,
          rollType,
          emoji
        );
        return true;
      }
    }
    return false;
  } catch (error) {
    if (error.code === "50083") {
      // Thread is archived
      Logger.info(
        `Thread ${thread.name} was archived during auto-roll attempt`
      );
      return false;
    }
    Logger.error(
      `Auto-roll failed for thread ${thread.name}: ${error.message}`
    );
    return false;
  }
};

// Add the automatic roll checker
const checkAndAutoRoll = async () => {
  try {
    // Get all active forum channels
    const forumChannels = Object.values(ROLE_TO_FORUM)
      .filter((config) => config.enabled)
      .map((config) => config.channel);

    for (const channelId of forumChannels) {
      const forumChannel = await client.channels.fetch(channelId);
      if (!forumChannel) continue;

      // Get active threads
      const threads = await forumChannel.threads.fetchActive();

      for (const [_, thread] of threads.threads) {
        try {
          // Skip if thread is locked or archived
          if (thread.locked || thread.archived) continue;

          // Skip if already rolled
          if (await hasThreadBeenRolled(thread)) continue;

          // Check if thread is ready for rolling
          const readyCheck = await isThreadReadyForRoll(thread, true);
          if (!readyCheck.ready) {
            Logger.info(
              `Thread ${thread.name} not ready: ${readyCheck.reason}`
            );
            continue;
          }

          // Perform the roll
          const rolled = await autoRollThread(thread);
          if (rolled) {
            Logger.info(`Auto-rolled thread: ${thread.name}`);
          }
        } catch (error) {
          Logger.error(
            `Error processing thread ${thread.name}: ${error.message}`
          );
        }
      }
    }
  } catch (error) {
    Logger.error(`Auto-roll check failed: ${error.message}`);
  }
};

const createItemSentEmbed = (sender) => {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("🎁 Item Marked as Sent")
    .setDescription(`This item has been marked as sent by ${sender}.`)
    .setTimestamp();
};

// Add thread cleanup function
const cleanupOldThreads = async () => {
  try {
    // Get all active forum channels
    const forumChannels = Object.values(ROLE_TO_FORUM)
      .filter((config) => config.enabled)
      .map((config) => config.channel);

    for (const channelId of forumChannels) {
      const forumChannel = await client.channels.fetch(channelId);
      if (!forumChannel) continue;

      // Get both active and archived threads
      const allThreads = [
        ...(await forumChannel.threads.fetchActive()).threads.values(),
        ...(await forumChannel.threads.fetchArchived()).threads.values(),
      ];

      for (const thread of allThreads) {
        try {
          // Get thread messages
          const messages = await thread.messages.fetch();
          const itemSentMessage = messages.find(
            (msg) =>
              msg.author.id === client.user.id &&
              msg.embeds[0]?.title === "🎁 Item Marked as Sent"
          );

          // If thread has been marked as sent
          if (itemSentMessage) {
            const timeSinceMarkedSent =
              Date.now() - itemSentMessage.createdTimestamp;

            // If enough time has passed since being marked as sent
            if (timeSinceMarkedSent >= THREAD_SETTINGS.CLEANUP_DELAY) {
              await thread.delete();
              Logger.info(
                `Deleted old thread: ${
                  thread.name
                } (marked as sent ${Math.floor(
                  timeSinceMarkedSent / (24 * 60 * 60 * 1000)
                )} days ago)`
              );
            }
          }
        } catch (error) {
          if (error.code === 10008) {
            // Unknown Message error - thread might have been deleted
            continue;
          }
          Logger.error(
            `Error processing thread ${thread.name} for cleanup: ${error.message}`
          );
        }
      }
    }
  } catch (error) {
    Logger.error(`Thread cleanup failed: ${error.message}`);
  }
};

client.login(process.env.TOKEN);
