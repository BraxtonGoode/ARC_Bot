const {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createErrorReply } = require('../utils/helpers');
const invasionManager = require('../utils/invasionManager');

// Create invasion data file if it doesn't exist
const INVASIONS_FILE = path.join(__dirname, '..', 'data', 'invasions.json');
if (!fs.existsSync(INVASIONS_FILE)) {
  fs.writeFileSync(INVASIONS_FILE, JSON.stringify([], null, 2));
}

module.exports = {
  name: 'invasion',
  data: new SlashCommandBuilder()
    .setName('invasion')
    .setDescription('Schedule an alliance invasion reminder')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Require manage messages permission

  async execute(interaction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('invasion_modal')
        .setTitle('Schedule Alliance Invasion');

      const timeInput = new TextInputBuilder()
        .setCustomId('invasion_time')
        .setLabel('Invasion Time (UTC)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: 2026-02-22 15:30 or 02/22/2026 3:30 PM')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(25);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('invasion_description')
        .setLabel('Invasion Description (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: Main Alliance War vs. Fire Nation')
        .setRequired(false)
        .setMaxLength(100);

      const reminderTimeInput = new TextInputBuilder()
        .setCustomId('reminder_minutes')
        .setLabel('Reminder Time (minutes before)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: 30 (will remind 30 minutes before)')
        .setRequired(false)
        .setValue('30')
        .setMinLength(1)
        .setMaxLength(4);

      const firstActionRow = new ActionRowBuilder().addComponents(timeInput);
      const secondActionRow = new ActionRowBuilder().addComponents(
        descriptionInput,
      );
      const thirdActionRow = new ActionRowBuilder().addComponents(
        reminderTimeInput,
      );

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('/invasion command error:', error);
      return createErrorReply(
        interaction,
        'Error while opening invasion scheduler.',
      );
    }
  },

  async handleModal(interaction) {
    try {
      const timeInput = interaction.fields.getTextInputValue('invasion_time');
      const description =
        interaction.fields.getTextInputValue('invasion_description') ||
        'Alliance Invasion';
      const reminderMinutes =
        parseInt(interaction.fields.getTextInputValue('reminder_minutes')) ||
        30;

      // Parse the time input
      const invasionDate = this.parseDateTime(timeInput);
      if (!invasionDate || invasionDate <= new Date()) {
        return interaction.reply({
          content:
            '❌ Invalid time format or time is in the past. Please use format like:\n' +
            '- `2026-02-22 15:30` (24-hour format)\n' +
            '- `02/22/2026 3:30 PM` (12-hour format)\n' +
            '- Time must be in the future',
          flags: MessageFlags.Ephemeral,
        });
      }

      // Load existing invasions
      let invasions = [];
      try {
        const data = fs.readFileSync(INVASIONS_FILE, 'utf8');
        invasions = JSON.parse(data);
      } catch (error) {
        console.error('Error reading invasions file:', error);
      }

      // Create new invasion entry
      const invasion = {
        id: Date.now().toString(),
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        scheduledBy: interaction.user.id,
        scheduledAt: new Date().toISOString(),
        invasionTime: invasionDate.toISOString(),
        description: description,
        reminderMinutes: reminderMinutes,
        reminded: false,
        completed: false,
      };

      invasions.push(invasion);

      // Save to file
      fs.writeFileSync(INVASIONS_FILE, JSON.stringify(invasions, null, 2));

      // Calculate reminder time
      const reminderTime = new Date(
        invasionDate.getTime() - reminderMinutes * 60 * 1000,
      );
      const now = new Date();

      const embed = new EmbedBuilder()
        .setTitle('🚨 Invasion Scheduled Successfully!')
        .setDescription(description)
        .addFields(
          {
            name: '📅 Invasion Time (UTC)',
            value: `<t:${Math.floor(invasionDate.getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: '⏰ Reminder',
            value: `${reminderMinutes} minutes before invasion`,
            inline: true,
          },
          {
            name: '👤 Scheduled By',
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
        )
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({ text: `Invasion ID: ${invasion.id}` });

      // Add countdown
      if (reminderTime > now) {
        embed.addFields({
          name: '🔔 Reminder Time (UTC)',
          value: `<t:${Math.floor(reminderTime.getTime() / 1000)}:F>`,
          inline: false,
        });
      } else {
        embed.addFields({
          name: '⚠️ Note',
          value:
            'Reminder time has already passed - only invasion notification will be sent.',
          inline: false,
        });
      }

      await interaction.reply({
        embeds: [embed],
      });

      // Schedule the reminders
      invasionManager.scheduleInvasion(invasion);
    } catch (error) {
      console.error('Modal handling error:', error);
      return createErrorReply(
        interaction,
        'Error while scheduling invasion reminder.',
      );
    }
  },

  parseDateTime(input) {
    const cleanInput = input.trim();

    // Try various date formats
    const formats = [
      // ISO-like formats
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
      // MM/DD/YYYY formats
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
      // DD/MM/YYYY formats
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
    ];

    for (let i = 0; i < formats.length; i++) {
      const match = cleanInput.match(formats[i]);
      if (match) {
        let year,
          month,
          day,
          hours,
          minutes,
          seconds = 0;

        if (i === 0) {
          // ISO format YYYY-MM-DD
          [, year, month, day, hours, minutes, seconds] = match;
          seconds = seconds || 0;
        } else {
          // MM/DD/YYYY or DD/MM/YYYY
          let first, second;
          [, first, second, year, hours, minutes] = match;

          // Assume MM/DD/YYYY format (can be adjusted based on your region)
          month = first;
          day = second;

          // Handle AM/PM
          if (match[6]) {
            const isPM = match[6].toUpperCase() === 'PM';
            hours = parseInt(hours);
            if (isPM && hours !== 12) hours += 12;
            else if (!isPM && hours === 12) hours = 0;
          }
        }

        const date = new Date(
          Date.UTC(
            parseInt(year),
            parseInt(month) - 1, // months are 0-indexed
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds),
          ),
        );

        // Validate the date
        if (
          date.getUTCFullYear() == year &&
          date.getUTCMonth() == month - 1 &&
          date.getUTCDate() == day
        ) {
          return date;
        }
      }
    }

    return null;
  },
};
