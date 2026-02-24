// Discord event creation logic for invasions
const {
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
  GuildScheduledEventRecurrenceRuleFrequency,
} = require('discord.js');

class InvasionEvents {
  static async createEvents(guild, eventDates, durationMinutes, eventName) {
    console.log(
      'DEBUG - InvasionEvents.createEvents called with guild:',
      guild ? guild.id : 'null',
    );

    if (!guild) {
      console.error('DEBUG - Guild is null in createEvents method');
      return {
        createdEvents: [],
        errors: ['Guild not available for event creation'],
      };
    }

    const createdEvents = [];
    const errors = [];
    const totalEventCount = eventDates.length;

    // If only one event, create it normally
    if (totalEventCount === 1) {
      return this.createSingleEvent(
        guild,
        eventDates[0],
        durationMinutes,
        eventName,
      );
    }

    // Try different approaches for multi-event series
    console.log(
      'DEBUG - Attempting to create event series with',
      totalEventCount,
      'events',
    );

    // 1. Try creating event series with individual events that reference each other FIRST
    const seriesResult = await this.tryCreateEventSeries(
      guild,
      eventDates,
      durationMinutes,
      eventName,
    );

    if (seriesResult.success) {
      console.log('DEBUG - Successfully created linked event series');
      return seriesResult;
    }

    // 2. Try Discord native recurring events as backup (only for very consistent patterns)
    const recurringResult = await this.tryCreateRecurringEvent(
      guild,
      eventDates,
      durationMinutes,
      eventName,
    );

    if (recurringResult.success) {
      console.log('DEBUG - Successfully created recurring event series');
      return recurringResult;
    }

    // 3. Fall back to single event with multiple sessions
    console.log('DEBUG - Falling back to multi-session event');
    return this.createMultiSessionEvent(
      guild,
      eventDates,
      durationMinutes,
      eventName,
    );
  }

