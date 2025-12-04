const { SlashCommandBuilder, ComponentType, MessageFlags } = require('discord.js');
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
- /talenttree \`hero\` - Get the talent tree for a hero.\n
**Example:**  
Using  \`/skills Korra\` will show you Korra's skill order.\n
**Good to know:**  
The bot automatically finds the closest matching hero, so you don't need to write the full name.  
For example, typing "Lin" or "Beifong" will get Lin Beifong, "Uncle" or "Iroh" will get Uncle Iroh.
Autocomplete is also available when using commands.`;

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x3498DB,
            components: [
              { type: ComponentType.TextDisplay, content: `**${config.botName} - Version ${config.botVersion}**` },
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: `Get talent trees, skill orders, and gameplay tips for Avatar: Realms Collide.` },
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: helpText },
              { type: ComponentType.Separator },
              { type: ComponentType.TextDisplay, content: `Bot by TheBraxMan` }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('/help error:', error);
      return interaction.reply({
        flags: (1 << 15) | (1 << 6),
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0xE74C3C,
            components: [{ type: ComponentType.TextDisplay, content: 'Error while loading help menu.' }]
          }
        ]
      });
    }
  }
};