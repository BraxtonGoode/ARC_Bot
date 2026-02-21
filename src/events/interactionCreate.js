const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

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
        const filtered = tierlistChoices
          .filter(
            (choice) =>
              choice.name.toLowerCase().includes(focusedValue) ||
              choice.value.toLowerCase().includes(focusedValue),
          )
          .slice(0, 25)
          .map((choice) => ({ name: choice.name, value: choice.value }));
        await interaction.respond(filtered);
        return;
      }

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
        // Handle invasion-related buttons
        const command = client.commands.get('invasion');
        if (command) {
          try {
            if (interaction.customId === 'invasion_cancel') {
              await command.handleCancel(interaction);
            } else if (interaction.customId === 'invasion_back_to_date') {
              await command.handleBackToDate(interaction);
            } else if (interaction.customId === 'invasion_back_to_time') {
              await command.handleBackToTime(interaction);
            }
          } catch (error) {
            logger.error('Error handling invasion button:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
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
        // Handle invasion-related select menus
        const command = client.commands.get('invasion');
        if (command) {
          try {
            if (interaction.customId === 'invasion_date_select') {
              await command.handleDateSelection(interaction);
            } else if (
              interaction.customId.startsWith('invasion_time_select')
            ) {
              await command.handleTimeSelection(interaction);
            } else if (
              interaction.customId.startsWith('invasion_reminder_select')
            ) {
              await command.handleReminderSelection(interaction);
            }
          } catch (error) {
            logger.error('Error handling invasion select menu:', error);
            if (!interaction.replied) {
              await interaction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          }
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
