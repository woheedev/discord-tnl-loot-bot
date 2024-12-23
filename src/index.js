import {
  Client,
  GatewayIntentBits,
  ApplicationCommandOptionType,
} from "discord.js";
import dotenv from "dotenv";
import chalk from "chalk";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

dotenv.config();

const AUTHORIZED_ROLES = {
  LEADERSHIP: "1309271313398894643",
  OFFICER: "1309284427553312769",
};

const AUTHORIZED_USERS = [
  "229660875424792576", // Bevu
  "151506204500295680", // Cross
];

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
    channel: "LOOT_CHANNEL_ID",
    enabled: false,
    name: "Hurricane",
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
  OFF_TRAIT: "🧪",
  LITHO_GREED: "📖",
};

const EMOJI_DESCRIPTIONS = {
  MAIN_ITEM: "Need the item for your main build",
  MAIN_UNLOCK: "Need to unlock a trait for main build",
  MAIN_TRAIT: "Need the base trait for main build",
  OFF_ITEM: "Need the item for offbuild / pve",
  OFF_TRAIT: "Need the base trait for offbuild / pve",
  LITHO_GREED: "Litho collection or general greed",
};

const ROLL_OPTIONS = {
  MAIN_ITEM: "mainitem",
  MAIN_UNLOCK: "mainunlock",
  MAIN_TRAIT: "maintrait",
  OFF_ITEM: "offitem",
  OFF_TRAIT: "offtrait",
  LITHO_GREED: "lithogreed",
};

