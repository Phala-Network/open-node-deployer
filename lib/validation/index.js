const chalk = require('chalk');
const inquirer = require('../actions/inquirer');

class Validation {
  constructor (config={}) {
    this.config = JSON.parse(JSON.stringify(config));
  }

  run(input) {
    if (!input.name) {
      console.error(chalk.red(`'name' field must be provided`));
      return false;
    }
    if (!input.type) {
      console.error(chalk.red(`'type' field must be provided`));
      return false;
    }
    if (input.type === 'local') {
      console.error(chalk.red(`local deployment is not supported for now`));
      return false;
    }
    if (!inquirer.defaults.allowedTypes.includes(input.type)) {
      console.error(chalk.red(`'type' must be in ${inquirer.defaults.allowedTypes}`));
      return false;
    }
    if (!input.nodes) {
      console.error(chalk.red(`'nodes' field must be provided`));
      return false;
    }
    return true;
  }
}

module.exports = {
  Validation
}
