const { deployCommands } = require('../deployCommands');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot logged in.`);
    await deployCommands(client);
  }
};