const ROLL_TO_EMOJI = {
  [ROLL_OPTIONS.MAIN_ITEM]: REACTION_EMOJIS.MAIN_ITEM,
  [ROLL_OPTIONS.MAIN_UNLOCK]: REACTION_EMOJIS.MAIN_UNLOCK,
  [ROLL_OPTIONS.MAIN_TRAIT]: REACTION_EMOJIS.MAIN_TRAIT,
  [ROLL_OPTIONS.OFF_ITEM]: REACTION_EMOJIS.OFF_ITEM,
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
    "Guilded Raven Mask": {
      image: "./images/head/guilded_raven_mask.png",
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

const isAuthorized = (userId, member) => {
  if (AUTHORIZED_USERS.includes(userId)) return true;
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

const Logger = {
  formatMessage: (type, msg) => `[${new Date().toISOString()}] ${type} ${msg}`,
  info: (msg) => console.log(chalk.blue(Logger.formatMessage("INFO", msg))),
  thread: (msg) =>
    console.log(chalk.green(Logger.formatMessage("THREAD", msg))),
  sync: (msg) => console.log(chalk.cyan(Logger.formatMessage("SYNC", msg))),
  warn: (msg) => console.log(chalk.yellow(Logger.formatMessage("WARN", msg))),
  error: (msg) => console.log(chalk.red(Logger.formatMessage("ERROR", msg))),
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Command registration
client.once("ready", async () => {
  Logger.info(`Bot logged in as ${client.user.tag}`);

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
      description: "Roll for users who reacted with specific emoji",
      options: [
        {
          name: "type",
          description: "Type of roll to perform",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Main Item", value: ROLL_OPTIONS.MAIN_ITEM },
            { name: "Main Unlock", value: ROLL_OPTIONS.MAIN_UNLOCK },
            { name: "Main Trait", value: ROLL_OPTIONS.MAIN_TRAIT },
            { name: "Off Item", value: ROLL_OPTIONS.OFF_ITEM },
            { name: "Off Trait", value: ROLL_OPTIONS.OFF_TRAIT },
            { name: "Litho/Greed", value: ROLL_OPTIONS.LITHO_GREED },
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

async function handleRoll(interaction) {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!isAuthorized(interaction.user.id, member)) {
    await interaction.reply({
      content: "You are not authorized to use this command.",
      ephemeral: true,
    });
    return;
  }

  if (!interaction.channel.isThread()) {
    await interaction.reply({
      content: "This command can only be used in item threads",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const rollType = interaction.options.getString("type");
    const emoji = ROLL_TO_EMOJI[rollType];

    // Get first message in thread
    const messages = await interaction.channel.messages.fetch();
    const instructionMsg = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .at(1);

    // Get reaction and users
    const reaction = instructionMsg.reactions.cache.find(
      (r) => r.emoji.name === emoji
    );
    if (!reaction) {
      await interaction.editReply("No users found with that reaction");
      return;
    }

    // Get users who reacted
    await reaction.users.fetch();
    const users = [...reaction.users.cache.values()].filter(
      (user) => !user.bot
    );

    if (users.length === 0) {
      await interaction.editReply("No users found with that reaction");
      return;
    }

    // Generate rolls
    const rolls = users
      .map((user) => ({
        user: user,
        roll: getSecureRandom(1, 100),
      }))
      .sort((a, b) => b.roll - a.roll);

    // Format message
    const resultMessage =
      `**Roll Results for ${emoji}**\n\n` +
      rolls
        .map(
          (entry, index) => `${index + 1}. ${entry.user} - **${entry.roll}**`
        )
        .join("\n");

    await interaction.editReply(resultMessage);
    Logger.info(
      `Roll performed in ${interaction.channel.name} for ${rollType}`
    );
  } catch (error) {
    await interaction.editReply("There was an error performing the roll");
    Logger.error(`Roll failed: ${error.message}`);
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
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member) {
      await interaction.editReply({
        content: "Error: You must be in the guild to use this command.",
        ephemeral: true,
      });
      return;
    }

    let forumChannelId = null;
    for (const [roleId, config] of Object.entries(ROLE_TO_FORUM)) {
      if (member.roles.cache.has(roleId)) {
        if (!config.enabled) {
          await interaction.editReply({
            content: `Error: The loot system is currently disabled for ${config.name}.`,
            ephemeral: true,
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
        ephemeral: true,
      });
      return;
    }

    const pieceName = interaction.options.getString("piece_name");
    const traitName = interaction.options.getString("trait_name");
    const itemCategory = getItemCategory(pieceName);

    if (!itemCategory || !ITEMS[itemCategory][pieceName]) {
      await interaction.editReply({
        content: "Please enter a valid item name.",
        ephemeral: true,
      });
      return;
    }

    if (!TRAITS.includes(traitName)) {
      await interaction.editReply({
        content: "Please enter a valid trait name.",
        ephemeral: true,
      });
      return;
    }

    const imagePath = ITEMS[itemCategory][pieceName].image;
    if (!imagePath) {
      await interaction.editReply({
        content: "No image found for this item.",
        ephemeral: true,
      });
      return;
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });
    const outputPath = path.join(
      TEMP_DIR,
      `${Date.now()}_${path.basename(imagePath)}`
    );
    const compositeImagePath = await createCompositeImage(
      imagePath,
      outputPath
    );
    if (!compositeImagePath) {
      await interaction.editReply({
        content: "Failed to process item image.",
        ephemeral: true,
      });
      return;
    }

    const forumChannel = await client.channels.fetch(forumChannelId);

    const config = Object.entries(ROLE_TO_FORUM).find(([id, _]) =>
      member.roles.cache.has(id)
    )?.[1];
    const tagId = config?.tags?.[itemCategory];

    if (!tagId) {
      Logger.warn(`No tag found for category ${itemCategory}`);
    }

    // Create forum post
    const thread = await forumChannel.threads.create({
      name: `${pieceName} - ${traitName}`,
      appliedTags: [tagId],
      message: {
        content: `**Item Details**
        • Item Piece: ${pieceName}
        • Trait: ${traitName}`,
        files: [compositeImagePath],
      },
    });

    await fs.unlink(compositeImagePath);

    await thread.send(`**React to this message based on your needs:**
      ${REACTION_EMOJIS.MAIN_ITEM} - ${EMOJI_DESCRIPTIONS.MAIN_ITEM}
      ${REACTION_EMOJIS.MAIN_UNLOCK} - ${EMOJI_DESCRIPTIONS.MAIN_UNLOCK}
      ${REACTION_EMOJIS.MAIN_TRAIT} - ${EMOJI_DESCRIPTIONS.MAIN_TRAIT}
      ${REACTION_EMOJIS.OFF_ITEM} - ${EMOJI_DESCRIPTIONS.OFF_ITEM}
      ${REACTION_EMOJIS.OFF_TRAIT} - ${EMOJI_DESCRIPTIONS.OFF_TRAIT}
      ${REACTION_EMOJIS.LITHO_GREED} - ${EMOJI_DESCRIPTIONS.LITHO_GREED}
      
      *Please react with only one emoji that best describes your need.*`);

    // Add reactions to the instruction message instead of first post
    const instructionMsg = (await thread.messages.fetch()).first();
    await instructionMsg.react(REACTION_EMOJIS.MAIN_ITEM);
    await instructionMsg.react(REACTION_EMOJIS.MAIN_UNLOCK);
    await instructionMsg.react(REACTION_EMOJIS.MAIN_TRAIT);
    await instructionMsg.react(REACTION_EMOJIS.OFF_ITEM);
    await instructionMsg.react(REACTION_EMOJIS.OFF_TRAIT);
    await instructionMsg.react(REACTION_EMOJIS.LITHO_GREED);

    await interaction.editReply({
      content: `Item listed successfully in ${thread}`,
      ephemeral: true,
    });
    Logger.thread(`New item thread created: ${pieceName} - ${traitName}`);
  } catch (error) {
    await interaction.editReply({
      content: "There was an error while listing the item.",
      ephemeral: true,
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

client.login(process.env.TOKEN);
