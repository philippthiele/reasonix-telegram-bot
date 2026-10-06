import { describe, expect, it } from "vitest";
import {
  BOT_COMMANDS,
  BUILT_IN_COMMAND_NAMES,
  getLocalizedBotCommands,
} from "../../../src/bot/commands/definitions.js";

describe("bot/commands/definitions", () => {
  it("lists /reload right after /reasonix_stop", () => {
    const commands = BOT_COMMANDS.map(({ command }) => command);

    expect(commands[commands.indexOf("reasonix_stop") + 1]).toBe("reload");
    expect(BUILT_IN_COMMAND_NAMES).toContain("reload");
  });

  it("serves the localized commands in the same order as the plain list", () => {
    expect(getLocalizedBotCommands().map(({ command }) => command)).toEqual(
      BOT_COMMANDS.map(({ command }) => command),
    );
  });
});