const { SlashCommandBuilder, ComponentType, AttachmentBuilder, MediaGalleryBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { formatCharacterName, createErrorReply, findClosestCharacter } = require('../utils/helpers');

module.exports = {
  name: 'talenttree',
  data: new SlashCommandBuilder()
    .setName('talenttree')
    .setDescription('Get the talent tree for a hero')
    .addStringOption(option =>
      option
        .setName('hero')
        .setDescription('Choose a hero')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    let inputName = interaction.options.getString('hero');
    let character = findClosestCharacter(inputName);

    if (!character) {
      return interaction.reply(createErrorReply(`No matching hero found for "${inputName}".`));
    }

    const formattedName = formatCharacterName(character);

    try {
      const dataPath = path.join(__dirname, '..', 'data', 'talenttrees', `${character}.json`);
      let dataRaw;
      try {
        dataRaw = await fs.promises.readFile(dataPath, 'utf8');
      } catch {
        return interaction.reply(createErrorReply(`There is currently no Talent Tree for "${formattedName}" available.`));
      }

      const { providedBy, lastUpdated } = JSON.parse(dataRaw);
      const unixTimestamp = Math.floor(new Date(lastUpdated).getTime() / 1000);

      const image1Path = path.join(__dirname, '..', 'assets', 'talenttrees', `${character}-1.webp`);
      const image2Path = path.join(__dirname, '..', 'assets', 'talenttrees', `${character}-2.webp`);

      try {
        await Promise.all([fs.promises.access(image1Path), fs.promises.access(image2Path)]);
      } catch {
        return interaction.reply(createErrorReply(`There is currently no Talent Tree for "${formattedName}" available.`));
      }

      const file1 = new AttachmentBuilder(image1Path);
      const file2 = new AttachmentBuilder(image2Path);

      const gallery = new MediaGalleryBuilder()
        .addItems(
          item => item.setDescription(`${formattedName} Talent Tree (Part 1)`).setURL(`attachment://${character}-1.webp`),
          item => item.setDescription(`${formattedName} Talent Tree (Part 2)`).setURL(`attachment://${character}-2.webp`)
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        files: [file1, file2],
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x3498DB,
            components: [
              { type: ComponentType.TextDisplay, content: `**Talent Tree for ${formattedName}**` },
              { type: ComponentType.Separator },
              gallery,
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: `Provided by ${providedBy} - Last updated on <t:${unixTimestamp}:D>` }
            ]
          }
        ]
      });

    } catch (error) {
      console.error('/talenttree error:', error);
      return interaction.reply(createErrorReply('Error while loading talent tree.'));
    }
  }
};