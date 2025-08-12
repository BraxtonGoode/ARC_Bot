const { ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

function formatCharacterName(rawName) {
  return rawName
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createErrorReply(content) {
  return {
    flags: (1 << 15) | (1 << 6),
    components: [
      {
        type: ComponentType.Container,
        accent_color: 0xE74C3C,
        components: [{ type: ComponentType.TextDisplay, content }]
      }
    ]
  };
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

function findClosestCharacter(inputName) {
  const charactersPath = path.join(__dirname, '..', 'data', 'characters.json');
  let characters = [];

  try {
    const raw = fs.readFileSync(charactersPath, 'utf8');
    characters = JSON.parse(raw);
  } catch {
    return null;
  }

  const normalizedInput = normalizeName(inputName);

  let exact = characters.find(c => normalizeName(c.value) === normalizedInput);
  if (exact) return exact.value;

  let partial = characters.find(c => normalizeName(c.value).includes(normalizedInput));
  if (partial) return partial.value;

  let namePartial = characters.find(c => normalizeName(c.name).includes(normalizedInput));
  if (namePartial) return namePartial.value;

  return null;
}

module.exports = {
  formatCharacterName,
  createErrorReply,
  findClosestCharacter,
};