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

      const timeOptions = InvasionUtils.generateTimeOptions();
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

      const embed = InvasionUtils.createStepEmbed(
        2,
        5,
        'Select Time',
        `📅 **Selected Date:** ${formattedDate}`,
      );

      await interaction.update({
        embeds: [embed],
        components: [timeRow, buttonRow],
      });
    } catch (error) {
      console.error('Date selection error:', error);
      return createErrorReply(interaction, 'Error processing date selection.');
    }
  }

  // Handle time selection
  static async handleTimeSelection(interaction) {
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
          description: 'Epic siege',
        },
      ];

      const durationMenu = new StringSelectMenuBuilder()
        .setCustomId(`invasion_duration_select:${selectedDate}:${selectedTime}`)
        .setPlaceholder('⏱️ Select event duration')
        .addOptions(durationOptions);

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

      await interaction.update({
        embeds: [embed],
        components: [durationRow, buttonRow],
      });
    } catch (error) {
      console.error('Time selection error:', error);
      return createErrorReply(interaction, 'Error processing time selection.');
    }
  }

  // Handle duration selection
  static async handleDurationSelection(interaction) {
    try {
      const [, selectedDate, selectedTime] = interaction.customId.split(':');
      const durationMinutes = parseInt(interaction.values[0]);

      const repetitionOptions = [
        {
          label: '📅 Once',
          value: 'once',
          description: 'Single invasion event',
        },
        {
          label: '🔄 Daily for 3 days',
          value: 'daily:3',
          description: 'Repeat every day for 3 days',
        },
        {
          label: '🔄 Daily for 5 days',
          value: 'daily:5',
          description: 'Repeat every day for 5 days',
        },
        {
          label: '🔄 Daily for 7 days',
          value: 'daily:7',
          description: 'Repeat every day for 1 week',
        },
        {
          label: '🔄 Every 2 days (3 events)',
          value: 'days:2:3',
          description: 'Every other day, 3 total events',
        },
        {
          label: '🔄 Every 3 days (3 events)',
          value: 'days:3:3',
          description: 'Every 3rd day, 3 total events',
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
      const [, selectedDate, selectedTime, durationMinutes] =
        interaction.customId.split(':');
      const repetitionValue = interaction.values[0];

      const descriptionOptions = [
        {
          label: '⚔️ Alliance Invasion',
          value: 'Alliance Invasion',
          description: 'Standard alliance invasion event',
        },
        {
          label: '🛡️ Defense Rally',
          value: 'Defense Rally',
          description: 'Defensive preparation event',
        },
        {
          label: '🌊 Territory Conquest',
          value: 'Territory Conquest',
          description: 'Territory expansion event',
        },
        {
          label: '🔥 War Campaign',
          value: 'War Campaign',
          description: 'Major war operation',
        },
        {
          label: '⚡ Raid Party',
          value: 'Raid Party',
          description: 'Quick raid mission',
        },
        {
          label: '🏰 Siege Operations',
          value: 'Siege Operations',
          description: 'Castle siege event',
        },
        {
          label: '🎯 Strategic Strike',
          value: 'Strategic Strike',
          description: 'Coordinated attack mission',
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
        5,
        5,
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
      const [, selectedDate, selectedTime, durationMinutes, repetitionValue] =
        interaction.customId.split(':');
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
      const [, selectedDate, selectedTime, durationMinutes, repetitionValue] =
        interaction.customId.split(':');
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
    // This would need the original execute logic - simplified for now
    return createErrorReply(
      interaction,
      'Navigation not implemented in refactored version.',
    );
  }

  static async handleBackToTime(interaction) {
    return createErrorReply(
      interaction,
      'Navigation not implemented in refactored version.',
    );
  }

  static async handleCancel(interaction) {
    await interaction.update({
      content: '❌ Invasion scheduling cancelled.',
      embeds: [],
      components: [],
    });
  }
}

module.exports = { InvasionHandlers };
