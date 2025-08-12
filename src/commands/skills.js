const { SlashCommandBuilder, ComponentType, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { formatCharacterName, createErrorReply, findClosestCharacter } = require('../utils/helpers');

module.exports = {
  name: 'skills',
  data: new SlashCommandBuilder()
    .setName('skills')
    .setDescription('Get the skill order for a hero')
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

    const dataPath = path.join(__dirname, '..', 'data', 'skills', `${character}.json`);
    let dataRaw;
    try {
      dataRaw = await fs.promises.readFile(dataPath, 'utf8');
    } catch {
      return interaction.reply(createErrorReply(`There is currently no skill order for "${formattedName}" available.`));
    }

    let skillData;
    try {
      skillData = JSON.parse(dataRaw);
    } catch {
      return interaction.reply(createErrorReply(`Skill order for "${formattedName}" is invalid.`));
    }

    const { skills = [], providedBy, lastUpdated, info } = skillData;

    if (!Array.isArray(skills) || skills.length !== 4) {
      return interaction.reply(createErrorReply(`Skill order "${formattedName}" is not formatted correctly or has more than 4 skills.`));
    }

    const unixTimestamp = lastUpdated ? Math.floor(new Date(lastUpdated).getTime() / 1000) : null;

    const footerText = [];
    if (providedBy) footerText.push(`Provided by ${providedBy}`);
    if (unixTimestamp) footerText.push(`Last updated on <t:${unixTimestamp}:D>`);

    const componentsArray = [
      { type: ComponentType.TextDisplay, content: `**Skill Order for ${formattedName}**` },
      { type: ComponentType.Separator },
      {
        type: ComponentType.TextDisplay,
        content: skills.map((skill, index) => `${index + 1}. ${skill}`).join('\n')
      },
      { type: ComponentType.Separator },
    ];

    if (info && info.trim() !== '') {
      componentsArray.push({ type: ComponentType.TextDisplay, content: `> ${info}` });
      componentsArray.push({ type: ComponentType.Separator });
    }

    componentsArray.push({ type: ComponentType.TextDisplay, content: footerText.join(' - ') });

    return interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
      components: [
        {
          type: ComponentType.Container,
          accent_color: 0x3498DB,
          components: componentsArray
        }
      ]
    });
  }
};