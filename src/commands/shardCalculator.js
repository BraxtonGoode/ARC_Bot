const {
  SlashCommandBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
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
    const embed = new EmbedBuilder()
      .setTitle('🧮 Character Shard Calculator')
      .setDescription(
        'Click the button below to open the shard calculator form.\n\n' +
          '**Grade Format:** 1, 2, 3, 4, 5, or 6\n' +
          '**Star Format:** 1, 2, 3, 4, or 5'
      )
      .setColor(0x3498db);

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_shard_calculator')
        .setLabel('Open Shard Calculator')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🧮')
    );

    return interaction.reply({
      embeds: [embed],
      components: [button],
    });
  },

  async handleModalSubmit(interaction) {
    if (interaction.customId !== 'shard_calculator_modal') return;

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
      return interaction.reply({
        content: 'Unable to load shard data.',
        ephemeral: true,
      });
    }

    // Get form inputs
    const currentGrade = parseInt(
      interaction.fields.getTextInputValue('current_grade')
    );
    const currentStars = parseInt(
      interaction.fields.getTextInputValue('current_stars')
    );
    const targetGrade = parseInt(
      interaction.fields.getTextInputValue('target_grade')
    );
    const targetStars = parseInt(
      interaction.fields.getTextInputValue('target_stars')
    );

    // Validate inputs
    if (
      ![1, 2, 3, 4, 5, 6].includes(currentGrade) ||
      ![1, 2, 3, 4, 5, 6].includes(targetGrade)
    ) {
      return interaction.reply({
        content: '❌ Grade must be between 1 and 6.',
        ephemeral: true,
      });
    }

    if (
      ![1, 2, 3, 4, 5].includes(currentStars) ||
      ![1, 2, 3, 4, 5].includes(targetStars)
    ) {
      return interaction.reply({
        content: '❌ Stars must be between 1 and 5.',
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

    const resultEmbed = new EmbedBuilder()
      .setTitle('📊 Shard Calculation Result')
      .setColor(0x00ff00)
      .addFields(
        {
          name: '📍 Current Status',
          value: `Grade ${currentGrade} - ${currentStars} Star${
            currentStars > 1 ? 's' : ''
          }`,
          inline: true,
        },
        {
          name: '🎯 Target Status',
          value: `Grade ${targetGrade} - ${targetStars} Star${
            targetStars > 1 ? 's' : ''
          }`,
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
      )
      .setFooter({ text: 'Calculation based on character shard requirements' });

    return interaction.reply({ embeds: [resultEmbed] });
  },

  async handleButtonClick(interaction) {
    if (interaction.customId !== 'open_shard_calculator') return;

    const modal = new ModalBuilder()
      .setCustomId('shard_calculator_modal')
      .setTitle('Character Shard Calculator');

    const currentGradeInput = new TextInputBuilder()
      .setCustomId('current_grade')
      .setLabel('Current Grade (1-6)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 3')
      .setRequired(true)
      .setMaxLength(1);

    const currentStarsInput = new TextInputBuilder()
      .setCustomId('current_stars')
      .setLabel('Current Stars (1-5)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 4')
      .setRequired(true)
      .setMaxLength(1);

    const targetGradeInput = new TextInputBuilder()
      .setCustomId('target_grade')
      .setLabel('Target Grade (1-6)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 5')
      .setRequired(true)
      .setMaxLength(1);

    const targetStarsInput = new TextInputBuilder()
      .setCustomId('target_stars')
      .setLabel('Target Stars (1-5)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 2')
      .setRequired(true)
      .setMaxLength(1);

    const rows = [
      new ActionRowBuilder().addComponents(currentGradeInput),
      new ActionRowBuilder().addComponents(currentStarsInput),
      new ActionRowBuilder().addComponents(targetGradeInput),
      new ActionRowBuilder().addComponents(targetStarsInput),
    ];

    modal.addComponents(...rows);
    await interaction.showModal(modal);
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
