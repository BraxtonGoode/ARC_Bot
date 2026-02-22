const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'invasions',
  data: new SlashCommandBuilder()
    .setName('invasions')
    .setDescription('List all scheduled invasion events'),

  async execute(interaction) {
    try {
      // Fetch all scheduled events for the guild
      const scheduledEvents = await interaction.guild.scheduledEvents.fetch();

      // Filter for invasion events (events that contain "invasion" in name or description)
      const invasionEvents = scheduledEvents.filter(
        (event) =>
          event.name.toLowerCase().includes('invasion') ||
          (event.description &&
            event.description.toLowerCase().includes('invasion')),
      );

      if (invasionEvents.size === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📅 Scheduled Invasions')
          .setDescription(
            'No invasion events are currently scheduled.\n\nUse `/invasion` to schedule a new invasion event!',
          )
          .setColor(0x95a5a6)
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Convert to array and sort by start time
      const eventsArray = Array.from(invasionEvents.values())
        .filter((event) => event.scheduledStartTimestamp > Date.now()) // Only future events
        .sort((a, b) => a.scheduledStartTimestamp - b.scheduledStartTimestamp);

      if (eventsArray.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📅 Scheduled Invasions')
          .setDescription(
            'No upcoming invasion events found.\n\nUse `/invasion` to schedule a new invasion event!',
          )
          .setColor(0x95a5a6)
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 Scheduled Invasion Events')
        .setColor(0x3498db)
        .setTimestamp()
        .setFooter({
          text: `${eventsArray.length} upcoming invasion event${eventsArray.length === 1 ? '' : 's'}`,
        });

      // Add fields for each invasion event (max 10 to avoid embed limits)
      const eventsToShow = eventsArray.slice(0, 10);

      eventsToShow.forEach((event, index) => {
        const startTime = new Date(event.scheduledStartTimestamp);
        const endTime = event.scheduledEndTimestamp
          ? new Date(event.scheduledEndTimestamp)
          : null;

        // Calculate duration if end time exists
        let durationText = 'Not specified';
        if (endTime) {
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));
          if (durationMinutes >= 60) {
            const hours = Math.floor(durationMinutes / 60);
            const mins = durationMinutes % 60;
            durationText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
          } else {
            durationText = `${durationMinutes}m`;
          }
        }

        // Get status based on current time
        const now = Date.now();
        let statusEmoji = '';
        let statusText = '';

        if (event.status === 'SCHEDULED') {
          if (startTime.getTime() > now) {
            statusEmoji = '⏰';
            statusText = 'Scheduled';
          } else if (endTime && endTime.getTime() > now) {
            statusEmoji = '🔴';
            statusText = 'Live Now!';
          } else {
            statusEmoji = '✅';
            statusText = 'Completed';
          }
        } else if (event.status === 'ACTIVE') {
          statusEmoji = '🔴';
          statusText = 'Live Now!';
        } else if (event.status === 'COMPLETED') {
          statusEmoji = '✅';
          statusText = 'Completed';
        } else if (event.status === 'CANCELLED') {
          statusEmoji = '❌';
          statusText = 'Cancelled';
        }

        let fieldValue =
          `**Start:** <t:${Math.floor(startTime.getTime() / 1000)}:F>\n` +
          `**Duration:** ${durationText}\n` +
          `**Status:** ${statusEmoji} ${statusText}\n` +
          `**Interested:** ${event.userCount || 0} members`;

        if (endTime) {
          fieldValue += `\n**End:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`;
        }

        // Add event link
        fieldValue += `\n**[View Event](https://discord.com/events/${interaction.guildId}/${event.id})**`;

        embed.addFields({
          name: `${index + 1}. ${event.name}`,
          value: fieldValue,
          inline: true,
        });
      });

      if (eventsArray.length > 10) {
        embed.setDescription(
          `Showing first 10 of ${eventsArray.length} scheduled invasion events.`,
        );
      }

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('/invasions command error:', error);
      return createErrorReply(
        interaction,
        'Error while fetching invasion list.',
      );
    }
  },
};
