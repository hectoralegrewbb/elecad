import { matchScore } from '../core/textSearch.js';

// command = { id, title, subtitle?, group?, keywords?, shortcut?, enabled?, run }
export class CommandRegistry {
  constructor() {
    this.commands = [];
  }

  register(command) {
    this.commands.push({ subtitle: '', group: 'Comandos', keywords: [], shortcut: '', enabled: () => true, ...command });
  }

  registerMany(commands) {
    commands.forEach((command) => this.register(command));
  }

  search(query, limit = 12) {
    const text = query.trim();
    return this.commands
      .filter((command) => command.enabled())
      .map((command) => ({
        command,
        score: matchScore(`${command.title} ${command.subtitle} ${command.group} ${command.keywords.join(' ')}`, text),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.command);
  }
}
