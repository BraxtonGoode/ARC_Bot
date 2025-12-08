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
            error
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
              choice.value.toLowerCase().includes(focusedValue)
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
      if (interaction.customId === 'open_shard_calculator') {
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
