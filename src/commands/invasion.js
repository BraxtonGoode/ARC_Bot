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
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
} = require('discord.js');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'invasion',
  data: new SlashCommandBuilder()
    .setName('invasion')
    .setDescription('Schedule an alliance invasion using Discord Events')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents), // Require manage events permission

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

  // Generate date options for the next 25 days (Discord limit)
  generateDateOptions() {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 25; i++) {
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

      // Generate duration options for the Discord event
      const durationOptions = [
        {
          label: '30 minutes',
          value: '30',
          description: 'Quick skirmish or rally',
        },
        {
          label: '1 hour',
          value: '60',
          description: 'Standard invasion duration',
        },
        {
          label: '2 hours',
          value: '120',
          description: 'Extended battle',
        },
        {
          label: '3 hours',
          value: '180',
          description: 'Long campaign',
        },
        {
          label: '4 hours',
          value: '240',
          description: 'Major war event',
        },
      ];

      const durationMenu = new StringSelectMenuBuilder()
        .setCustomId(`invasion_duration_select:${selectedDate}:${selectedTime}`)
        .setPlaceholder('⏱️ Select event duration')
        .addOptions(durationOptions);

      const backButton = new ButtonBuilder()
        .setCustomId('invasion_back_to_time')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const durationRow = new ActionRowBuilder().addComponents(durationMenu);
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
          `Step 3/3: Choose event duration\n\n📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC\n\n*This will create a Discord Event that appears in your server's Events tab*`,
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: [durationRow, buttonRow],
      });
    } catch (error) {
      console.error('Time selection error:', error);
      return createErrorReply(interaction, 'Error processing time selection.');
    }
  },

  // Handle duration selection and create Discord event
  async handleDurationSelection(interaction) {
    try {
      const [, selectedDate, selectedTime] = interaction.customId.split(':');
      const durationMinutes = parseInt(interaction.values[0]);

      // Create the invasion start date
      const startDate = new Date(selectedDate + 'T' + selectedTime + ':00Z');

      // Calculate end date
      const endDate = new Date(
        startDate.getTime() + durationMinutes * 60 * 1000,
      );

      // Validate that the date is in the future
      if (startDate <= new Date()) {
        return interaction.update({
          content:
            '❌ The selected time is in the past. Please start over and select a future time.',
          embeds: [],
          components: [],
        });
      }

      // Create Discord Scheduled Event
      try {
        const scheduledEvent = await interaction.guild.scheduledEvents.create({
          name: '⚔️ Alliance Invasion',
          scheduledStartTime: startDate,
          scheduledEndTime: endDate,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.External,
          entityMetadata: {
            location: 'Alliance Territory - Game World',
          },
          description: `🚨 **Alliance Invasion Event**

📅 **Date:** ${startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
🕐 **Time:** ${startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC',
          })} UTC
⏱️ **Duration:** ${durationMinutes} minutes

🎯 **What to do:**
• Gather your alliance members
• Prepare your battle strategies  
• Coordinate attacks and defenses
• Fight for glory and resources!

👥 **Scheduled by:** <@${interaction.user.id}>

*Click "Interested" to get notified when the invasion starts!*`,
          reason: `Alliance invasion scheduled by ${interaction.user.tag}`,
        });

        const embed = new EmbedBuilder()
          .setTitle('✅ Discord Event Created Successfully!')
          .setDescription(
            `🎉 Your alliance invasion has been scheduled as a Discord Event!\n\n**Event Details:**`,
          )
          .addFields(
            {
              name: '📅 Start Time (UTC)',
              value: `<t:${Math.floor(startDate.getTime() / 1000)}:F>`,
              inline: false,
            },
            {
              name: '⏱️ Duration',
              value: `${durationMinutes} minutes`,
              inline: true,
            },
            {
              name: '🏁 End Time (UTC)',
              value: `<t:${Math.floor(endDate.getTime() / 1000)}:F>`,
              inline: true,
            },
            {
              name: '🔗 Event Link',
              value: `[View Event](https://discord.com/events/${interaction.guildId}/${scheduledEvent.id})`,
              inline: false,
            },
            {
              name: '👤 Scheduled By',
              value: `<@${interaction.user.id}>`,
              inline: true,
            },
          )
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({
            text: 'Users can click "Interested" on the event to get notified!',
          });

        await interaction.update({
          embeds: [embed],
          components: [],
        });
      } catch (eventError) {
        console.error('Error creating scheduled event:', eventError);

        // Check if it's a permissions error
        if (eventError.code === 50013) {
          return interaction.update({
            content:
              '❌ **Permission Error**: I need the "Manage Events" permission to create Discord events. Please ask a server admin to give me this permission.',
            embeds: [],
            components: [],
          });
        }

        return interaction.update({
          content:
            '❌ **Error**: Failed to create Discord event. Please try again or contact an administrator.',
          embeds: [],
          components: [],
        });
      }
    } catch (error) {
      console.error('Duration selection error:', error);
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
