const fs = require('fs');
const path = require('path');

const INVASIONS_FILE = path.join(__dirname, '..', 'data', 'invasions.json');

class InvasionManager {
  constructor() {
    this.client = null;
    this.scheduledTimeouts = new Map();
  }

  setClient(client) {
    this.client = client;
    this.restoreScheduledInvasions();
  }

  restoreScheduledInvasions() {
    try {
      if (!fs.existsSync(INVASIONS_FILE)) {
        return;
      }

      const data = fs.readFileSync(INVASIONS_FILE, 'utf8');
      const invasions = JSON.parse(data);
      const now = new Date();

      // Clean up old completed invasions (older than 24 hours)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeInvasions = invasions.filter(invasion => {
        const invasionTime = new Date(invasion.invasionTime);
        return invasionTime > oneDayAgo && !invasion.completed;
      });

      // Save cleaned up invasions
      if (activeInvasions.length !== invasions.length) {
        fs.writeFileSync(INVASIONS_FILE, JSON.stringify(activeInvasions, null, 2));
      }

      // Restore schedules for non-completed invasions
      activeInvasions.forEach(invasion => {
        const invasionTime = new Date(invasion.invasionTime);
        const reminderTime = new Date(invasionTime.getTime() - (invasion.reminderMinutes * 60 * 1000));

        // Schedule reminder if not already reminded and time hasn't passed
        if (!invasion.reminded && reminderTime > now) {
          const timeUntilReminder = reminderTime.getTime() - now.getTime();
          const timeoutId = setTimeout(() => {
            this.sendReminder(invasion);
          }, timeUntilReminder);
          
          this.scheduledTimeouts.set(`reminder_${invasion.id}`, timeoutId);
        }

        // Schedule invasion notification if time hasn't passed
        if (invasionTime > now) {
          const timeUntilInvasion = invasionTime.getTime() - now.getTime();
          const timeoutId = setTimeout(() => {
            this.sendInvasionNotification(invasion);
          }, timeUntilInvasion);
          
          this.scheduledTimeouts.set(`invasion_${invasion.id}`, timeoutId);
        }
      });

      console.log(`Restored ${activeInvasions.length} scheduled invasions`);
    } catch (error) {
      console.error('Error restoring scheduled invasions:', error);
    }
  }

  async sendReminder(invasion) {
    try {
      if (!this.client) return;

      const channel = await this.client.channels.fetch(invasion.channelId);
      if (!channel) return;

      const { EmbedBuilder } = require('discord.js');
      
      const embed = new EmbedBuilder()
        .setTitle('⏰ Invasion Reminder!')
        .setDescription(`${invasion.description} is starting in **${invasion.reminderMinutes} minutes**!`)
        .addFields({
          name: '📅 Invasion Time (UTC)',
          value: `<t:${Math.floor(new Date(invasion.invasionTime).getTime() / 1000)}:F>`,
          inline: false
        })
        .setColor(0xffa500)
        .setTimestamp();

      await channel.send({
        content: '@everyone',
        embeds: [embed]
      });

      // Mark as reminded
      this.markAsReminded(invasion.id);
      
      // Remove from scheduled timeouts
      this.scheduledTimeouts.delete(`reminder_${invasion.id}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  async sendInvasionNotification(invasion) {
    try {
      if (!this.client) return;

      const channel = await this.client.channels.fetch(invasion.channelId);
      if (!channel) return;

      const { EmbedBuilder } = require('discord.js');

      const embed = new EmbedBuilder()
        .setTitle('🚨 INVASION STARTING NOW!')
        .setDescription(`**${invasion.description}** is starting now!`)
        .addFields({
          name: '📅 Time',
          value: `<t:${Math.floor(new Date(invasion.invasionTime).getTime() / 1000)}:F>`,
          inline: false
        })
        .setColor(0xff0000)
        .setTimestamp();

      await channel.send({
        content: '@everyone',
        embeds: [embed]
      });

      // Mark as completed
      this.markAsCompleted(invasion.id);
      
      // Remove from scheduled timeouts
      this.scheduledTimeouts.delete(`invasion_${invasion.id}`);
    } catch (error) {
      console.error('Error sending invasion notification:', error);
    }
  }

  scheduleInvasion(invasion) {
    const now = new Date();
    const invasionTime = new Date(invasion.invasionTime);
    const reminderTime = new Date(invasionTime.getTime() - (invasion.reminderMinutes * 60 * 1000));

    // Schedule reminder
    if (reminderTime > now) {
      const timeUntilReminder = reminderTime.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        this.sendReminder(invasion);
      }, timeUntilReminder);
      
      this.scheduledTimeouts.set(`reminder_${invasion.id}`, timeoutId);
    }

    // Schedule invasion notification
    if (invasionTime > now) {
      const timeUntilInvasion = invasionTime.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        this.sendInvasionNotification(invasion);
      }, timeUntilInvasion);
      
      this.scheduledTimeouts.set(`invasion_${invasion.id}`, timeoutId);
    }
  }

  cancelInvasion(invasionId) {
    // Cancel any scheduled timeouts for this invasion
    const reminderTimeoutId = this.scheduledTimeouts.get(`reminder_${invasionId}`);
    if (reminderTimeoutId) {
      clearTimeout(reminderTimeoutId);
      this.scheduledTimeouts.delete(`reminder_${invasionId}`);
    }

    const invasionTimeoutId = this.scheduledTimeouts.get(`invasion_${invasionId}`);
    if (invasionTimeoutId) {
      clearTimeout(invasionTimeoutId);
      this.scheduledTimeouts.delete(`invasion_${invasionId}`);
    }
  }

  markAsReminded(invasionId) {
    try {
      const data = fs.readFileSync(INVASIONS_FILE, 'utf8');
      let invasions = JSON.parse(data);
      
      const invasion = invasions.find(inv => inv.id === invasionId);
      if (invasion) {
        invasion.reminded = true;
        fs.writeFileSync(INVASIONS_FILE, JSON.stringify(invasions, null, 2));
      }
    } catch (error) {
      console.error('Error marking invasion as reminded:', error);
    }
  }

  markAsCompleted(invasionId) {
    try {
      const data = fs.readFileSync(INVASIONS_FILE, 'utf8');
      let invasions = JSON.parse(data);
      
      const invasion = invasions.find(inv => inv.id === invasionId);
      if (invasion) {
        invasion.completed = true;
        fs.writeFileSync(INVASIONS_FILE, JSON.stringify(invasions, null, 2));
      }
    } catch (error) {
      console.error('Error marking invasion as completed:', error);
    }
  }

  getActiveInvasions(guildId = null) {
    try {
      if (!fs.existsSync(INVASIONS_FILE)) {
        return [];
      }

      const data = fs.readFileSync(INVASIONS_FILE, 'utf8');
      const invasions = JSON.parse(data);
      
      return invasions.filter(invasion => {
        const isActive = !invasion.completed && new Date(invasion.invasionTime) > new Date();
        return guildId ? (isActive && invasion.guildId === guildId) : isActive;
      });
    } catch (error) {
      console.error('Error getting active invasions:', error);
      return [];
    }
  }
}

// Export a singleton instance
module.exports = new InvasionManager();