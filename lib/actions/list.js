const chalk = require('chalk');
const process = require('process');
const Table = require('cli-table3');

const db = require('../core/db');
const init = require('../init');


module.exports = {
  do: async () => {
    await init.ensure();

    const deployments = await db.list({name: 1, type: 1, _id: 0});
    if (deployments.length === 0) {
      console.log(chalk.yellow('No deployments found, try `open-node-deployer create`'));
      process.exit(0);
    }

    let table = new Table({
      head: [chalk.green('Network name'),
             chalk.green('Deployment type'),
            ]
    });

    deployments.forEach((deployment) => {
      table.push(Object.values(deployment));
    });
    console.log(table.toString());
  }
}
