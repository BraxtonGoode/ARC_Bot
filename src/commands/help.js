const {
  SlashCommandBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get information and available commands'),

  async execute(interaction) {
    try {
      const helpText = `**Available Commands:**
- /tip \`name\` - Get different gameplay tips.
- /help - This help message.
- /skills \`hero\` - Get the skill order for a hero.
- /tierlist \`type of tierlist\` - Get the current hero tier list.
- /talenttree \`hero\` - Get the talent tree for a hero.
- /shardcalculator - Calculate character shards needed for star/grade upgrades.
- /skillcalculator - Calculate skill shards needed for skill level upgrades.
- /invasion - Schedule an alliance invasion event.
- /invasions - List all scheduled invasion events.\n
**Invasion Events:**
Use \`/invasion\` to create Discord Events for your alliance invasions. These appear in your server's Events tab, send native Discord notifications, and integrate perfectly with Discord's calendar system. Members can mark themselves as "Interested" to get notified! You can also create repeating events (daily, every 2-3 days, weekly, etc.) for regular invasion schedules, and customize event names like "Territory Defense", "Resource Raid", "City Siege", etc.\n
**Calculators:**  
The shard calculator helps you determine how many character shards you need to upgrade from your current star/grade to your target level.
The skill calculator shows how many skill shards are required to upgrade skills from level 1-18.\n
**Example:**  
Using  \`/skills Korra\` will show you Korra's skill order.
Using \`/shardcalculator\` opens an interactive calculator for character upgrades.
Using \`/invasion\` opens an interface to schedule Discord events.\n
**Good to know:**  
The bot automatically finds the closest matching hero, so you don't need to write the full name.  
For example, typing "Lin" or "Beifong" will get Lin Beifong, "Uncle" or "Iroh" will get Uncle Iroh.
Autocomplete is also available when using commands.
Invasion events use Discord's native scheduling and notification system for the best user experience.`;

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x3498db,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `**${config.botName} - Version ${config.botVersion}**`,
              },
              { type: ComponentType.Separator },
              {
                type: ComponentType.TextDisplay,
                content: `Get talent trees, skill orders, and gameplay tips for Avatar: Realms Collide.`,
              },
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: helpText },
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: `Bot by TheBraxMan` },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('/help error:', error);
      return interaction.reply({
        flags: (1 << 15) | (1 << 6),
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0xe74c3c,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: 'Error while loading help menu.',
              },
            ],
          },
        ],
      });
    }
  },
};
