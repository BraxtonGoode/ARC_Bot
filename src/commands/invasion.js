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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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
          `Step 3/4: Choose event duration\n\n📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC`,
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

  // Handle duration selection and show repetition options
  async handleDurationSelection(interaction) {
    try {
      const [, selectedDate, selectedTime] = interaction.customId.split(':');
      const durationMinutes = parseInt(interaction.values[0]);

      // Generate repetition options
      const repetitionOptions = [
        {
          label: 'One-time event',
          value: 'once',
          description: 'Single invasion event',
        },
        {
          label: 'Daily (every day)',
          value: 'daily:7',
          description: 'Repeats for 7 days',
        },
        {
          label: 'Every 2 days',
          value: 'days:2:5',
          description: 'Repeats every 2 days (5 events)',
        },
        {
          label: 'Every 3 days',
          value: 'days:3:4',
          description: 'Repeats every 3 days (4 events)',
        },
        {
          label: 'Weekly (every 7 days)',
          value: 'days:7:4',
          description: 'Repeats weekly (4 events)',
        },
        {
          label: 'Bi-weekly (every 14 days)',
          value: 'days:14:3',
          description: 'Repeats bi-weekly (3 events)',
        },
      ];

      const repetitionMenu = new StringSelectMenuBuilder()
        .setCustomId(
          `invasion_repetition_select:${selectedDate}:${selectedTime}:${durationMinutes}`,
        )
        .setPlaceholder('🔄 Select repetition pattern')
        .addOptions(repetitionOptions);

      const backButton = new ButtonBuilder()
        .setCustomId('invasion_back_to_duration')
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

      // Format duration display
      let durationText = `${durationMinutes} minutes`;
      if (durationMinutes >= 60) {
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🚨 Schedule Alliance Invasion')
        .setDescription(
          `Step 4/5: Choose repetition pattern\n\n📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC\n⏱️ **Duration:** ${durationText}\n\n*This will create Discord Events that appear in your server's Events tab*`,
        )
        .setColor(0x0099ff)
        .setTimestamp();

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
  },

  // Handle repetition selection and show description options
  async handleRepetitionSelection(interaction) {
    try {
      const [, selectedDate, selectedTime, durationMinutes] =
        interaction.customId.split(':');
      const repetitionValue = interaction.values[0];

      // Generate description/name options
      const descriptionOptions = [
        {
          label: 'Alliance Invasion',
          value: 'Alliance Invasion',
          description: 'Standard alliance warfare event',
        },
        {
          label: 'Custom Event',
          value: 'custom',
          description: 'Enter your own event name',
        },
      ];

      const descriptionMenu = new StringSelectMenuBuilder()
        .setCustomId(
          `invasion_description_select:${selectedDate}:${selectedTime}:${durationMinutes}:${repetitionValue}`,
        )
        .setPlaceholder('📝 Select event type')
        .addOptions(descriptionOptions);

      const backButton = new ButtonBuilder()
        .setCustomId('invasion_back_to_repetition')
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

      // Format duration display
      let durationText = `${durationMinutes} minutes`;
      if (durationMinutes >= 60) {
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }

      // Format repetition display
      let repetitionText = 'One-time event';
      if (repetitionValue.startsWith('daily:')) {
        const days = parseInt(repetitionValue.split(':')[1]);
        repetitionText = `Daily for ${days} days`;
      } else if (repetitionValue.startsWith('days:')) {
        const [, dayInterval, count] = repetitionValue.split(':');
        repetitionText = `Every ${dayInterval} days (${count} events)`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🚨 Schedule Alliance Invasion')
        .setDescription(
          `Step 5/5: Choose event name/type\n\n📅 **Date:** ${formattedDate}\n🕐 **Time:** ${formattedTime} UTC\n⏱️ **Duration:** ${durationText}\n🔄 **Pattern:** ${repetitionText}`,
        )
        .setColor(0x0099ff)
        .setTimestamp();

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
  },

  // Handle description selection and create Discord events
  async handleDescriptionSelection(interaction) {
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
          .setMaxLength(80);

        const nameRow = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(nameRow);

        await interaction.showModal(modal);
        return;
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
  },

  // Handle custom name modal
  async handleCustomNameModal(interaction) {
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
  },

  // Create the actual Discord events
  async createInvasionEvents(
    interaction,
    selectedDate,
    selectedTime,
    durationMinutes,
    repetitionValue,
    eventName,
  ) {
    try {
      // Parse repetition pattern
      let eventDates = [];
      const startDate = new Date(selectedDate + 'T' + selectedTime + ':00Z');

      if (repetitionValue === 'once') {
        eventDates.push(startDate);
      } else if (repetitionValue.startsWith('daily:')) {
        const days = parseInt(repetitionValue.split(':')[1]);
        for (let i = 0; i < days; i++) {
          const eventDate = new Date(startDate);
          eventDate.setDate(startDate.getDate() + i);
          eventDates.push(eventDate);
        }
      } else if (repetitionValue.startsWith('days:')) {
        const [, dayInterval, count] = repetitionValue.split(':');
        const interval = parseInt(dayInterval);
        const eventCount = parseInt(count);

        for (let i = 0; i < eventCount; i++) {
          const eventDate = new Date(startDate);
          eventDate.setDate(startDate.getDate() + i * interval);
          eventDates.push(eventDate);
        }
      }

      // Validate that all dates are in the future
      const now = new Date();
      const futureDates = eventDates.filter((date) => date > now);

      if (futureDates.length === 0) {
        return interaction.update({
          content:
            '❌ All selected dates are in the past. Please start over and select a future time.',
          embeds: [],
          components: [],
        });
      }

      // Create Discord Scheduled Events with rate limiting protection
      const createdEvents = [];
      const errors = [];

      // Limit to 8 events to avoid Discord limits and timeouts
      const eventsToCreate = futureDates.slice(0, 8);

      // Defer the reply to prevent interaction timeout
      if (!interaction.deferred && !interaction.replied) {
        if (interaction.isModalSubmit()) {
          await interaction.deferReply();
        } else {
          await interaction.deferUpdate();
        }
      }

      for (let i = 0; i < eventsToCreate.length; i++) {
        const eventStart = eventsToCreate[i];
        const eventEnd = new Date(
          eventStart.getTime() + parseInt(durationMinutes) * 60 * 1000,
        );

        try {
          const eventTitle =
            eventsToCreate.length > 1
              ? `⚔️ ${eventName} #${i + 1}`
              : `⚔️ ${eventName}`;

          const scheduledEvent = await interaction.guild.scheduledEvents.create(
            {
              name: eventTitle,
              scheduledStartTime: eventStart,
              scheduledEndTime: eventEnd,
              privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
              entityType: GuildScheduledEventEntityType.External,
              entityMetadata: {
                location: 'Alliance Territory - Game World',
              },
              description: `🚨 **${eventName} Event**

📅 **Date:** ${eventStart.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
🕐 **Time:** ${eventStart.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'UTC',
              })} UTC
⏱️ **Duration:** ${
                durationMinutes >= 60
                  ? `${Math.floor(parseInt(durationMinutes) / 60)}h${parseInt(durationMinutes) % 60 > 0 ? ` ${parseInt(durationMinutes) % 60}m` : ''}`
                  : `${durationMinutes}m`
              }

🎯 **What to do:**
• Gather your alliance members
• Prepare your battle strategies
• Coordinate attacks and defenses
• Fight for glory and resources!

👥 **Scheduled by:** <@${interaction.user.id}>
${eventsToCreate.length > 1 ? `🔄 **Series:** Event ${i + 1} of ${eventsToCreate.length}` : ''}

*Click "Interested" to get notified when the event starts!*`,
              reason: `${eventName} scheduled by ${interaction.user.tag}`,
            },
          );

          createdEvents.push(scheduledEvent);

          // Add delay between event creation to respect rate limits
          if (i < eventsToCreate.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
          }
        } catch (eventError) {
          console.error(`Error creating event ${i + 1}:`, eventError);

          // Check for specific Discord errors
          if (eventError.code === 30031) {
            errors.push(
              `Event ${i + 1}: Server has reached maximum scheduled events limit`,
            );
            break; // Stop trying to create more events
          } else if (eventError.code === 50013) {
            errors.push(`Event ${i + 1}: Missing permissions to create events`);
            break;
          } else if (eventError.code === 40060) {
            errors.push(
              `Event ${i + 1}: Interaction has already been acknowledged`,
            );
          } else {
            errors.push(
              `Event ${i + 1}: ${eventError.message || 'Unknown error'}`,
            );
          }

          // If we hit rate limit, add longer delay and continue
          if (eventError.code === 429) {
            console.log('Rate limited, waiting longer...');
            await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay for rate limit
          }
        }
      }

      // Create response embed
      if (createdEvents.length > 0) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Discord Events Created Successfully!')
          .setDescription(
            `🎉 ${createdEvents.length} ${eventName} event${createdEvents.length > 1 ? 's' : ''} created!\n\n**Event Details:**`,
          )
          .setColor(0x00ff00)
          .setTimestamp()
          .setFooter({
            text: 'Users can click "Interested" on events to get notified!',
          });

        if (createdEvents.length === 1) {
          const event = createdEvents[0];
          embed.addFields(
            {
              name: '📅 Start Time (UTC)',
              value: `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`,
              inline: false,
            },
            {
              name: '⏱️ Duration',
              value: `${durationMinutes} minutes`,
              inline: true,
            },
            {
              name: '🔗 Event Link',
              value: `[View Event](https://discord.com/events/${interaction.guildId}/${event.id})`,
              inline: true,
            },
          );
        } else {
          // Show summary for multiple events
          const firstEvent = createdEvents[0];
          const lastEvent = createdEvents[createdEvents.length - 1];

          embed.addFields(
            {
              name: '📅 First Event',
              value: `<t:${Math.floor(firstEvent.scheduledStartTimestamp / 1000)}:F>`,
              inline: true,
            },
            {
              name: '📅 Last Event',
              value: `<t:${Math.floor(lastEvent.scheduledStartTimestamp / 1000)}:F>`,
              inline: true,
            },
            {
              name: '📊 Summary',
              value: `${createdEvents.length} ${eventName} events created\n⏱️ Duration: ${durationMinutes} minutes each`,
              inline: false,
            },
          );
        }

        embed.addFields({
          name: '👤 Scheduled By',
          value: `<@${interaction.user.id}>`,
          inline: true,
        });

        if (errors.length > 0) {
          embed.addFields({
            name: '⚠️ Some Events Failed',
            value:
              errors.slice(0, 3).join('\n') +
              (errors.length > 3 ? `\n... and ${errors.length - 3} more` : ''),
            inline: false,
          });
        }

        // Add warning if we hit the event limit
        if (futureDates.length > eventsToCreate.length) {
          embed.addFields({
            name: '📢 Note',
            value: `Limited to ${eventsToCreate.length} events to prevent Discord rate limits and timeouts. Originally requested ${futureDates.length} events.`,
            inline: false,
          });
        }

        // Use the appropriate response method based on interaction type
        if (interaction.isModalSubmit()) {
          await interaction.followUp({
            embeds: [embed],
            components: [],
          });
        } else {
          await interaction.editReply({
            embeds: [embed],
            components: [],
          });
        }
      } else {
        // All events failed
        const errorMessage =
          errors.length > 0
            ? `Errors: ${errors.slice(0, 3).join(', ')}`
            : 'Unknown error occurred';

        // Use the appropriate response method based on interaction type
        if (interaction.isModalSubmit()) {
          return interaction.followUp({
            content: `❌ **Error**: Failed to create any Discord events. ${errorMessage}`,
            components: [],
          });
        } else {
          return interaction.editReply({
            content: `❌ **Error**: Failed to create any Discord events. ${errorMessage}`,
            embeds: [],
            components: [],
          });
        }
      }
    } catch (error) {
      console.error('Event creation error:', error);
      return createErrorReply(interaction, 'Error creating events.');
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
