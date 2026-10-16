#!/usr/bin/env bun
import { createCLI } from "@bunli/core";
import installCommand from "./commands/install";



const cli = await createCLI({
  name: "hightex-cli",
  version: "0.1.0",
  description: "a cli tools for hightex-destop workflow",
});

cli.command(installCommand)

await cli.run();
