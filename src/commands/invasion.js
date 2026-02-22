// Refactored invasion command - main entry point
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { createErrorReply } = require('../utils/helpers');
const { InvasionUtils } = require('../utils/invasionUtils');

module.exports = {
  name: 'invasion',
  data: new SlashCommandBuilder()
    .setName('invasion')
    .setDescription('Schedule an alliance invasion using Discord Events')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents), // Require manage events permission

  async execute(interaction) {
    try {
      // Show date selection menu
      const dateOptions = InvasionUtils.generateDateOptions();

      const dateMenu = new StringSelectMenuBuilder()
        .setCustomId('invasion_date_select')
        .setPlaceholder('📅 Select invasion date')
        .addOptions(dateOptions);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const dateRow = new ActionRowBuilder().addComponents(dateMenu);
      const buttonRow = new ActionRowBuilder().addComponents(cancelButton);

      const embed = InvasionUtils.createStepEmbed(
        1, 5,
        'Select Date',
        'Choose the date for your invasion event'
      );

      await interaction.reply({
        embeds: [embed],
        components: [dateRow, buttonRow],
        ephemeral: false,
      });

    } catch (error) {
      console.error('Invasion command error:', error);
      return createErrorReply(interaction, 'Error starting invasion scheduler.');
    }
  },
};