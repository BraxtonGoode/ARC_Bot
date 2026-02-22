// Interaction handlers for invasion scheduling
const {
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { createErrorReply } = require('./helpers');
const { InvasionUtils } = require('./invasionUtils');
const { InvasionEvents } = require('./invasionEvents');

class InvasionHandlers {
  // Handle date selection
  static async handleDateSelection(interaction) {
    try {
      const selectedDate = interaction.values[0];
      return this.showTimeModal(interaction, selectedDate);
    } catch (error) {
      console.error('Date selection error:', error);
      return createErrorReply(interaction, 'Error processing date selection.');
    }
  }

  // Show time input modal
  static async showTimeModal(interaction, selectedDate) {
    try {
      // Get current UTC time for display
      const now = new Date();
      const currentUTCTime = now.toISOString().substring(11, 16); // HH:MM format

      // Create a modal for time input
      const modal = new ModalBuilder()
        .setCustomId(`invasion_time_modal:${selectedDate}`)
        .setTitle('Set Invasion Time');

      const timeInput = new TextInputBuilder()
        .setCustomId('invasion_time')
        .setLabel(`Invasion Time (Current UTC: ${currentUTCTime})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('HH:MM (e.g., 14:25, 23:00)')
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(5);

      const timeRow = new ActionRowBuilder().addComponents(timeInput);
      modal.addComponents(timeRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Time modal display error:', error);
      return createErrorReply(interaction, 'Error showing time input modal.');
    }
  }

  // Handle time modal submission
  static async handleTimeModal(interaction) {
    try {
      const [, selectedDate] = interaction.customId.split(':');
      const timeInput = interaction.fields.getTextInputValue('invasion_time');

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      const timeMatch = timeInput.match(timeRegex);

      if (!timeMatch) {
        return interaction.reply({
          content:
            '❌ Invalid time format. Please use HH:MM format (e.g., 14:25, 09:00)\n\n**Please run `/invasion` again to restart the process.**',
          ephemeral: true,
        });
      }

      const selectedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      console.log('DEBUG - Time parsing:');
      console.log('  timeInput:', timeInput);
      console.log('  timeMatch[1] (hours):', timeMatch[1]);
      console.log('  timeMatch[2] (minutes):', timeMatch[2]);
      console.log('  selectedTime:', selectedTime);

      // Check if selected time is in the past for today's date
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (selectedDate === today) {
        const selectedDateTime = new Date(
          `${selectedDate}T${selectedTime}:00Z`,
        );
        const currentTime = new Date();

        // Add 5-minute buffer to account for processing time
        const bufferTime = new Date(currentTime.getTime() + 5 * 60 * 1000);

        if (selectedDateTime <= bufferTime) {
          const currentUTC = currentTime.toISOString().substring(11, 16);
          return interaction.reply({
            content: `❌ Selected time (${selectedTime}) is in the past or too close to current UTC time (${currentUTC}).\nPlease select a time at least 5 minutes in the future.\n\n**Please run \`/invasion\` again to restart the process.**`,
            ephemeral: true,
          });
        }
      }

      // Continue to duration selection
      await this.showDurationSelection(interaction, selectedDate, selectedTime);
    } catch (error) {
      console.error('Time modal error:', error);
      return createErrorReply(interaction, 'Error processing time input.');
    }
  }

  // Show duration selection
  static async showDurationSelection(
    interaction,
    selectedDate,
    selectedTime,
    isUpdate = false,
  ) {
    try {
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
          description: 'Epic siege',
        },
      ];

      const durationMenu = new StringSelectMenuBuilder()
        .setCustomId(`invasion_duration_select:${selectedDate}:${selectedTime}`)
        .setPlaceholder('⏱️ Select event duration')
        .addOptions(durationOptions);

      console.log(
        'DEBUG - showDurationSelection customId created:',
        `invasion_duration_select:${selectedDate}:${selectedTime}`,
      );

      const backButton = new ButtonBuilder()
        .setCustomId(`invasion_back_to_time:${selectedDate}`)
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
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = selectedDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const embed = InvasionUtils.createStepEmbed(
        3,
        5,
        'Select Duration',
        `📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC`,
      );

      if (isUpdate) {
        await interaction.update({
          embeds: [embed],
          components: [durationRow, buttonRow],
        });
      } else {
        await interaction.reply({
          embeds: [embed],
          components: [durationRow, buttonRow],
        });
      }
    } catch (error) {
      console.error('Duration selection error:', error);
      return createErrorReply(interaction, 'Error showing duration selection.');
    }
  }

  // Handle duration selection
  static async handleDurationSelection(interaction) {
    try {
      const customIdParts = interaction.customId.split(':');
      console.log('DEBUG - Duration selection customId parts:', customIdParts);

      const selectedDate = customIdParts[1];
      // Reconstruct the time from parts [2] and [3] (hour:minute)
      const selectedTime = `${customIdParts[2]}:${customIdParts[3]}`;
      // Get the selected duration from user's dropdown choice
      const durationMinutes = parseInt(interaction.values[0]);

      console.log('DEBUG - Duration selection parsed values:');
      console.log('  selectedDate:', selectedDate);
      console.log('  selectedTime:', selectedTime);
      console.log('  durationMinutes:', durationMinutes);

      const repetitionOptions = [
        {
          label: '📅 Once',
          value: 'once',
          description: 'Single invasion event',
        },
        {
          label: '🔄 Every 2 days (3 events)',
          value: 'days:2:3',
          description: 'Every other day, 3 total events',
        },
        {
          label: '🔄 Daily for 7 days',
          value: 'daily:7',
          description: 'Repeat every day for 1 week',
        },
        {
          label: '🔄 Weekly (3 events)',
          value: 'days:7:3',
          description: 'Same time each week, 3 total events',
        },
        {
          label: '🔄 Bi-weekly (4 events)',
          value: 'days:14:4',
          description: 'Every 2 weeks, 4 total events',
        },
        {
          label: '🔄 Monthly (2 events)',
          value: 'days:30:2',
          description: 'Same time each month, 2 total events',
        },
      ];

      const repetitionMenu = new StringSelectMenuBuilder()
        .setCustomId(
          `invasion_repetition_select:${selectedDate}:${selectedTime}:${durationMinutes}`,
        )
        .setPlaceholder('🔄 Select repetition pattern')
        .addOptions(repetitionOptions);

      const backButton = new ButtonBuilder()
        .setCustomId(
          `invasion_back_to_duration:${selectedDate}:${selectedTime}`,
        )
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const repetitionRow = new ActionRowBuilder().addComponents(
        repetitionMenu,
      );
      const buttonRow = new ActionRowBuilder().addComponents(
        backButton,
        cancelButton,
      );

      const selectedDateObj = new Date(
        selectedDate + 'T' + selectedTime + ':00Z',
      );
      const formattedDate = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = selectedDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const durationText =
        durationMinutes >= 60
          ? `${Math.floor(durationMinutes / 60)} hour${Math.floor(durationMinutes / 60) !== 1 ? 's' : ''}`
          : `${durationMinutes} minutes`;

      const embed = InvasionUtils.createStepEmbed(
        5,
        6,
        'Select Repetition',
        `📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC\n⏱️ **Duration:** ${durationText}`,
      );

      await interaction.update({
        embeds: [embed],
        components: [repetitionRow, buttonRow],
      });
    } catch (error) {
      console.error('Duration selection error:', error);
      return createErrorReply(
        interaction,
        'Error processing duration selection.',
      );
    }
  }

  // Handle repetition selection
  static async handleRepetitionSelection(interaction) {
    try {
      const customIdParts = interaction.customId.split(':');

      const selectedDate = customIdParts[1];
      // Reconstruct time from parts [2] and [3] (hour:minute)
      const selectedTime = `${customIdParts[2]}:${customIdParts[3]}`;
      const durationMinutes = customIdParts[4];
      const repetitionValue = interaction.values[0];

      console.log('DEBUG - Repetition selection parsed values:');
      console.log('  selectedDate:', selectedDate);
      console.log('  selectedTime:', selectedTime);
      console.log('  durationMinutes:', durationMinutes);
      console.log('  repetitionValue:', repetitionValue);

      const descriptionOptions = [
        {
          label: '⚔️ Alliance Invasion',
          value: 'Alliance Invasion',
          description: 'Standard alliance invasion event',
        },
        {
          label: '🏯 Temple War',
          value: 'Temple War',
          description: 'Temple War event',
        },
        {
          label: " Murong's Grand Melee (MGM)",
          value: "Murong's Grand Melee",
          description: "Murong's Grand Melee event",
        },

        {
          label: '✨ Custom Name',
          value: 'custom',
          description: 'Enter your own event name',
        },
      ];

      const descriptionMenu = new StringSelectMenuBuilder()
        .setCustomId(
          `invasion_description_select:${selectedDate}:${selectedTime}:${durationMinutes}:${repetitionValue}`,
        )
        .setPlaceholder('🏷️ Choose event name/type')
        .addOptions(descriptionOptions);

      const backButton = new ButtonBuilder()
        .setCustomId(
          `invasion_back_to_repetition:${selectedDate}:${selectedTime}:${durationMinutes}`,
        )
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const descriptionRow = new ActionRowBuilder().addComponents(
        descriptionMenu,
      );
      const buttonRow = new ActionRowBuilder().addComponents(
        backButton,
        cancelButton,
      );

      // Format display information
      const selectedDateObj = new Date(
        selectedDate + 'T' + selectedTime + ':00Z',
      );
      const formattedDate = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = selectedDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const durationText =
        durationMinutes >= 60
          ? `${Math.floor(durationMinutes / 60)} hour${Math.floor(durationMinutes / 60) !== 1 ? 's' : ''}`
          : `${durationMinutes} minutes`;

      let repetitionText = 'Once';
      if (repetitionValue.startsWith('daily:')) {
        const days = parseInt(repetitionValue.split(':')[1]);
        repetitionText = `Daily for ${days} days`;
      } else if (repetitionValue.startsWith('days:')) {
        const [, dayInterval, count] = repetitionValue.split(':');
        repetitionText = `Every ${dayInterval} days (${count} events)`;
      }

      const embed = InvasionUtils.createStepEmbed(
        6,
        6,
        'Choose Event Name',
        `📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC\n⏱️ **Duration:** ${durationText}\n🔄 **Pattern:** ${repetitionText}`,
      );

      await interaction.update({
        embeds: [embed],
        components: [descriptionRow, buttonRow],
      });
    } catch (error) {
      console.error('Repetition selection error:', error);
      return createErrorReply(
        interaction,
        'Error processing repetition selection.',
      );
    }
  }

  // Handle description selection and create Discord events
  static async handleDescriptionSelection(interaction) {
    try {
      const parts = interaction.customId.split(':');
      const selectedDate = parts[1];
      // Reconstruct time from parts [2] and [3] (hour:minute)
      const selectedTime = `${parts[2]}:${parts[3]}`;
      const durationMinutes = parts[4];
      // Rejoin the remaining parts to get full repetition value (handles internal colons)
      const repetitionValue = parts.slice(5).join(':');

      console.log('DEBUG - Description selection parsed values:');
      console.log('  selectedDate:', selectedDate);
      console.log('  selectedTime:', selectedTime);
      console.log('  durationMinutes:', durationMinutes);
      console.log('  repetitionValue:', repetitionValue);

      let eventName = interaction.values[0];

      // If custom selected, show modal for custom name
      if (eventName === 'custom') {
        const modal = new ModalBuilder()
          .setCustomId(
            `invasion_custom_name:${selectedDate}:${selectedTime}:${durationMinutes}:${repetitionValue}`,
          )
          .setTitle('Custom Event Name');

        const nameInput = new TextInputBuilder()
          .setCustomId('event_name')
          .setLabel('Event Name')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter your custom event name...')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(100);

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(firstActionRow);

        return await interaction.showModal(modal);
      }

      await this.createInvasionEvents(
        interaction,
        selectedDate,
        selectedTime,
        durationMinutes,
        repetitionValue,
        eventName,
      );
    } catch (error) {
      console.error('Description selection error:', error);
      return createErrorReply(
        interaction,
        'Error processing description selection.',
      );
    }
  }

  // Handle custom name modal
  static async handleCustomNameModal(interaction) {
    try {
      const parts = interaction.customId.split(':');
      const selectedDate = parts[1];
      // Reconstruct time from parts [2] and [3] (hour:minute)
      const selectedTime = `${parts[2]}:${parts[3]}`;
      const durationMinutes = parts[4];
      // Rejoin the remaining parts to get full repetition value (handles internal colons)
      const repetitionValue = parts.slice(5).join(':');

      console.log('DEBUG - Custom name modal parsed values:');
      console.log('  selectedDate:', selectedDate);
      console.log('  selectedTime:', selectedTime);
      console.log('  durationMinutes:', durationMinutes);
      console.log('  repetitionValue:', repetitionValue);

      const eventName = interaction.fields.getTextInputValue('event_name');

      await this.createInvasionEvents(
        interaction,
        selectedDate,
        selectedTime,
        durationMinutes,
        repetitionValue,
        eventName,
      );
    } catch (error) {
      console.error('Custom name modal error:', error);
      return createErrorReply(interaction, 'Error processing custom name.');
    }
  }

  // Create the actual Discord events
  static async createInvasionEvents(
    interaction,
    selectedDate,
    selectedTime,
    durationMinutes,
    repetitionValue,
    eventName,
  ) {
    console.log('DEBUG - createInvasionEvents called with:');
    console.log('  selectedDate:', selectedDate);
    console.log('  selectedTime:', selectedTime);
    console.log('  durationMinutes:', durationMinutes);
    console.log('  repetitionValue:', repetitionValue);
    console.log('  eventName:', eventName);

    try {
      // Parse repetition pattern
      const startDate = new Date(selectedDate + 'T' + selectedTime + ':00Z');
      console.log('DEBUG - Start date created:', startDate);
      console.log(
        'DEBUG - selectedDate:',
        selectedDate,
        'selectedTime:',
        selectedTime,
      );

      const eventDates = InvasionUtils.parseRepetitionPattern(
        repetitionValue,
        startDate,
      );
      console.log('DEBUG - Event dates generated:', eventDates);

      // Validate that all dates are in the future (UTC comparison)
      const futureDates = InvasionUtils.validateDates(eventDates);
      console.log('DEBUG - Current UTC time:', new Date());
      console.log('DEBUG - Future dates filtered:', futureDates);

      if (futureDates.length === 0) {
        return interaction.update({
          content:
            '❌ All selected dates are in the past. Please start over and select a future time.',
          embeds: [],
          components: [],
        });
      }

      // Defer the interaction to prevent timeout
      if (interaction.deferred || interaction.replied) {
        // Already handled
      } else {
        await interaction.deferUpdate();
      }

      // Create Discord Scheduled Events
      const { createdEvents, errors } = await InvasionEvents.createEvents(
        interaction.guild,
        futureDates,
        parseInt(durationMinutes),
        eventName,
      );

      // Prepare response
      let responseContent = '';
      let embed;

      if (createdEvents.length > 0) {
        embed = InvasionUtils.createSuccessEmbed(
          createdEvents.length,
          eventName,
        );

        if (errors.length > 0) {
          responseContent = `⚠️ **Partial Success:** ${createdEvents.length}/${futureDates.length} events created\n\n**Errors:**\n${errors.map((e) => `• ${e}`).join('\n')}`;
        }
      } else {
        responseContent = `❌ **Failed to create events**\n\n**Errors:**\n${errors.map((e) => `• ${e}`).join('\n')}`;
      }

      await interaction.editReply({
        content: responseContent || undefined,
        embeds: embed ? [embed] : [],
        components: [],
      });
    } catch (error) {
      console.error('Create invasion events error:', error);
      return createErrorReply(interaction, 'Error creating invasion events.');
    }
  }

  // Navigation handlers
  static async handleBackToDate(interaction) {
    try {
      // Show the date selection menu again
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
        2,
        5,
        'Select Date',
        'Choose when you want this invasion event to occur.',
      );

      await interaction.update({
        embeds: [embed],
        components: [dateRow, buttonRow],
      });
    } catch (error) {
      console.error('Back to date error:', error);
      return createErrorReply(
        interaction,
        'Error navigating back to date selection.',
      );
    }
  }

  static async handleBackToTime(interaction) {
    try {
      const customId = interaction.customId;
      const parts = customId.split(':');

      if (parts.length < 2) {
        return createErrorReply(interaction, 'Invalid navigation data.');
      }

      const selectedDate = parts[1];

      // Get current UTC time for display
      const now = new Date();
      const currentUTCTime = now.toISOString().substring(11, 16);

      const embed = InvasionUtils.createStepEmbed(
        3,
        5,
        'Time Selection',
        `📅 **Selected Date:** ${new Date(selectedDate).toLocaleDateString(
          'en-US',
          {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          },
        )}\n\n🕐 **Current UTC Time:** ${currentUTCTime}\n\n**To change the time, please run \`/invasion\` again and select the date to get the time input modal.**`,
      );

      const backButton = new ButtonBuilder()
        .setCustomId('invasion_back_to_date')
        .setLabel('← Back to Date')
        .setStyle(ButtonStyle.Secondary);

      const restartButton = new ButtonBuilder()
        .setCustomId('invasion_restart')
        .setLabel('🔄 Restart')
        .setStyle(ButtonStyle.Primary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const buttonRow = new ActionRowBuilder().addComponents(
        backButton,
        restartButton,
        cancelButton,
      );

      await interaction.update({
        embeds: [embed],
        components: [buttonRow],
      });
    } catch (error) {
      console.error('Back to time error:', error);
      return createErrorReply(
        interaction,
        'Error navigating back to time selection.',
      );
    }
  }

  static async handleCancel(interaction) {
    await interaction.update({
      content: '❌ Invasion scheduling cancelled.',
      embeds: [],
      components: [],
    });
  }

  static async handleRestart(interaction) {
    // Show the initial date selection menu
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
      2,
      5,
      'Select Date',
      'Choose when you want this invasion event to occur.',
    );

    await interaction.update({
      embeds: [embed],
      components: [dateRow, buttonRow],
    });
  }

  static async handleBackToDuration(interaction) {
    try {
      const customId = interaction.customId;
      const parts = customId.split(':');

      if (parts.length < 4) {
        return createErrorReply(interaction, 'Invalid navigation data.');
      }

      const selectedDate = parts[1];
      // Reconstruct time from parts [2] and [3] (hour:minute)
      const selectedTime = `${parts[2]}:${parts[3]}`;

      // Show duration selection again
      return this.showDurationSelection(
        interaction,
        selectedDate,
        selectedTime,
        true,
      );
    } catch (error) {
      console.error('Back to duration error:', error);
      return createErrorReply(
        interaction,
        'Error navigating back to duration selection.',
      );
    }
  }

  static async handleBackToRepetition(interaction) {
    try {
      const customId = interaction.customId;
      const parts = customId.split(':');

      if (parts.length < 5) {
        return createErrorReply(interaction, 'Invalid navigation data.');
      }

      const selectedDate = parts[1];
      // Reconstruct time from parts [2] and [3] (hour:minute)
      const selectedTime = `${parts[2]}:${parts[3]}`;
      const durationMinutes = parseInt(parts[4]);

      // Show repetition selection again
      return this.showRepetitionSelection(
        interaction,
        selectedDate,
        selectedTime,
        durationMinutes,
      );
    } catch (error) {
      console.error('Back to repetition error:', error);
      return createErrorReply(
        interaction,
        'Error navigating back to repetition selection.',
      );
    }
  }

  // Show repetition selection menu
  static async showRepetitionSelection(
    interaction,
    selectedDate,
    selectedTime,
    durationMinutes,
  ) {
    try {
      const repetitionOptions = [
        {
          label: '📅 Once',
          value: 'once',
          description: 'Single invasion event',
        },
        {
          label: '🔄 Every 2 days (3 events)',
          value: 'days:2:3',
          description: 'Every other day, 3 total events',
        },
        {
          label: '🔄 Daily for 7 days',
          value: 'daily:7',
          description: 'Repeat every day for 1 week',
        },
        {
          label: '🔄 Weekly (3 events)',
          value: 'days:7:3',
          description: 'Same time each week, 3 total events',
        },
        {
          label: '🔄 Bi-weekly (4 events)',
          value: 'days:14:4',
          description: 'Every 2 weeks, 4 total events',
        },
        {
          label: '🔄 Monthly (2 events)',
          value: 'days:30:2',
          description: 'Same time each month, 2 total events',
        },
      ];

      const repetitionMenu = new StringSelectMenuBuilder()
        .setCustomId(
          `invasion_repetition_select:${selectedDate}:${selectedTime}:${durationMinutes}`,
        )
        .setPlaceholder('🔄 Select repetition pattern')
        .addOptions(repetitionOptions);

      const backButton = new ButtonBuilder()
        .setCustomId(
          `invasion_back_to_duration:${selectedDate}:${selectedTime}`,
        )
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('invasion_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌');

      const repetitionRow = new ActionRowBuilder().addComponents(
        repetitionMenu,
      );
      const buttonRow = new ActionRowBuilder().addComponents(
        backButton,
        cancelButton,
      );

      const selectedDateObj = new Date(
        selectedDate + 'T' + selectedTime + ':00Z',
      );
      const formattedDate = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = selectedDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const durationText =
        durationMinutes >= 60
          ? `${Math.floor(durationMinutes / 60)} hour${Math.floor(durationMinutes / 60) !== 1 ? 's' : ''}`
          : `${durationMinutes} minutes`;

      const embed = InvasionUtils.createStepEmbed(
        4,
        5,
        'Select Repetition',
        `📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC\n⏱️ **Duration:** ${durationText}`,
      );

      await interaction.update({
        embeds: [embed],
        components: [repetitionRow, buttonRow],
      });
    } catch (error) {
      console.error('Repetition selection error:', error);
      return createErrorReply(
        interaction,
        'Error showing repetition selection.',
      );
    }
  }
}

module.exports = { InvasionHandlers };
