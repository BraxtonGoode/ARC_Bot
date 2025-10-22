const { ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

function formatCharacterName(rawName) {
  return rawName
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createErrorReply(content) {
  return {
    flags: (1 << 15) | (1 << 6),
    components: [
      {
        type: ComponentType.Container,
        accent_color: 0xe74c3c,
        components: [{ type: ComponentType.TextDisplay, content }],
      },
    ],
  };
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/_+/g, '_').trim();
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

  let exact = characters.find(
    (c) => normalizeName(c.value) === normalizedInput
  );
  if (exact) return exact.value;

  let partial = characters.find((c) =>
    normalizeName(c.value).includes(normalizedInput)
  );
  if (partial) return partial.value;

  let namePartial = characters.find((c) =>
    normalizeName(c.name).includes(normalizedInput)
  );
  if (namePartial) return namePartial.value;

  return null;
}

function formatTierlistName(rawName) {
  return rawName
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function findClosestTierlist(inputName) {
  const tierlistsPath = path.join(__dirname, '..', 'data', 'tierlists');
  let files = [];

  try {
    files = fs.readdirSync(tierlistsPath);
  } catch {
    return null;
  }

  const tierlists = files.map((f) => f.replace(/\.[^/.]+$/, ''));
  const normalizedInput = normalizeName(inputName);

  let exact = tierlists.find((t) => normalizeName(t) === normalizedInput);
  if (exact) return exact;

  let partial = tierlists.find((t) =>
    normalizeName(t).includes(normalizedInput)
  );
  if (partial) return partial;

  return null;
}

module.exports = {
  formatCharacterName,
  createErrorReply,
  findClosestCharacter,
  formatTierlistName,
  findClosestTierlist,
};
