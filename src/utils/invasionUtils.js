// Utility functions for invasion scheduling
const {
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require('discord.js');

class InvasionUtils {
  static generateDateOptions() {
    const options = [];
    const today = new Date();

    for (let i = 1; i <= 25; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateString = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      options.push({
        label: `📅 ${displayDate}`,
        value: dateString,
        description: `${date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
      });
    }

    return options;
  }

  static generateTimeOptions() {
    const options = [];

    // Generate time options every 30 minutes
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(
          `2000-01-01T${timeValue}:00`,
        ).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        options.push({
          label: `🕐 ${displayTime} UTC`,
          value: timeValue,
          description: `Scheduled for ${timeValue} UTC`,
        });
      }
    }

    return options;
  }

  static createStepEmbed(step, totalSteps, title, description) {
    return new EmbedBuilder()
      .setTitle(`🚨 Schedule Alliance Invasion`)
      .setDescription(
        `**Step ${step}/${totalSteps}: ${title}**\n${description}`,
      )
      .setColor(0x0099ff)
      .setTimestamp();
  }

  static createSuccessEmbed(eventCount, eventName) {
    return new EmbedBuilder()
      .setTitle('✅ Invasion Scheduled Successfully!')
      .setDescription(
        `Created ${eventCount} Discord Event${eventCount > 1 ? 's' : ''}: **${eventName}**`,
      )
      .setColor(0x00ff00)
      .addFields({
        name: '📋 Next Steps',
        value:
          '• Events are now visible in Discord\'s Events tab\n• Members can mark themselves as "Interested"\n• You\'ll get notifications before each event starts',
      })
      .setTimestamp();
  }

  static validateDates(eventDates) {
    const nowUTC = new Date();
    const futureDates = eventDates.filter(
      (date) => date.getTime() > nowUTC.getTime(),
    );
    return futureDates;
  }

  static parseRepetitionPattern(repetitionValue, startDate) {
    let eventDates = [];

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

    return eventDates;
  }
}

module.exports = { InvasionUtils };
