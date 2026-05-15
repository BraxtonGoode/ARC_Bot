// Updated interactionCreate.js to use refactored invasion handlers
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { InvasionHandlers } = require('../utils/invasionHandlers');

const charactersPath = path.join(__dirname, '..', 'data', 'characters.json');
let characterChoices = [];
try {
  const raw = fs.readFileSync(charactersPath, 'utf8');
  characterChoices = JSON.parse(raw);
} catch (error) {
  console.error('Error loading character list in interactionCreate.js:', error);
  characterChoices = [{ name: 'Kyoshi', value: 'kyoshi' }];
}

const tierlistsPath = path.join(__dirname, '..', 'data', 'tierlists.json');
let tierlistChoices = [];
try {
  const raw = fs.readFileSync(tierlistsPath, 'utf8');
  tierlistChoices = JSON.parse(raw);
} catch (error) {
  console.error('Error loading tierlist list in interactionCreate.js:', error);
  tierlistChoices = [{ name: 'Arena Tierlist', value: 'arena_tierlist' }];
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error(
            `Error in autocomplete for /${command.data.name}:`,
            error,
          );
        }
        return;
      }

      if (
        interaction.commandName === 'talenttree' ||
        interaction.commandName === 'skills'
      ) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = characterChoices
          .filter((choice) => choice.name.toLowerCase().includes(focusedValue))
          .slice(0, 25)
          .map((choice) => ({ name: choice.name, value: choice.value }));
        await interaction.respond(filtered);
        return;
      }

      if (interaction.commandName === 'tierlist') {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const categoryData = interaction.options.data.find(option => option.name === 'category');
        const selectedCategory = categoryData ? categoryData.value : null;
        if (!selectedCategory) {
          await interaction.respond([
            { name: 'Please select a category first', value: 'none' },
          ]);
          return;
        }
        const filtered = tierlistChoices
          .filter((choice) =>
            choice.category === categoryOption.value &&
            (choice.name.toLowerCase().includes(focusedValue) ||
            choice.value.toLowerCase().includes(focusedValue))
          )
          .slice(0, 25)
          .map((choice) => ({ name: choice.name, value: choice.value}));
        await interaction.respond(filtered);
        return;
      }

      // const focusedValue = interaction.options.getFocused().toLowerCase();
      // const filtered = tierlistChoices
      //   .filter(
      //     (choice) =>
      //       choice.name.toLowerCase().includes(focusedValue) ||
      //         choice.value.toLowerCase().includes(focusedValue),
      //     )
      //     .slice(0, 25)
      //     .map((choice) => ({ name: choice.name, value: choice.value }));
      //   await interaction.respond(filtered);
      //   return;
      // }

      await interaction.respond([]);
      return;
      
    }

    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'calculate_shards') {
        const command = client.commands.get('shardcalculator');
        if (command && command.handleButtonClick) {
          try {
            await command.handleButtonClick(interaction);
          } catch (error) {
            logger.error('Error handling button click:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
        }
      } else if (interaction.customId === 'calculate_skill_shards') {
        const command = client.commands.get('skillcalculator');
        if (command && command.handleButtonClick) {
          try {
            await command.handleButtonClick(interaction);
          } catch (error) {
            logger.error('Error handling button click:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
        }
      } else if (interaction.customId.startsWith('invasion_')) {
        // Handle invasion-related buttons using refactored handlers
        try {
          if (interaction.customId === 'invasion_cancel') {
            await InvasionHandlers.handleCancel(interaction);
          } else if (interaction.customId === 'invasion_back_to_date') {
            await InvasionHandlers.handleBackToDate(interaction);
          } else if (interaction.customId.startsWith('invasion_back_to_time')) {
            await InvasionHandlers.handleBackToTime(interaction);
          } else if (
            interaction.customId.startsWith('invasion_back_to_duration')
          ) {
            await InvasionHandlers.handleBackToDuration(interaction);
          } else if (
            interaction.customId.startsWith('invasion_back_to_repetition')
          ) {
            await InvasionHandlers.handleBackToRepetition(interaction);
          } else if (interaction.customId === 'invasion_restart') {
            await InvasionHandlers.handleRestart(interaction);
          }
        } catch (error) {
          logger.error('Error handling invasion button:', error);
        }
      }
      return;
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (
        [
          'current_stars',
          'current_grade',
          'target_stars',
          'target_grade',
        ].includes(interaction.customId)
      ) {
        const command = client.commands.get('shardcalculator');
        if (command && command.handleSelectMenu) {
          try {
            await command.handleSelectMenu(interaction);
          } catch (error) {
            logger.error('Error handling select menu:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
        }
      } else if (
        ['current_skill_level', 'target_skill_level'].includes(
          interaction.customId,
        )
      ) {
        const command = client.commands.get('skillcalculator');
        if (command && command.handleSelectMenu) {
          try {
            await command.handleSelectMenu(interaction);
          } catch (error) {
            logger.error('Error handling select menu:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
        }
      } else if (interaction.customId.startsWith('invasion_')) {
        // Handle invasion-related select menus using refactored handlers
        try {
          if (interaction.customId === 'invasion_date_select') {
            await InvasionHandlers.handleDateSelection(interaction);
          } else if (
            interaction.customId.startsWith('invasion_duration_select')
          ) {
            await InvasionHandlers.handleDurationSelection(interaction);
          } else if (
            interaction.customId.startsWith('invasion_repetition_select')
          ) {
            await InvasionHandlers.handleRepetitionSelection(interaction);
          } else if (
            interaction.customId.startsWith('invasion_description_select')
          ) {
            await InvasionHandlers.handleDescriptionSelection(interaction);
          }
        } catch (error) {
          logger.error('Error handling invasion select menu:', error);
        }
      }
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'shard_calculator_modal') {
        const command = client.commands.get('shardcalculator');
        if (command && command.handleModalSubmit) {
          try {
            await command.handleModalSubmit(interaction);
          } catch (error) {
            logger.error('Error handling modal submit:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
        }
      } else if (interaction.customId.startsWith('invasion_custom_name')) {
        // Handle invasion custom name modal using refactored handlers
        try {
          await InvasionHandlers.handleCustomNameModal(interaction);
        } catch (error) {
          logger.error('Error handling invasion custom name modal:', error);
        }
      } else if (interaction.customId.startsWith('invasion_time_modal')) {
        // Handle invasion time modal using refactored handlers
        try {
          await InvasionHandlers.handleTimeModal(interaction);
        } catch (error) {
          logger.error('Error handling invasion time modal:', error);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('Error executing command:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'An error occurred while executing the command.',
          flags: 64,
        });
      } else {
        await interaction.reply({
          content: 'An error occurred while executing the command.',
          flags: 64,
        });
      }
    }
  },
};
