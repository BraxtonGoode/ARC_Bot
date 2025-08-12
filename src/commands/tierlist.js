const { SlashCommandBuilder, ComponentType, AttachmentBuilder, MediaGalleryBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'tierlist',
  data: new SlashCommandBuilder()
    .setName('tierlist')
    .setDescription('Get the current hero tier list'),

  async execute(interaction) {
    try {
      const jsonPath = path.join(__dirname, '..', 'data', 'tierlist.json');
      let jsonRaw;
      try {
        jsonRaw = await fs.promises.readFile(jsonPath, 'utf8');
      } catch {
        return interaction.reply(createErrorReply(`Couldn't load tier list data.`));
      }

      const { providedBy, lastUpdated } = JSON.parse(jsonRaw);
      const unixTimestamp = Math.floor(new Date(lastUpdated).getTime() / 1000);

      const imagePath = path.join(__dirname, '..', 'assets', 'tierlist.webp');
      try {
        await fs.promises.access(imagePath);
      } catch {
        return interaction.reply(createErrorReply(`Couldn't find tier list image.`));
      }

      const file = new AttachmentBuilder(imagePath);

      const gallery = new MediaGalleryBuilder()
        .addItems(item =>
          item
            .setDescription('Hero Tier List')
            .setURL(`attachment://tierlist.webp`)
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        files: [file],
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x3498DB,
            components: [
              { type: ComponentType.TextDisplay, content: `**Hero Tier List**` },
              { type: ComponentType.Separator },
              gallery,
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: `Provided by ${providedBy} - Last updated on <t:${unixTimestamp}:D>` }
            ]
          }
        ]
      });

    } catch (error) {
      console.error('/tierlist error:', error);
      return interaction.reply(createErrorReply('Error while loading tier list.'));
    }
  }
};