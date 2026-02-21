const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
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
      // Show date selection menu
      const dateOptions = this.generateDateOptions();

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

      const embed = new EmbedBuilder()
        .setTitle('🚨 Schedule Alliance Invasion')
        .setDescription('Step 1/3: Select the date for your invasion')
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [dateRow, buttonRow],
        ephemeral: true,
      });
    } catch (error) {
      console.error('/invasion command error:', error);
      return createErrorReply(
        interaction,
        'Error while opening invasion scheduler.',
      );
    }
  },

  // Generate date options for the next 30 days
  generateDateOptions() {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let label = displayDate;
      if (i === 0) label = `Today (${displayDate})`;
      if (i === 1) label = `Tomorrow (${displayDate})`;

      options.push({
        label: label,
        value: dateStr,
        description: `${date.toLocaleDateString('en-US', { weekday: 'long' })}`,
      });
    }

    return options;
  },

  // Generate time options (every hour, 24-hour format)
  generateTimeOptions() {
    const options = [];

    for (let hour = 0; hour < 24; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const displayTime = new Date(
        `2000-01-01T${timeStr}:00Z`,
      ).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });

      options.push({
        label: `${timeStr} (${displayTime} UTC)`,
        value: timeStr,
        description: `${displayTime} UTC`,
      });
    }

    return options;
  },

  // Handle date selection
  async handleDateSelection(interaction) {
    try {
      const selectedDate = interaction.values[0];

      const timeOptions = this.generateTimeOptions();
      const timeMenu = new StringSelectMenuBuilder()
        .setCustomId(`invasion_time_select:${selectedDate}`)
        .setPlaceholder('🕐 Select invasion time (UTC)')
        .addOptions(timeOptions);

      const backButton = new ButtonBuilder()
        .setCustomId('invasion_back_to_date')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const timeRow = new ActionRowBuilder().addComponents(timeMenu);
      const buttonRow = new ActionRowBuilder().addComponents(
        backButton,
        cancelButton,
      );

      const selectedDateObj = new Date(selectedDate + 'T00:00:00Z');
      const formattedDate = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const embed = new EmbedBuilder()
        .setTitle('🚨 Schedule Alliance Invasion')
        .setDescription(
          `Step 2/3: Select the time for your invasion\n\n📅 **Selected Date:** ${formattedDate}`,
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: [timeRow, buttonRow],
      });
    } catch (error) {
      console.error('Date selection error:', error);
      return createErrorReply(interaction, 'Error processing date selection.');
    }
  },

  // Handle time selection
  async handleTimeSelection(interaction) {
    try {
      const [, selectedDate] = interaction.customId.split(':');
      const selectedTime = interaction.values[0];

      // Generate reminder options
      const reminderOptions = [
        {
          label: '5 minutes before',
          value: '5',
          description: 'Quick reminder',
        },
        {
          label: '15 minutes before',
          value: '15',
          description: 'Short notice',
        },
        {
          label: '30 minutes before',
          value: '30',
          description: 'Standard reminder',
        },
        { label: '60 minutes before', value: '60', description: 'Long notice' },
        {
          label: '2 hours before',
          value: '120',
          description: 'Extra long notice',
        },
        {
          label: 'No reminder',
          value: '0',
          description: 'Invasion notification only',
        },
      ];

      const reminderMenu = new StringSelectMenuBuilder()
        .setCustomId(`invasion_reminder_select:${selectedDate}:${selectedTime}`)
        .setPlaceholder('⏰ Select reminder time')
        .addOptions(reminderOptions);

      const backButton = new ButtonBuilder()
        .setCustomId('invasion_back_to_time')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const reminderRow = new ActionRowBuilder().addComponents(reminderMenu);
      const buttonRow = new ActionRowBuilder().addComponents(
        backButton,
        cancelButton,
      );

      const selectedDateObj = new Date(
        selectedDate + 'T' + selectedTime + ':00Z',
      );
      const formattedDate = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = selectedDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });

      const embed = new EmbedBuilder()
        .setTitle('🚨 Schedule Alliance Invasion')
        .setDescription(
          `Step 3/3: Select when to send the reminder\n\n📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC`,
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: [reminderRow, buttonRow],
      });
    } catch (error) {
      console.error('Time selection error:', error);
      return createErrorReply(interaction, 'Error processing time selection.');
    }
  },

  // Handle reminder selection and finalize invasion
  async handleReminderSelection(interaction) {
    try {
      const [, selectedDate, selectedTime] = interaction.customId.split(':');
      const reminderMinutes = parseInt(interaction.values[0]);

      // Create the invasion date
      const invasionDate = new Date(selectedDate + 'T' + selectedTime + ':00Z');

      // Validate that the date is in the future
      if (invasionDate <= new Date()) {
        return interaction.update({
          content:
            '❌ The selected time is in the past. Please start over and select a future time.',
          embeds: [],
          components: [],
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
        description: 'Alliance Invasion', // Default description
        reminderMinutes: reminderMinutes,
        reminded: false,
        completed: false,
      };

      invasions.push(invasion);

      // Save to file
      fs.writeFileSync(INVASIONS_FILE, JSON.stringify(invasions, null, 2));

      const embed = new EmbedBuilder()
        .setTitle('✅ Invasion Scheduled Successfully!')
        .setDescription('Your alliance invasion reminder has been set up!')
        .addFields(
          {
            name: '📅 Invasion Time (UTC)',
            value: `<t:${Math.floor(invasionDate.getTime() / 1000)}:F>`,
            inline: false,
          },
          {
            name: '⏰ Reminder',
            value:
              reminderMinutes > 0
                ? `${reminderMinutes} minutes before invasion`
                : 'No reminder (invasion notification only)',
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

      // Add countdown for reminder if applicable
      if (reminderMinutes > 0) {
        const reminderTime = new Date(
          invasionDate.getTime() - reminderMinutes * 60 * 1000,
        );
        if (reminderTime > new Date()) {
          embed.addFields({
            name: '🔔 Reminder Time (UTC)',
            value: `<t:${Math.floor(reminderTime.getTime() / 1000)}:F>`,
            inline: false,
          });
        }
      }

      await interaction.update({
        embeds: [embed],
        components: [],
      });

      // Schedule the invasion
      invasionManager.scheduleInvasion(invasion);
    } catch (error) {
      console.error('Reminder selection error:', error);
      return createErrorReply(
        interaction,
        'Error finalizing invasion schedule.',
      );
    }
  },

  // Handle navigation buttons
  async handleBackToDate(interaction) {
    // Restart the process by showing date selection
    await this.execute(interaction);
  },

  async handleBackToTime(interaction) {
    // Go back to time selection - need to extract the date from current state
    // For now, restart the process
    await this.execute(interaction);
  },

  async handleCancel(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Invasion Scheduling Cancelled')
      .setDescription('The invasion scheduling has been cancelled.')
      .setColor(0xff0000)
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: [],
    });
  },
};
