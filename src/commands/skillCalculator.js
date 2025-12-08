const {
  SlashCommandBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'skillcalculator',
  data: new SlashCommandBuilder()
    .setName('skillcalculator')
    .setDescription('Calculate skill shards needed to upgrade skills'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎯 Skill Shard Calculator')
      .setDescription(
        'Calculate skill shards needed to upgrade your character skills.\n\n' +
          '**How Character Skills Work:**\n' +
          '• Each character starts with **Level 1** on all skills\n' +
          '• Skills can be upgraded to **Level 5**, then unlock the **Ultimate**\n' +
          "• Upgrade levels 1-18 represent how many times you've upgraded\n\n" +
          '**Upgrade Guide:**\n' +
          '• **Level 1** = Base skill (no upgrades)\n' +
          '• **Levels 2-18** = Number of skill upgrades applied\n' +
          "• Check your character's skill page to see current upgrade count"
      )
      .setColor(0xe74c3c);

    // Create skill level options (1-18, where 1 = no upgrades)
    const skillOptions = [];
    for (let i = 1; i <= 18; i++) {
      let label;
      if (i === 1) {
        label = 'Level 1 (No upgrades)';
      } else {
        label = `Level ${i} (${i - 1} upgrade${i - 1 > 1 ? 's' : ''})`;
      }
      skillOptions.push({
        label: label,
        value: i.toString(),
        emoji: '⚡',
      });
    }

    const components = [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('current_skill_level')
          .setPlaceholder('Select current skill level')
          .addOptions(skillOptions.slice(0, 25)) // Discord limit of 25 options
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('target_skill_level')
          .setPlaceholder('Select target skill level')
          .addOptions(skillOptions.slice(0, 25))
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('calculate_skill_shards')
          .setLabel('Calculate Skill Shards Required')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎯')
      ),
    ];

    return interaction.reply({
      embeds: [embed],
      components: components,
    });
  },

  // Store user selections temporarily
  userSelections: new Map(),

  async handleSelectMenu(interaction) {
    const userId = interaction.user.id;

    // Initialize user selections if not exists
    if (!this.userSelections.has(userId)) {
      this.userSelections.set(userId, {});
    }

    const userSelection = this.userSelections.get(userId);
    userSelection[interaction.customId] = interaction.values[0];

    // Just acknowledge the selection without updating the message
    await interaction.deferUpdate();
  },

  async handleButtonClick(interaction) {
    if (interaction.customId === 'calculate_skill_shards') {
      const userId = interaction.user.id;
      const userSelection = this.userSelections.get(userId);

      if (
        !userSelection ||
        !userSelection.current_skill_level ||
        !userSelection.target_skill_level
      ) {
        return interaction.reply({
          content:
            '❌ Please select both current and target skill levels before calculating.',
          ephemeral: true,
        });
      }

      // Load skill shards data
      const shardsPath = path.join(
        __dirname,
        '..',
        'data',
        'shards',
        'skill_shards.json'
      );
      let shardsData;

      try {
        const shardsRaw = await fs.promises.readFile(shardsPath, 'utf8');
        shardsData = JSON.parse(shardsRaw);
      } catch {
        return interaction.reply({
          content: 'Unable to load skill shard data.',
          ephemeral: true,
        });
      }

      const currentLevel = parseInt(userSelection.current_skill_level);
      const targetLevel = parseInt(userSelection.target_skill_level);

      const result = this.calculateSkillShards(
        shardsData,
        currentLevel,
        targetLevel
      );

      if (result.error) {
        return interaction.reply({ content: result.error, ephemeral: true });
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle('📊 Skill Shard Calculation Result')
        .setColor(0x00ff00)
        .addFields(
          {
            name: '📍 Current Level',
            value:
              currentLevel === 1
                ? 'Level 1 (No upgrades)'
                : `Level ${currentLevel} (${currentLevel - 1} upgrade${
                    currentLevel - 1 > 1 ? 's' : ''
                  })`,
            inline: true,
          },
          {
            name: '🎯 Target Level',
            value: `Level ${targetLevel} (${targetLevel - 1} upgrade${
              targetLevel - 1 > 1 ? 's' : ''
            })`,
            inline: true,
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false,
          },
          {
            name: '⚡ Skill Shards Required',
            value: `**${result.shardsNeeded}** shards`,
            inline: true,
          },
          {
            name: '📈 Current Total Invested',
            value: `${result.currentShards} shards`,
            inline: true,
          },
          {
            name: '📊 Target Total',
            value: `${result.targetShards} shards`,
            inline: true,
          }
        );

      // Add provider and date information if available
      const footerParts = [];
      if (shardsData.providedBy) {
        footerParts.push(`Data provided by ${shardsData.providedBy}`);
      }
      if (shardsData.lastUpdated) {
        const { lastUpdated } = JSON.parse(dataRaw);
        const unixTimestamp = Math.floor(new Date(lastUpdated).getTime() / 1000);
        footerParts.push(`Last updated <t:${unixTimestamp}:D>`);
      }

      if (footerParts.length > 0) {
        resultEmbed.setFooter({ text: footerParts.join(' • ') });
      }

      // Clear user selections after calculation
      this.userSelections.delete(userId);

      return interaction.reply({ embeds: [resultEmbed] });
    }
  },

  calculateSkillShards(shardsData, currentLevel, targetLevel) {
    // Validate that target is higher than current
    if (targetLevel <= currentLevel) {
      return { error: '❌ Target level must be higher than current level.' };
    }

    // Validate level ranges
    if (
      currentLevel < 1 ||
      currentLevel > 18 ||
      targetLevel < 1 ||
      targetLevel > 18
    ) {
      return { error: '❌ Skill levels must be between 1 and 18.' };
    }

    // Helper function to get total shards invested for a specific level
    function getTotalShards(level) {
      if (level === 1) return 0; // Level 1 is base level, no shards needed

      let total = 0;
      const upgradeCosts = shardsData.skill_upgrade_cost;

      // Sum up all costs from level 1 to the target level
      for (let i = 0; i < level - 1; i++) {
        if (upgradeCosts[i]) {
          total += upgradeCosts[i].cost;
        }
      }

      return total;
    }

    const currentShards = getTotalShards(currentLevel);
    const targetShards = getTotalShards(targetLevel);
    const shardsNeeded = targetShards - currentShards;

    return {
      currentShards,
      targetShards,
      shardsNeeded,
    };
  },
};
