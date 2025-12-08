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
  name: 'shardcalculator',
  data: new SlashCommandBuilder()
    .setName('shardcalculator')
    .setDescription('Calculate character shards needed to upgrade hero'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🧮 Character Shard Calculator')
      .setDescription(
        'Select your current and target character status, then click Calculate.\n\n' +
          '**Stars:** 1-6 (character star level)\n' +
          '**Grade:** 1-5 (upgrade level within the star)'
      )
      .setColor(0x3498db);

    const starOptions = [
      { label: '1 Star', value: '1', emoji: '⭐' },
      { label: '2 Stars', value: '2', emoji: '⭐' },
      { label: '3 Stars', value: '3', emoji: '⭐' },
      { label: '4 Stars', value: '4', emoji: '⭐' },
      { label: '5 Stars', value: '5', emoji: '⭐' },
      { label: '6 Stars', value: '6', emoji: '⭐' },
    ];

    const gradeOptions = [
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

      // Parse metadata from the shardsData object
      const { providedBy, lastUpdated } = shardsData;
      const unixTimestamp = lastUpdated
        ? Math.floor(new Date(lastUpdated).getTime() / 1000)
        : null;

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

      const resultEmbed = new EmbedBuilder()
        .setTitle('📊 Shard Calculation Result')
        .setColor(0x00ff00)
        .addFields(
          {
            name: '📍 Current Status',
            value: `${currentStars} Star - Grade ${currentGrade}`,
            inline: true,
          },
          {
            name: '🎯 Target Status',
            value: `${targetStars} Star - Grade ${targetGrade}`,
            inline: true,
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false,
          },
          {
            name: '💎 Shards Required',
            value: `**${result.shardsNeeded}** shards`,
            inline: true,
          },
          {
            name: '📈 Current Total',
            value: `${result.currentShards} shards`,
            inline: true,
          },
          {
            name: '📊 Target Total',
            value: `${result.targetShards} shards`,
            inline: true,
          }
        );

      // Add provider and date information to footer
      let footerText = 'Avatar Legends: Realms Collide';
      if (providedBy && unixTimestamp) {
        footerText = `Provided by ${providedBy} - Last updated on <t:${unixTimestamp}:D>`;
      } else if (providedBy) {
        footerText = `Provided by ${providedBy}`;
      }

      resultEmbed.setFooter({ text: footerText });

      // Clear user selections after calculation
      this.userSelections.delete(userId);

      return interaction.reply({ embeds: [resultEmbed] });
    }
  },

  calculateShards(
    shardsData,
    currentGrade,
    currentStars,
    targetGrade,
    targetStars
  ) {
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

    const currentGradeStr = gradeMap[currentGrade];
    const currentStarsStr = starMap[currentStars];
    const targetGradeStr = gradeMap[targetGrade];
    const targetStarsStr = starMap[targetStars];

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
    if (
      targetGrade < currentGrade ||
      (targetGrade === currentGrade && targetStars <= currentStars)
    ) {
      return { error: '❌ Target must be higher than current status.' };
    }

    const currentShards = getTotalShards(currentGradeStr, currentStarsStr);
    const targetShards = getTotalShards(targetGradeStr, targetStarsStr);
    const shardsNeeded = targetShards - currentShards;

    return {
      currentShards,
      targetShards,
      shardsNeeded,
    };
  },
};
