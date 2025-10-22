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
  name: 'tierlist',
  data: new SlashCommandBuilder()
    .setName('tierlist')
    .setDescription('Get the current hero tier list')
    .addStringOption((option) =>
      option
        .setName('tierlist')
        .setDescription('choose a tier list version')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    const tierlistChoice = interaction.options.getString('tierlist');

    // resolve the user's input to an actual tierlist filename
    const resolved = findClosestTierlist(tierlistChoice);
    if (!resolved) {
      return interaction.reply(
        createErrorReply(`No matching tier list found for "${tierlistChoice}".`)
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
        `${filename}.json`
      );
      let dataRaw;
      try {
        dataRaw = await fs.promises.readFile(dataPath, 'utf8');
      } catch {
        return interaction.reply(
          createErrorReply(
            `Couldn't load tier list "${formattedTierlistName}" data.`
          )
        );
      }

      const { providedBy, lastUpdated } = JSON.parse(dataRaw);
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
            `Couldn't find tier list image for "${formattedTierlistName}".`
          )
        );
      }

      const file = new AttachmentBuilder(imagePath);

      const gallery = new MediaGalleryBuilder().addItems((item) =>
        item
          .setDescription(`${formattedTierlistName} Tier List`)
          .setURL(`attachment://${path.basename(imagePath)}`)
      );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        files: [file],
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x3498db,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `**${formattedTierlistName} Tier List**`,
              },
              { type: ComponentType.Separator },
              gallery,
              { type: ComponentType.Separator },
              {
                type: ComponentType.TextDisplay,
                content: `Provided by ${providedBy} - Last updated on <t:${unixTimestamp}:D>`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('/tierlist error:', error);
      return interaction.reply(
        createErrorReply('Error while loading tier list.')
      );
    }
  },
  // autocomplete handled centrally in src/events/interactionCreate.js
};
