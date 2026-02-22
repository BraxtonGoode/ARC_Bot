// Discord event creation logic for invasions
const {
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
  GuildScheduledEventRecurrenceRuleFrequency,
} = require('discord.js');

class InvasionEvents {
  static async createEvents(guild, eventDates, durationMinutes, eventName) {
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

    // Try to create as recurring event first
    const recurringResult = await this.tryCreateRecurringEvent(
      guild,
      eventDates,
      durationMinutes,
      eventName,
    );

    if (recurringResult.success) {
      return recurringResult;
    }

    // Fall back to single event with multiple sessions
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
          location: 'Avatar: Generations Game',
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
  static async tryCreateRecurringEvent(
    guild,
    eventDates,
    durationMinutes,
    eventName,
  ) {
    try {
      // Check if dates follow a daily pattern
      const sortedDates = eventDates.sort((a, b) => a.getTime() - b.getTime());
      const dayDifferences = [];

      for (let i = 1; i < sortedDates.length; i++) {
        const diffMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        dayDifferences.push(diffDays);
      }

      // Check if it's a consistent daily pattern
      const isDaily = dayDifferences.every((diff) => diff === 1);
      const isWeekly = dayDifferences.every((diff) => diff === 7);

      if (!isDaily && !isWeekly) {
        return { success: false };
      }

      const startDate = sortedDates[0];
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const recurrenceRule = {
        frequency: isDaily
          ? GuildScheduledEventRecurrenceRuleFrequency.Daily
          : GuildScheduledEventRecurrenceRuleFrequency.Weekly,
        interval: 1,
        count: eventDates.length,
      };

      const eventDescription = [
        '🛡️ **Alliance Invasion Series**',
        '',
        `🔄 **Recurring:** ${isDaily ? 'Daily' : 'Weekly'} for ${eventDates.length} events`,
        `⏱️ **Duration:** ${durationMinutes} minutes each`,
        '',
        '📅 **Event Times:**',
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
        '🎯 **Preparation Checklist:**',
        '• Gather your alliance members',
        '• Check troop formations',
        '• Verify attack strategies',
        '• Coordinate with alliance leadership',
        '',
        '⚡ Ready for battle? Mark yourself as "Interested" to join!',
      ].join('\n');

      await guild.scheduledEvents.create({
        name: `⚔️ ${eventName} Series`,
        description: eventDescription,
        scheduledStartTime: startDate,
        scheduledEndTime: endDate,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: {
          location: 'Avatar: Generations Game',
        },
        recurrenceRule,
      });

      return {
        success: true,
        createdEvents: [{ name: `⚔️ ${eventName} Series`, date: startDate }],
        errors: [],
      };
    } catch (error) {
      console.error('Recurring event creation failed:', error);
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
          location: 'Avatar: Generations Game',
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
            location: 'Avatar: Generations Game',
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
