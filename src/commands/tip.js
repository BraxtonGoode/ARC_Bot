const { SlashCommandBuilder, ComponentType, AttachmentBuilder, MediaGalleryBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { createErrorReply } = require('../utils/helpers');

module.exports = {
    name: 'tip',
    data: new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Get a gameplay tip')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Tip name')
                .setAutocomplete(true)
                .setRequired(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const tipsPath = path.join(__dirname, '..', 'data', 'tips');
        const files = await fs.promises.readdir(tipsPath);

        const tips = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const raw = await fs.promises.readFile(path.join(tipsPath, file), 'utf8');
                const data = JSON.parse(raw);
                tips.push({
                    name: data.name || file.replace('.json', ''),
                    value: file.replace('.json', '')
                });
            } catch { }
        }

        const filtered = tips.filter(t => t.name.toLowerCase().includes(focused)).slice(0, 25);
        await interaction.respond(filtered);
    },

    async execute(interaction) {
        const tipFileName = interaction.options.getString('name');

        try {
            const jsonPath = path.join(__dirname, '..', 'data', 'tips', `${tipFileName}.json`);
            let jsonRaw;
            try {
                jsonRaw = await fs.promises.readFile(jsonPath, 'utf8');
            } catch {
                return interaction.reply(createErrorReply(`Couldn't find tip "${tipFileName}".`));
            }

            const { name, providedBy, lastUpdated, tip, image } = JSON.parse(jsonRaw);
            const unixTimestamp = lastUpdated ? Math.floor(new Date(lastUpdated).getTime() / 1000) : null;

            let components = [
                { type: ComponentType.TextDisplay, content: `**${name || tipFileName}**` },
                { type: ComponentType.Separator },
                { type: ComponentType.TextDisplay, content: tip },
                { type: ComponentType.Separator }
            ];

            if (providedBy && providedBy.trim() !== '') {
                components.push({
                    type: ComponentType.TextDisplay,
                    content: `Provided by ${providedBy} ${unixTimestamp ? `- Last updated on <t:${unixTimestamp}:D>` : ''}`
                });
            } else if (unixTimestamp) {
                components.push({
                    type: ComponentType.TextDisplay,
                    content: `Last updated on <t:${unixTimestamp}:D>`
                });
            }

            let files = [];
            if (image && image.trim() !== '') {
                const imagePath = path.join(__dirname, '..', 'assets', 'tips', image);
                try {
                    await fs.promises.access(imagePath);
                    const file = new AttachmentBuilder(imagePath);
                    files.push(file);

                    const gallery = new MediaGalleryBuilder().addItems(item =>
                        item.setDescription(name || tipFileName).setURL(`attachment://${image}`)
                    );

                    const insertIndex = components.findIndex(c => c.content && (c.content.startsWith('Provided by') || c.content.startsWith('Last updated on')));
                    if (insertIndex >= 0) {
                        components.splice(insertIndex, 0, gallery, { type: ComponentType.Separator });
                    } else {
                        components.push(gallery, { type: ComponentType.Separator });
                    }

                } catch {
                    console.warn(`Couldn't find image "${image}" for tip "${tipFileName}", skipping..`);
                }
            }

            return interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] },
                files,
                components: [
                    {
                        type: ComponentType.Container,
                        accent_color: 0x3498DB,
                        components
                    }
                ]
            });

        } catch (error) {
            console.error('/tip error:', error);
            return interaction.reply(createErrorReply('Error while loading tip.'));
        }
    }
};