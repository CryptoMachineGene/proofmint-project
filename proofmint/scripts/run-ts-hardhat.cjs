#!/usr/bin/env node
// Ensures TypeScript scripts run under Hardhat by pre-registering ts-node
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
require('hardhat/internal/cli/cli');
