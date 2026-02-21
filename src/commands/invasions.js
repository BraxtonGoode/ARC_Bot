const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const invasionManager = require('../utils/invasionManager');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'invasions',
  data: new SlashCommandBuilder()
    .setName('invasions')
    .setDescription('List all scheduled invasion reminders'),

  async execute(interaction) {
    try {
      const activeInvasions = invasionManager.getActiveInvasions(interaction.guildId);

      if (activeInvasions.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📅 Scheduled Invasions')
          .setDescription('No invasions are currently scheduled.')
          .setColor(0x95a5a6)
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
      }

      // Sort invasions by time
      activeInvasions.sort((a, b) => new Date(a.invasionTime) - new Date(b.invasionTime));

      const embed = new EmbedBuilder()
        .setTitle('📅 Scheduled Invasions')
        .setColor(0x3498db)
        .setTimestamp()
        .setFooter({ text: `${activeInvasions.length} active invasion${activeInvasions.length === 1 ? '' : 's'}` });

      // Add fields for each invasion (max 10 to avoid embed limits)
      const invasionsToShow = activeInvasions.slice(0, 10);
      
      invasionsToShow.forEach((invasion, index) => {
        const invasionTime = new Date(invasion.invasionTime);
        const reminderTime = new Date(invasionTime.getTime() - (invasion.reminderMinutes * 60 * 1000));
        const now = new Date();

        let status = '';
        if (invasion.reminded) {
          status = '🔔 Reminder sent';
        } else if (reminderTime <= now) {
          status = '⏳ Reminder pending';
        } else {
          status = `⏰ Reminder in ${invasion.reminderMinutes}min`;
        }

        embed.addFields({
          name: `${index + 1}. ${invasion.description}`,
          value: `**Time:** <t:${Math.floor(invasionTime.getTime() / 1000)}:F>\n` +
                 `**Status:** ${status}\n` +
                 `**Channel:** <#${invasion.channelId}>\n` +
                 `**Scheduled by:** <@${invasion.scheduledBy}>`,
          inline: true
        });
      });

      if (activeInvasions.length > 10) {
        embed.setDescription(`Showing first 10 of ${activeInvasions.length} scheduled invasions.`);
      }

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error('/invasions command error:', error);
      return createErrorReply(interaction, 'Error while fetching invasion list.');
    }
  }
};