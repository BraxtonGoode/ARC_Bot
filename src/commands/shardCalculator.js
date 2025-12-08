const {
  SlashCommandBuilder,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
  name: 'shardCalculator',
  data: new SlashCommandBuilder()
    .setName('shardcalculator')
    .setDescription('Calculate character shards needed to upgrade'),

  async execute(interaction) {
    // Load character shards data
    const shardsPath = path.join(
      __dirname,
      '..',
      'data',
      'shards',
      'character_shards.json'
    );
    let shardsData;

    try {
      const shardsRaw = await fs.promises.readFile(shardsPath, 'utf8');
      shardsData = JSON.parse(shardsRaw);
    } catch {
      return interaction.reply(createErrorReply('Unable to load shard data.'));
    }

    // Create grade and star options
    const gradeOptions = [
      { label: 'Grade 1', value: 'Grade 1' },
      { label: 'Grade 2', value: 'Grade 2' },
      { label: 'Grade 3', value: 'Grade 3' },
      { label: 'Grade 4', value: 'Grade 4' },
      { label: 'Grade 5', value: 'Grade 5' },
      { label: 'Grade 6', value: 'Grade 6' },
    ];

    const starOptions = [
      { label: '1 Star (1/5)', value: '1/5' },
      { label: '2 Stars (2/5)', value: '2/5' },
      { label: '3 Stars (3/5)', value: '3/5' },
      { label: '4 Stars (4/5)', value: '4/5' },
      { label: '5 Stars (5/5)', value: '5/5' },
    ];

    const componentsArray = [
      {
        type: ComponentType.TextDisplay,
        content: '**🧮 Character Shard Calculator**',
      },
      {
        type: ComponentType.TextDisplay,
        content:
          'Select your current character status and desired upgrade goal to calculate required shards.',
      },
      { type: ComponentType.Separator },

      { type: ComponentType.TextDisplay, content: '**Current Status:**' },
      {
        type: ComponentType.Select,
        custom_id: 'current_grade',
        placeholder: 'Select current grade',
        options: gradeOptions,
      },
      {
        type: ComponentType.Select,
        custom_id: 'current_stars',
        placeholder: 'Select current stars',
        options: starOptions,
      },

      { type: ComponentType.Separator },
      { type: ComponentType.TextDisplay, content: '**Desired Goal:**' },
      {
        type: ComponentType.Select,
        custom_id: 'target_grade',
        placeholder: 'Select target grade',
        options: gradeOptions,
      },
      {
        type: ComponentType.Select,
        custom_id: 'target_stars',
        placeholder: 'Select target stars',
        options: starOptions,
      },

      { type: ComponentType.Separator },
      {
        type: ComponentType.Button,
        custom_id: 'calculate_shards',
        label: 'Calculate Shards Required',
        style: 'Primary',
      },
    ];

    return interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
      components: [
        {
          type: ComponentType.Container,
          accent_color: 0x3498db,
          components: componentsArray,
        },
      ],
    });
  },

  async handleInteraction(interaction, shardsData = null) {
    // Load shards data if not provided
    if (!shardsData) {
      const shardsPath = path.join(
        __dirname,
        '..',
        'data',
        'shards',
        'character_shards.json'
      );
      try {
        const shardsRaw = await fs.promises.readFile(shardsPath, 'utf8');
        shardsData = JSON.parse(shardsRaw);
      } catch {
        return interaction.reply({
          content: 'Unable to load shard data.',
          ephemeral: true,
        });
      }
    }

    if (interaction.customId === 'calculate_shards') {
      // Get the stored selections from the interaction message
      const message = interaction.message;
      const currentGrade = this.getSelectionValue(message, 'current_grade');
      const currentStars = this.getSelectionValue(message, 'current_stars');
      const targetGrade = this.getSelectionValue(message, 'target_grade');
      const targetStars = this.getSelectionValue(message, 'target_stars');

      if (!currentGrade || !currentStars || !targetGrade || !targetStars) {
        return interaction.reply({
          content: '❌ Please select all options before calculating.',
          ephemeral: true,
        });
      }

      const result = this.calculateShards(
        shardsData,
        currentGrade,
        currentStars,
        targetGrade,
        targetStars
      );

      if (result.error) {
        return interaction.reply({ content: result.error, ephemeral: true });
      }

      const resultComponents = [
        {
          type: ComponentType.TextDisplay,
          content: '**📊 Shard Calculation Result**',
        },
        { type: ComponentType.Separator },
        {
          type: ComponentType.TextDisplay,
          content: `**Current:** ${currentGrade} ${currentStars}`,
        },
        {
          type: ComponentType.TextDisplay,
          content: `**Target:** ${targetGrade} ${targetStars}`,
        },
        { type: ComponentType.Separator },
        {
          type: ComponentType.TextDisplay,
          content: `**💎 Shards Required: ${result.shardsNeeded}**`,
        },
        {
          type: ComponentType.TextDisplay,
          content: `Current total shards: ${result.currentShards}`,
        },
        {
          type: ComponentType.TextDisplay,
          content: `Target total shards: ${result.targetShards}`,
        },
      ];

      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.Container,
            accent_color: 0x00ff00,
            components: resultComponents,
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
      let total = 0;

      // Get grades in order
      const gradeOrder = [
        'Grade 1',
        'Grade 2',
        'Grade 3',
        'Grade 4',
        'Grade 5',
        'Grade 6',
      ];
      const currentGradeIndex = gradeOrder.indexOf(grade);

      // Add all previous grades
      for (let i = 0; i < currentGradeIndex; i++) {
        total += shardsData[gradeOrder[i]].total;
      }

      // Add current grade up to the star level
      const starOrder = ['1/5', '2/5', '3/5', '4/5', '5/5'];
      const starIndex = starOrder.indexOf(stars);

      for (let i = 0; i <= starIndex; i++) {
        total += shardsData[grade][starOrder[i]];
      }

      return total;
    }

    // Validate that target is higher than current
    const gradeOrder = [
      'Grade 1',
      'Grade 2',
      'Grade 3',
      'Grade 4',
      'Grade 5',
      'Grade 6',
    ];
    const starOrder = ['1/5', '2/5', '3/5', '4/5', '5/5'];

    const currentGradeIndex = gradeOrder.indexOf(currentGrade);
    const targetGradeIndex = gradeOrder.indexOf(targetGrade);
    const currentStarIndex = starOrder.indexOf(currentStars);
    const targetStarIndex = starOrder.indexOf(targetStars);

    if (
      targetGradeIndex < currentGradeIndex ||
      (targetGradeIndex === currentGradeIndex &&
        targetStarIndex <= currentStarIndex)
    ) {
      return { error: '❌ Target must be higher than current status.' };
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

  getSelectionValue(message, customId) {
    // This is a placeholder - in a real implementation, you'd need to track selections
    // For now, return null to prompt user to select all options
    return null;
  },
};