  // Create a single regular event
  static async createSingleEvent(guild, eventDate, durationMinutes, eventName) {
    const createdEvents = [];
    const errors = [];

    try {
      const endDate = new Date(eventDate.getTime() + durationMinutes * 60000);

      const eventDescription = [
        '🛡️ **Alliance Invasion Event**',
        '',
        `📅 **Date:** ${eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        `⏰ **Time:** ${eventDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        })} UTC`,
        `⏱️ **Duration:** ${durationMinutes} minutes`,
        '',
        '🎯 **Preparation Checklist:**',
        '• Gather your alliance members',
        '• Check troop formations',
        '• Verify attack strategies',
        '• Coordinate with alliance leadership',
        '',
        '⚡ Ready for battle? Mark yourself as "Interested" to join!',
      ].join('\n');

      await guild.scheduledEvents.create({
        name: `⚔️ ${eventName}`,
        description: eventDescription,
        scheduledStartTime: eventDate,
        scheduledEndTime: endDate,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: {
          location: 'Avatar Realms Collide',
        },
      });

      createdEvents.push({ name: `⚔️ ${eventName}`, date: eventDate });
    } catch (error) {
      console.error('Error creating single event:', error);
      errors.push(`Failed to create event: ${error.message}`);
    }

    return { createdEvents, errors };
  }

  // Try to create a recurring event using Discord's native recurrence
  // NOTE: Discord recurring events create 1 parent event that automatically
  // generates individual instances. Each instance appears separately in Discord's UI!
  static async tryCreateRecurringEvent(
    guild,
    eventDates,
    durationMinutes,
    eventName,
  ) {
    try {
      console.log('DEBUG - Attempting native recurring event creation');

      // Check if dates follow a consistent pattern
      const sortedDates = eventDates.sort((a, b) => a.getTime() - b.getTime());
      const dayDifferences = [];

      for (let i = 1; i < sortedDates.length; i++) {
        const diffMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        dayDifferences.push(diffDays);
      }

      // Check if it's a consistent pattern
      const isDaily = dayDifferences.every((diff) => diff === 1);
      const isWeekly = dayDifferences.every((diff) => diff === 7);
      const isBiWeekly = dayDifferences.every((diff) => diff === 14);
      const isConsistent2Day = dayDifferences.every((diff) => diff === 2);

      if (!isDaily && !isWeekly && !isBiWeekly && !isConsistent2Day) {
        console.log('DEBUG - No consistent pattern found for recurring event');
        return { success: false };
      }

      const startDate = sortedDates[0];
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      let recurrenceRule;
      let patternName;

      if (isDaily) {
        recurrenceRule = {
          frequency: GuildScheduledEventRecurrenceRuleFrequency.Daily,
          interval: 1,
          count: eventDates.length,
        };
        patternName = 'Daily';
      } else if (isConsistent2Day) {
        recurrenceRule = {
          frequency: GuildScheduledEventRecurrenceRuleFrequency.Daily,
          interval: 2,
          count: eventDates.length,
        };
        patternName = 'Every 2 Days';
      } else if (isWeekly) {
        recurrenceRule = {
          frequency: GuildScheduledEventRecurrenceRuleFrequency.Weekly,
          interval: 1,
          count: eventDates.length,
        };
        patternName = 'Weekly';
      } else if (isBiWeekly) {
        recurrenceRule = {
          frequency: GuildScheduledEventRecurrenceRuleFrequency.Weekly,
          interval: 2,
          count: eventDates.length,
        };
        patternName = 'Bi-Weekly';
      }

      const eventDescription = [
        '🛡️ **Alliance Invasion Series**',
        '',
        `🔄 **Recurring:** ${patternName} for ${eventDates.length} events`,
        `⏱️ **Duration:** ${durationMinutes} minutes each`,
        '',
        '📅 **Scheduled Times:**',
        ...sortedDates.map(
          (date, i) =>
            `${i + 1}. ${date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })} at ${date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })} UTC`,
        ),
        '',
        '🎯 **Each event will notify individually!**',
        '🎯 **Preparation Checklist:**',
        '• Gather your alliance members',
        '• Check troop formations',
        '• Verify attack strategies',
        '• Coordinate with alliance leadership',
        '',
        '⚡ Mark yourself as "Interested" to get notifications for all sessions!',
      ].join('\n');

      console.log(
        'DEBUG - Creating recurring event with rule:',
        recurrenceRule,
      );

      const createdEvent = await guild.scheduledEvents.create({
        name: `⚔️ ${eventName} Series`,
        description: eventDescription,
        scheduledStartTime: startDate,
        scheduledEndTime: endDate,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: {
          location: 'Avatar Realms Collide',
        },
        recurrenceRule,
      });

      console.log(
        'DEBUG - Recurring event created successfully:',
        createdEvent.id,
      );
      console.log(
        'DEBUG - This single recurring event will automatically generate',
        eventDates.length,
        'individual instances',
      );
      console.log(
        "DEBUG - Each instance will appear as a separate entry in Discord but they're all part of one recurring event",
      );

      return {
        success: true,
        createdEvents: [
          {
            name: `⚔️ ${eventName} Series`,
            date: startDate,
            type: 'RECURRING_PARENT',
            instanceCount: eventDates.length,
          },
        ],
        errors: [],
      };
    } catch (error) {
      console.error('DEBUG - Recurring event creation failed:', error.message);
      console.error('DEBUG - Error code:', error.code);
      return { success: false };
    }
  }

  // Try to create a series of individual events that reference each other
  // NOTE: This creates completely separate Discord events that cross-reference each other
  // This method works with ANY date arrangement - no frequency rules required!
  static async tryCreateEventSeries(
    guild,
    eventDates,
    durationMinutes,
    eventName,
  ) {
    try {
      console.log('DEBUG - Attempting to create linked event series');

      const sortedDates = eventDates.sort((a, b) => a.getTime() - b.getTime());
      const createdEvents = [];
      const errors = [];
      const totalEvents = sortedDates.length;

      // Create events with cross-references
      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        const endDate = new Date(
          currentDate.getTime() + durationMinutes * 60000,
        );
        const eventNumber = i + 1;

        try {
          const eventDescription = [
            `🛡️ **Alliance Invasion ${eventNumber} of ${totalEvents}**`,
            '',
            `📅 **Part of Series:** ${eventName}`,
            `⏱️ **Duration:** ${durationMinutes} minutes`,
            '',
            '🎯 **Series Schedule:**',
            ...sortedDates.map((date, idx) => {
              const isCurrentEvent = idx === i;
              const marker = isCurrentEvent ? '👉' : '  ';
              const status = idx < i ? '✅' : idx === i ? '🔥' : '📅';
              return `${marker} ${status} **Event ${idx + 1}:** ${date.toLocaleDateString(
                'en-US',
                {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                },
              )} at ${date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })} UTC`;
            }),
            '',
            '🔥 **This is your individual notification event!**',
            '',
            '🎯 **Preparation Checklist:**',
            '• Gather your alliance members',
            '• Check troop formations',
            '• Verify attack strategies',
            '• Coordinate with alliance leadership',
            '',
            '⚡ Mark yourself as "Interested" for this specific session!',
          ].join('\n');

          const createdEvent = await guild.scheduledEvents.create({
            name: `⚔️ ${eventName} - Event ${eventNumber}/${totalEvents}`,
            description: eventDescription,
            scheduledStartTime: currentDate,
            scheduledEndTime: endDate,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: GuildScheduledEventEntityType.External,
            entityMetadata: {
              location: 'Avatar Realms Collide',
            },
          });

          createdEvents.push({
            name: createdEvent.name,
            date: currentDate,
            id: createdEvent.id,
          });

          console.log(
            `DEBUG - Created individual event ${eventNumber}/${totalEvents}: ${createdEvent.id}`,
          );
          console.log(
            `DEBUG - This is a separate standalone event, not part of Discord's recurring system`,
          );
        } catch (error) {
          console.error(
            `DEBUG - Failed to create event ${eventNumber}:`,
            error.message,
          );
          errors.push({
            date: currentDate,
            error: error.message,
          });
        }
      }

      // If we created at least one event successfully, consider it a success
      // (Individual event series is more flexible than all-or-nothing)
      if (createdEvents.length > 0) {
        console.log(
          `DEBUG - Event series created successfully: ${createdEvents.length}/${totalEvents} events`,
        );

        return {
          success: true,
          createdEvents,
          errors,
          message:
            errors.length > 0
              ? `Created ${createdEvents.length}/${totalEvents} events successfully. ${errors.length} events failed to create.`
              : `Successfully created ${createdEvents.length} individual events in the series!`,
        };
      } else {
        console.log(
          `DEBUG - Event series creation failed: no events were created`,
        );
        return { success: false };
      }
    } catch (error) {
      console.error('DEBUG - Event series creation failed:', error.message);
      return { success: false };
    }
  }

  // Create single event with multiple sessions listed
  static async createMultiSessionEvent(
    guild,
    eventDates,
    durationMinutes,
    eventName,
  ) {
    const createdEvents = [];
    const errors = [];

    try {
      const sortedDates = eventDates.sort((a, b) => a.getTime() - b.getTime());
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      const seriesEndDate = new Date(
        lastDate.getTime() + durationMinutes * 60000,
      );

      const eventDescription = [
        '🛡️ **Alliance Invasion Event Series**',
        '',
        `📅 **${eventDates.length} Sessions Scheduled:**`,
        ...sortedDates.map(
          (date, i) =>
            `${i + 1}. **${date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}** at ${date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })} UTC`,
        ),
        '',
        `⏱️ **Duration:** ${durationMinutes} minutes per session`,
        '',
        '🎯 **Preparation Checklist:**',
        '• Gather your alliance members',
        '• Check troop formations',
        '• Verify attack strategies',
        '• Coordinate with alliance leadership',
        '',
        '⚡ Ready for battle? Mark yourself as "Interested" to join!',
        '',
        'ℹ️ This event spans multiple sessions. Check the times above!',
      ].join('\n');

      await guild.scheduledEvents.create({
        name: `⚔️ ${eventName} (${eventDates.length} Sessions)`,
        description: eventDescription,
        scheduledStartTime: firstDate,
        scheduledEndTime: seriesEndDate,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: {
          location: 'Avatar Realms Collide',
        },
      });

      createdEvents.push({
        name: `⚔️ ${eventName} (${eventDates.length} Sessions)`,
        date: firstDate,
      });
    } catch (error) {
      console.error('Multi-session event creation failed:', error);
      errors.push(`Failed to create multi-session event: ${error.message}`);
    }

    return { createdEvents, errors };
  }

  // Legacy method for individual events (kept as fallback)
  static async createIndividualEvents(
    guild,
    eventDates,
    durationMinutes,
    eventName,
  ) {
    const createdEvents = [];
    const errors = [];
    const totalEventCount = eventDates.length;

    // Limit to 8 events to avoid Discord limits and timeouts
    const eventsToCreate = eventDates.slice(0, 8);

    for (let i = 0; i < eventsToCreate.length; i++) {
      try {
        const eventDate = eventsToCreate[i];
        const endDate = new Date(eventDate.getTime() + durationMinutes * 60000);

        // Create event title with numbering if multiple events
        const eventTitle =
          totalEventCount > 1 ? `⚔️ ${eventName} #${i + 1}` : `⚔️ ${eventName}`;

        // Create comprehensive event description
        const eventDescription = [
          '🛡️ **Alliance Invasion Event**',
          '',
          `📅 **Date:** ${eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          `⏰ **Time:** ${eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          })} UTC`,
          `⏱️ **Duration:** ${durationMinutes} minutes`,
          totalEventCount > 1
            ? `🔄 **Series:** Event ${i + 1} of ${totalEventCount}`
            : '',
          '',
          '🎯 **Preparation Checklist:**',
          '• Gather your alliance members',
          '• Check troop formations',
          '• Verify attack strategies',
          '• Coordinate with alliance leadership',
          '',
          '⚡ Ready for battle? Mark yourself as "Interested" to join!',
        ]
          .filter(Boolean)
          .join('\n');

        await guild.scheduledEvents.create({
          name: eventTitle,
          description: eventDescription,
          scheduledStartTime: eventDate,
          scheduledEndTime: endDate,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.External,
          entityMetadata: {
            location: 'Avatar Realms Collide',
          },
        });

        createdEvents.push({
          name: eventTitle,
          date: eventDate,
        });

        // Add delay between event creation to avoid rate limits
        if (i < eventsToCreate.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error creating event ${i + 1}:`, error);

        // Handle specific Discord API errors
        if (error.code === 50013) {
          errors.push(`Permission denied: Need "Manage Events" permission`);
        } else if (error.code === 30031) {
          errors.push(`Server limit: Too many scheduled events`);
        } else if (error.code === 429) {
          errors.push(`Rate limited: Please try again in a few minutes`);
          // Add longer delay for rate limit recovery
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          errors.push(`Failed to create event ${i + 1}: ${error.message}`);
        }

        // Stop creating more events if we hit a critical error
        if (error.code === 50013 || error.code === 30031) {
          break;
        }
      }
    }

    return { createdEvents, errors };
  }
}

module.exports = { InvasionEvents };
