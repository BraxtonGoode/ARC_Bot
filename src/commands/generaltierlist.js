const {
  SlashCommandBuilder,
  ComponentType,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MessageFlags,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const {
  createErrorReply,
  formatTierlistName,
  findClosestTierlist,
} = require('../utils/helpers');

module.exports = {
  name: 'generaltierlist',
  data: new SlashCommandBuilder()
    .setName('generaltierlist')
    .setDescription('Get the current hero tier lists')
    .addStringOption((option) =>
      option
        .setName('tierlist')
        .setDescription('choose a tier list version')
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async execute(interaction) {
    const tierlistChoice = interaction.options.getString('tierlist');

    // resolve the user's input to an actual tierlist filename
    const resolved = findClosestTierlist(tierlistChoice);
    if (!resolved) {
      return interaction.reply(
        createErrorReply(
          `No matching tier list found for "${tierlistChoice}".`,
        ),
      );
    }
    // Validate that the selected tierlist belongs to the general category
  const tierlistsPath = path.join(__dirname, '..', 'data', 'tierlists.json');
  let tierlistChoices = [];

  try {
    const raw = await fs.promises.readFile(tierlistsPath, 'utf8');
    tierlistChoices = JSON.parse(raw);
  } catch {
    return interaction.reply(
      createErrorReply('Could not load tierlist categories.'),
    );
  }

  const selected = tierlistChoices.find((choice) => choice.value === resolved);

  if (!selected || selected.category !== 'general') {
    return interaction.reply(
      createErrorReply(
        'That tierlist is not in the General category. Use /advancedtierlist for advanced lists.',
      ),
    );
  }

    const filename = resolved; // filename without extension
    const formattedTierlistName = formatTierlistName(filename);

    try {
      // load the selected tierlist JSON from data/tierlists/<choice>.json
      const dataPath = path.join(
        __dirname,
        '..',
        'data',
        'tierlists',
        `${filename}.json`,
      );
      let dataRaw;
      try {
        dataRaw = await fs.promises.readFile(dataPath, 'utf8');
      } catch {
        return interaction.reply(
          createErrorReply(
            `Couldn't load tier list "${formattedTierlistName}" data.`,
          ),
        );
      }

      const { providedBy, lastUpdated, info } = JSON.parse(dataRaw);
      const unixTimestamp = Math.floor(new Date(lastUpdated).getTime() / 1000);

      // look for an image in assets/tierlists named <choice>.webp (or png/jpg fallback)
      const assetsDir = path.join(__dirname, '..', 'assets', 'tierlists');
      const possibleFiles = [
        `${filename}.webp`,
        `${filename}.png`,
        `${filename}.jpg`,
        `${filename}.jpeg`,
      ];
      let imagePath = null;
      for (const f of possibleFiles) {
        const p = path.join(assetsDir, f);
        try {
          await fs.promises.access(p);
          imagePath = p;
          break;
        } catch {
          // continue
        }
      }

      if (!imagePath) {
        return interaction.reply(
          createErrorReply(
            `Couldn't find tier list image for "${formattedTierlistName}".`,
          ),
        );
      }

      const file = new AttachmentBuilder(imagePath);

      const gallery = new MediaGalleryBuilder().addItems((item) =>
        item
          .setDescription(`${formattedTierlistName} Tier List`)
          .setURL(`attachment://${path.basename(imagePath)}`),
      );

      const componentsArray = [
        {
          type: ComponentType.TextDisplay,
          content: `**${formattedTierlistName}**`,
        },
        { type: ComponentType.Separator },
        gallery,
        { type: ComponentType.Separator },
      ];

      if (info && info.trim() !== '') {
        componentsArray.push({
          type: ComponentType.TextDisplay,
          content: `> ${info}`,
        });
        componentsArray.push({ type: ComponentType.Separator });
      }

      componentsArray.push({
        type: ComponentType.TextDisplay,
        content: `Provided by ${providedBy} - Last updated on <t:${unixTimestamp}:D>`,
      });

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        files: [file],
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x3498db,
            components: componentsArray,
          },
        ],
      });
    } catch (error) {
      console.error('/tierlist error:', error);
      return interaction.reply(
        createErrorReply('Error while loading tier list.'),
      );
    }
  },
  // autocomplete handled centrally in src/events/interactionCreate.js
};
