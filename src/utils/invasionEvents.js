// Discord event creation logic for invasions
const {
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
} = require('discord.js');

class InvasionEvents {
  static async createEvents(guild, eventDates, durationMinutes, eventName) {
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
