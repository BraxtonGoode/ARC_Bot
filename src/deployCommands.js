const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const logger = require('./utils/logger');


const HASH_FILE = path.join(__dirname, '.lastcommands.hash');

function getCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  return commandFiles.map(file => {
    const command = require(path.join(commandsPath, file));
    return command.data.toJSON();
  });
}

function getHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function deployCommands() {
  const commands = getCommands();
  const newHash = getHash(commands);

  if (fs.existsSync(HASH_FILE)) {
    const oldHash = fs.readFileSync(HASH_FILE, 'utf8');
    if (oldHash === newHash) {
      logger.info('No changes, deployment skipped.');
      return;
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    logger.info('Deploying commands..');
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    logger.info(`Deployed ${commands.length} global commands.`);

    fs.writeFileSync(HASH_FILE, newHash);
  } catch (error) {
    logger.error('Error while deploying commands:', error);
  }
}


module.exports = { deployCommands };