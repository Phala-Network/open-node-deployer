const chalk = require('chalk');
const process = require('process');

const cfg = require('../core/cfg');
const { Cluster } = require('../cluster');
const db = require('../core/db');
const { Files } = require('../core/files');
const init = require('../init');
const inquirer = require('./inquirer');
const crypto = require('../network/crypto');
const libp2p = require('../network/libp2p');
const strings = require('../core/strings');
const { Validation } = require('../validation');

module.exports = {
  do: async (cmd) => {
    let config;
    if (cmd.config) {
      config = cfg.readAndCatch(cmd.config)
      const validator = new Validation()
      if (!validator.run(config)) {
        process.exit(1);
      }
    } else {
      // config = await inquirer.create();
      console.error(`wizard is not supported for now, please specify a config file`);
      process.exit(1);
    }

    config.verbose = cmd.verbose;
    config.update = cmd.update;
    config.dataPath = cmd.data;
    config.skipInfra = cmd.skipInfra;
    config.skipDeps = cmd.skipDeps;

    await init.ensure(config);

    config.name = strings.removeSpaces(config.name)

    return create(config);
  }
}

async function create(config) {
  const deployment = await db.find(config);
  const files = new Files(config);
  let update = false;
  if (deployment) {
    if (!config.update) {
      console.log(chalk.yellow(`Deployment ${config.name} already exists.`));
      process.exit(1);
    } else {
      update = true;
    }
  }
  files.createDeploymentDirectories(config.name);

  // TODO(Currycurrycurry): reconsider key logic for khala collator
  // const numberOfKeys = getNumberOfKeys(config);
  // config.keys = await crypto.create(numberOfKeys, config.environmentKeys);
  // config.nodeKeys = await libp2p.createNodeKeys(config.nodes, config.environmentNodeKeys);

  const cluster = new Cluster(config);

  if (!config.skipInfra) {
    console.log(chalk.yellow(`Creating cluster '${config.name}'...`));
    try {
      await cluster.create();
    } catch (err) {
      console.error(`Could not create cluster: ${err.message}`);
      await rollback(config, cluster);
      process.exit(1);
    }
    console.log(chalk.green('Done'));
  }

  if (!config.skipDeps) {
    console.log(chalk.yellow('Installing dependencies...'));
    try {
      await cluster.installDeps();
    } catch (err) {
      console.error(`Could not install dependencies: ${err.message}`);
      await rollback(config, cluster);
      process.exit(1);
    }
    console.log(chalk.green('Done'));
  }

  console.log(chalk.yellow('Installing nodes...'));
  try {
    await cluster.installNodes();
  } catch (err) {
    console.error(`Could not install nodes: ${err.message}`);
    await rollback(config, cluster);
    process.exit(1);
  }
  console.log(chalk.green('Done'));

  if (update) {
    await db.update(config);
  } else {
    await db.save(config);
  }

  // if (!config.environmentKeys) {
  //   console.log(chalk.green(keysBanner(config.keys, config.nodeKeys)));
  // }

  // console.log(chalk.yellow(`Waiting for nodes ready...`));
  // try {
  //   const result = await cluster.waitReady();
  //   config.portForwardPID = result.pid;
  //   config.wsEndpoint = result.wsEndpoint;
  // } catch (err) {
  //   console.error(`Websocket endpoint is not working: ${err.message}`);
  //   await rollback(config, cluster);
  //   process.exit(1);
  // }

  console.log(chalk.green('Done'));

  /*
  if (config.type !== 'local') {
    files.deleteKubeconfig(config.name);
  }
  */
}

async function rollback(config, cluster) {
  if (!config.keep) {
    const files = new Files(config);
    await cluster.destroy();
    const deploymentPath = files.deploymentPath(config.name);
    files.deleteDirectory(deploymentPath);
  }
}

function keysBanner(keys, nodeKeys) {
  const starLine = `*******************************************************************************`
  let keysString = '';
  const keyTypes = crypto.keyTypes();
  const totalKeys = keys[keyTypes[0]].length;
  for (let counter = 0; counter < totalKeys; counter++) {
    keyTypes.forEach((type) => {
      keysString += `
export POLKADOT_DEPLOYER_KEYS_${counter}_${type.toUpperCase()}_ADDRESS=${keys[type][counter].address}
export POLKADOT_DEPLOYER_KEYS_${counter}_${type.toUpperCase()}_SEED=${keys[type][counter].seed}
`;
    });
  }
  let nodesString = '';
  for (let counter = 0; counter < nodeKeys.length; counter++) {
    nodesString +=`
export POLKADOT_DEPLOYER_NODE_KEYS_${counter}_KEY=${nodeKeys[counter].nodeKey}
export POLKADOT_DEPLOYER_NODE_KEYS_${counter}_PEER_ID=${nodeKeys[counter].peerId}
`
  }

  return `

${starLine}
${starLine}

 IMPORTANT: the raw seeds for the created accounts will be shown next.

 These seeds allow to gain control over the accounts represented by
 the keys. If you plan to use the new cluster for other than testing
 or trying the technology, please keep them safe. If you lose these
 seeds you won't be able to access the accounts. If anyone founds them,
 they can gain control over the accounts and any funds (test or real DOTs)
 stored in them.

${keysString}

${nodesString}

${starLine}
${starLine}
`
}

function getNumberOfKeys(config) {
  let output = config.nodes;

  if (config.remote && config.remote.clusters) {
    output -= config.nonValidatorIndices.length * config.remote.clusters.length;
  }

  return output;
}
