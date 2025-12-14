const {
  SlashCommandBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'shardcalculator',
  data: new SlashCommandBuilder()
    .setName('shardcalculator')
    .setDescription('Calculate character shards needed to upgrade hero'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🧮 Character Shard Calculator')
      .setDescription(
        "Select your character's current and target status, then click Calculate.\n\n" +
          '**Character Status:**\n' +
          '- Not unlocked: Character needs to be unlocked first\n' +
          '- 1-6 Stars: Character star level after unlock\n' +
          '- Grades 1-5: Upgrade pieces within each star\n\n' +
          'Each character requires 10 shards to unlock, then has 6 stars with 5 grades each. ' +
          "Select your character's current status and choose what you want to reach."
      )
      .setColor(0x3498db);

    const starOptions = [
      { label: 'Character not unlocked', value: '0', emoji: '🔒' },
      { label: '1 Star', value: '1', emoji: '⭐' },
      { label: '2 Stars', value: '2', emoji: '⭐' },
      { label: '3 Stars', value: '3', emoji: '⭐' },
      { label: '4 Stars', value: '4', emoji: '⭐' },
      { label: '5 Stars', value: '5', emoji: '⭐' },
      { label: '6 Stars', value: '6', emoji: '⭐' },
    ];

    const gradeOptions = [
      { label: 'Not applicable', value: '0', emoji: '🚫' },
      { label: 'Grade 1', value: '1', emoji: '🔹' },
      { label: 'Grade 2', value: '2', emoji: '🔹' },
      { label: 'Grade 3', value: '3', emoji: '🔹' },
      { label: 'Grade 4', value: '4', emoji: '🔹' },
      { label: 'Grade 5', value: '5', emoji: '🔹' },
    ];

    const components = [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('current_stars')
          .setPlaceholder('Select current stars')
          .addOptions(starOptions)
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('current_grade')
          .setPlaceholder('Select current grade')
          .addOptions(gradeOptions)
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('target_stars')
          .setPlaceholder('Select target stars')
          .addOptions(starOptions)
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('target_grade')
          .setPlaceholder('Select target grade')
          .addOptions(gradeOptions)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('calculate_shards')
          .setLabel('Calculate Shards Required')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🧮')
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
    if (interaction.customId === 'calculate_shards') {
      const userId = interaction.user.id;
      const userSelection = this.userSelections.get(userId);

      if (
        !userSelection ||
        !userSelection.current_stars ||
        !userSelection.current_grade ||
        !userSelection.target_stars ||
        !userSelection.target_grade
      ) {
        return interaction.reply({
          content: '❌ Please select all options before calculating.',
          ephemeral: true,
        });
      }

      // Load character shards data
      const shardsPath = path.join(
        __dirname,
        '..',
        'data',
        'shards',
        'character_shards.json'
      );
      let shardsData;
      let dataRaw;

      try {
        dataRaw = await fs.promises.readFile(shardsPath, 'utf8');
        shardsData = JSON.parse(dataRaw);
      } catch {
        return interaction.reply({
          content: 'Unable to load shard data.',
          ephemeral: true,
        });
      }

      // Parse metadata from the shardsData object - match talent tree format
      const { providedBy, lastUpdated } = shardsData;
      const unixTimestamp = Math.floor(new Date(lastUpdated).getTime() / 1000);

      const currentStars = parseInt(userSelection.current_stars);
      const currentGrade = parseInt(userSelection.current_grade);
      const targetStars = parseInt(userSelection.target_stars);
      const targetGrade = parseInt(userSelection.target_grade);

      const result = this.calculateShards(
        shardsData,
        currentStars,
        currentGrade,
        targetStars,
        targetGrade
      );

      if (result.error) {
        return interaction.reply({ content: result.error, ephemeral: true });
      }

      // Clear user selections after calculation
      this.userSelections.delete(userId);

      // Create response using ComponentType.TextDisplay like talent tree
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x00ff00,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `**📊 Shard Calculation Result**`,
              },
              { type: ComponentType.Separator },
              {
                type: ComponentType.TextDisplay,
                content: `📍 **Current Status**\n${
                  currentStars === 0
                    ? 'Character not unlocked'
                    : `${currentStars} Star - Grade ${currentGrade}`
                }`,
              },
              {
                type: ComponentType.TextDisplay,
                content: `🎯 **Target Status**\n${targetStars} Star - Grade ${targetGrade}`,
              },
              { type: ComponentType.Separator },
              {
                type: ComponentType.TextDisplay,
                content: `💎 **Shards Required**\n**${result.shardsNeeded}** shards`,
              },
              {
                type: ComponentType.TextDisplay,
                content: `📈 **Current Total**\n${result.currentShards} shards`,
              },
              {
                type: ComponentType.TextDisplay,
                content: `📊 **Target Total**\n${result.targetShards} shards`,
              },
              { type: ComponentType.Separator },
              {
                type: ComponentType.TextDisplay,
                content: `Provided by ${providedBy} - Last updated on <t:${unixTimestamp}:D>`,
              },
            ],
          },
        ],
      });
    }
  },

  calculateShards(
    shardsData,
    currentGrade,
    currentStars,
    targetGrade,
    targetStars
  ) {
    // Helper function to get total shards for a specific grade/star combination
    function getTotalShards(grade, stars) {
      // Handle "Character not unlocked" case
      if (grade === 0) return 0;

      let total = shardsData.Unlock; // Add unlock cost

      // Convert numbers to proper format strings
      const gradeMap = {
        1: 'Grade 1',
        2: 'Grade 2',
        3: 'Grade 3',
        4: 'Grade 4',
        5: 'Grade 5',
        6: 'Grade 6',
      };

      const starMap = {
        1: '1/5',
        2: '2/5',
        3: '3/5',
        4: '4/5',
        5: '5/5',
      };

      const gradeStr = gradeMap[grade];
      const starsStr = starMap[stars];

      // Get grades in order
      const gradeOrder = [
        'Grade 1',
        'Grade 2',
        'Grade 3',
        'Grade 4',
        'Grade 5',
        'Grade 6',
      ];
      const currentGradeIndex = gradeOrder.indexOf(gradeStr);

      // Add all previous grades
      for (let i = 0; i < currentGradeIndex; i++) {
        total += shardsData[gradeOrder[i]].total;
      }

      // Add current grade up to the star level
      const starOrder = ['1/5', '2/5', '3/5', '4/5', '5/5'];
      const starIndex = starOrder.indexOf(starsStr);

      for (let i = 0; i <= starIndex; i++) {
        total += shardsData[gradeStr][starOrder[i]];
      }

      return total;
    }

    // Validate that target is higher than current
    if (
      currentGrade > 0 &&
      (targetGrade < currentGrade ||
        (targetGrade === currentGrade && targetStars <= currentStars))
    ) {
      return { error: '❌ Target must be higher than current status.' };
    }

    // Special validation for unlocked characters
    if (currentGrade === 0 && (targetGrade === 0 || targetGrade < 1)) {
      return {
        error: '❌ Please select a valid target for unlocking the character.',
      };
    }

    const currentShards = getTotalShards(currentGrade, currentStars);
    const targetShards = getTotalShards(targetGrade, targetStars);
    const shardsNeeded = targetShards - currentShards;

    return {
      currentShards,
      targetShards,
      shardsNeeded,
    };
  },
};
