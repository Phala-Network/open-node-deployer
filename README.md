# Open Node Deployer

open-node-deployer is a fork of [polkadot-deployer](https://github.com/w3f/polkadot-deployer). It utilizes the base code framework of the original project but to be compatible with more Substrate based blockchain nodes (more than Polkadot). It introduces a new config model to make its usage as flexible as possible and also enables the capability of declarative operation which can be used for GitOps. In addition, it's born to be cloud native and aims to make the most of [Kubernetes](https://kubernetes.io/).

open-node-deployer allows you to create and operate on remote cloud deployments of any Substrate based blockchain nodes. Currently it supports remote deployments using Google Cloud Platform for the infrastructure deployment and Cloudflare for the DNS settings that make your network accessible through websockets RPC.

## Requirements

The tool is meant to work on Linux and macOS machines. In order to be able to use the tool you will require to have installed below software on your machine:

* Recent versions of [Node.JS](https://nodejs.org/en/download/) (developed and tested with `v16.3.0`)
* [Terraform](https://www.terraform.io/downloads) v1 (developed and tested with `v1.1.0`)
* [Helm](https://helm.sh/) v3 (developed and tested with `v3.7.1`)
* [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl) depending on the version of Kubernetes cluster your cloud vendor provisions (developed and tested with `v1.22.2`)
* Recent versions of [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (developed and tested with `v365.0.1`) if you want to deploy on GCP

## Installation and execution

Downloading the latest version from git and then issuing the following commands from within the project directory: ```git clone git@github.com:Phala-Network/open-node-deployer.git```, execute ```yarn install``` to install all requirements and ```node . CMD``` to run a command.

See the [Troubleshooting section](#troubleshooting) in case you have problems running the tool.

## Prepare for remote deployments

Currently we support GCP. To successfully deploy on these infrastructure providers you will first need to setup a cloudflare account and a GCP account. Cloudflare is used to provide a domain name for your deployment and the GCP for maintaining the state of your deployment. Then you will need to provide the specific attributes required for your deployment in each of the supported providers. The required steps are as follows:

* A Linux or macOS machine meeting such [requirements](#requirements) to run this tool.

* Cloudflare credentials as two environment variables `CLOUDFLARE_EMAIL` and `CLOUDFLARE_API_KEY` (see [here](https://api.cloudflare.com/#getting-started)) for details about the API key, the email should be the one used for registration. Also, your domain name registrar should be Cloudflare since this tool relies on Cloudflare for generating SSL certification). The process will register your deployment on Cloudflare and create the required subdomains and certificates.

* GCP service account and credentials in the form of the environment variable
`GOOGLE_APPLICATION_CREDENTIALS` with the path of the json credentials file for your service account (see [here](https://cloud.google.com/iam/docs/service-accounts)). The GCP configuration is required for use by the process to keep the built state.

* A project on GCP. Keep the projectID and domain handy as you will need to edit the config files so that they contain this information. A bucket will be created under the particular projectID that will be used to store the project's terraform backend.

* Configure specific requirements that depend on your infrastructure provider. More details on this subject are described on the following section for each of the specific providers.

* Read through the [usage](#usage) section.

---
**NOTE**

Running the following configurations will cause charges by the providers. You should run the corresponding destroy command as soon as you are finished with your testing to avoid unwanted expenses.

---

The required steps of specific infrastructure providers are as follows:

<details><summary>GCP</summary>

To make a deployment on GCP you are required to have the aforementioned GCP service account and project properly configured and meet the following requirements:

* Make sure the service account has sufficient privileges for GKE.

* Enough quota on GCP to create the required resources (terraform will show the exact errors if this condition is not met).

* Kubernetes Engine API and billing enabled for your project (see [here](https://cloud.google.com/kubernetes-engine/docs/quickstart)).

In order to deploy polkadot on GCP you need to edit the preset configuration file: ```config/create.remote.sample-open-node-GCP.json``` so that it contains your projectID and domain. Then you can issue the following command:

```node . create --config create.remote.sample-open-node-GCP.json --verbose```  

The process will start creating an instance of polkadot on GCP.
By default a new cluster will be created with the name open-node-testnet at your default location with 3 `e2-standard-8` nodes under the specified project ID.

If you wish to delete your remote deployment of polkadot, you can use the destroy [name] command:

```node . destroy open-node-testnet```

</details>

### Multi provider deployment

You may also wish to run a multi AZ multi-provider deployment. In order to do so, you can create a configuration file based on your requirements and create your deployment from there. Keep in mind that you can use any combination of these providers as you see fit.

## Usage

`open-node-deployer` allows you to create, list, update and delete Substrate based blockchain nodes, which we'll call deployments from now on. All the interaction
with the command line tool is done through the following sub-commands:

### `create [options]`

Creates or updates a deployment. It accepts a `--config` option with the path of a json file containing the definition of the deployment, read [Config File](#config-file) section to learn how to write and maintain your own config file.

Each deployment consists of two components, a cluster (infra) and a network (workload).

* The cluster is the common platform on top of which the network runs, and
is currently based on Kubernetes v1.21.

* The network is composed of a set of Substrate based nodes connected together, each of them created from this [Open Node Helm charts](https://github.com/Phala-Network/open-node-charts). Helm charts are application packages for Kubernetes, more about them [here](https://helm.sh/).

The `create` sub-command also accepts following flags:

* `--update` updates an existing deployment using the config
  * `--skip-infra` skips the infra change of deployment, useful when you only want to change your workloads with existing infra
  * `--skip-deps` skips the dependency update, useful when you only want to change your workloads with existing infra and dependencies
* `--verbose` prints verbose logs, useful for debugging

### `list`

Shows details of all the created deployments:

```
┌───────────────────────┬─────────────────┐
│ Network name          │ Deployment type │
├───────────────────────┼─────────────────┤
│ open-node-testnet     │ remote          │
└───────────────────────┴─────────────────┘
```

### `destroy [name]`

Destroy a deployment including cluster, network and portforwarding process.

You can either pass the name of the deployment to destroy or let the wizard
show a list of existing deployments.

## Config File

### Basic Concepts

`open-node-deployer` supports deploying and maintaining four major roles of Substrate based blockchain nodes:

* Full Node: a vanilla full node which takes part in the p2p network
* RPC Node: a full node which also exposes RPC services
* Bootstrap Node: a full node which also be responsible for p2p bootstrapping
* Collator Node: a full node which also acts as a collator/validator

You can config each role of nodes separately with some common args, `open-node-deployer` will deploy each role of nodes as an independent [StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/), and will create per Pod [NodePort Service](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport) for p2p ports. For RPC nodes, it will also create an [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) to expose their RPC services through HTTP and websocket.

### Usage of Config File

Here's an example of a complete config file:

```json
{
  "name": "open-node-testnet",
  "type": "remote",
  "keep": true,
  "nodes": {
    "common": {
      "image": "phalanetwork/khala-node:v1110-healthcheck",
      "command": [],
      "dataPath": "/data",
      "dataVolume": {
        "storageClassName": "",
        "initialSize": "200Gi"
      },
      "port": {
        "p2p": {
          "para": 30333,
          "relay": 30334
        },
        "rpc": {
          "para": 9933,
          "relay": 9944
        }
      },
      "livenessProbe": {
        "exec": {
          "command": ["curl", "-f", "-H", "Content-Type: application/json", "-d", "{\"id\":1, \"jsonrpc\":\"2.0\", \"method\": \"system_health\"}", "http://localhost:9933/"]
        },
        "timeoutSeconds": 5,
        "failureThreshold": 3,
        "initialDelaySeconds": 180,
        "periodSeconds": 10
      },
      "readinessProbe": {},
      "terminationGracePeriodSeconds": 120
    },
    "full": {
      "args": {
        "para": [
          "--chain=khala",
          "--pruning=archive",
          "--state-cache-size=671088640",
          "--db-cache=2048",
          "--max-runtime-instances=16",
          "--prometheus-external"
        ],
        "relay": [
          "--pruning=256",
          "--state-cache-size=671088640",
          "--db-cache=2048",
          "--max-runtime-instances=16",
          "--prometheus-external"
        ]
      },
      "resources": {
        "requests": {
          "cpu": "2",
          "memory": "12Gi"
        },
        "limits": {
          "cpu": "2",
          "memory": "12Gi"
        }
      }
    },
    "rpc": {
      "args": {
        "para": [
          "--chain=khala",
          "--pruning=archive",
          "--state-cache-size=671088640",
          "--db-cache=2048",
          "--max-runtime-instances=16",
          "--rpc-methods=Unsafe",
          "--rpc-cors=all",
          "--unsafe-ws-external",
          "--ws-port=9944",
          "--unsafe-rpc-external",
          "--rpc-port=9933",
          "--prometheus-external"
        ],
        "relay": [
          "--pruning=256",
          "--state-cache-size=671088640",
          "--db-cache=2048",
          "--max-runtime-instances=16",
          "--prometheus-external"
        ]
      },
      "resources": {
        "requests": {
          "cpu": "4",
          "memory": "12Gi"
        },
        "limits": {
          "cpu": "4",
          "memory": "12Gi"
        }
      },
      "readinessProbe": {
        "exec": {
          "command": ["sh", "/root/health.sh"]
        },
        "timeoutSeconds": 5,
        "failureThreshold": 3,
        "initialDelaySeconds": 180,
        "periodSeconds": 10
      }
    },
    "bootstrap": {
      "args": {
        "para": [
          "todo"
        ],
        "relay": [
          "todo"
        ]
      },
      "resources": {
        "requests": {
          "cpu": "2",
          "memory": "2Gi"
        },
        "limits": {
          "cpu": "2",
          "memory": "2Gi"
        }
      }
    },
    "collator": {
      "args": {
        "para": [
          "todo"
        ],
        "relay": [
          "todo"
        ]
      },
      "resources": {
        "requests": {
          "cpu": "2",
          "memory": "2Gi"
        },
        "limits": {
          "cpu": "3",
          "memory": "2Gi"
        }
      }
    }
  },
  "monitoring": {
    "enabled": true
  },
  "remote": {
    "projectID": "open-node-dev",
    "domain": "phala.works",
    "clusters": [
      {
        "provider": "gcp",
        "location": "asia-east1",
        "machineType": "e2-standard-8",
        "workers": 1,
        "subdomain": "",
        "nodes": {
          "full": {
            "enabled": true,
            "replica": 1,
            "partition": 0
          },
          "rpc": {
            "enabled": true,
            "replica": 1,
            "partition": 0
          },
          "bootstrap": {
            "enabled": false,
            "replica": 1,
            "partition": 0
          },
          "collator": {
            "enabled": false,
            "replica": 1,
            "partition": 0
          }
        }
      }
    ]
  }
}
```

You may find that you can configure the params of each role of nodes in three places:

* `nodes.common`: you can configure common params for all your nodes here, such as images and p2p ports.
* ``nodes[`${type}`]``: you can configure params for a specific role of nodes, such as args and resources.
* ``remote.clusters[i].nodes.[`${type}`]``: you can configure params for a specific role of nodes in a specific cluster, such as whether it should be deployed in this cluster and the replica count.

Here're explanations for specific fields:

#### Common

* `name`: unique string to distinguish your deployment in subsequent commands.
* `type`: currently only `remote` allowed.
* `keep`: whether to keep the deployment on creation failure.
* `monitoring`: enable monitoring stack, see the [Monitoring section](#monitoring)

#### Infra

* `remote(.clusters[i]).projectID`: id of your GCP project.
* `remote(.clusters[i]).location`: region or zone to use for the deployment.
* `remote(.clusters[i]).domain`: under which domain the tool will create the RPC endpoint. Final endpoint of cluster i will be `${name}-${i}.${domain}`, you can access by HTTP on `/public-rpc/` and by websocket on `/public-ws/`.
* `remote.clusters[i].provider`: the cloud provider of your cluster, currently support `gcp`.
* `remote.clusters[i].workers`: the number of Kubernetes worker [nodes](https://kubernetes.io/docs/concepts/architecture/nodes/) of your cluster. Note that for a regional cluster of GKE, your cluster will get `3 * workers` nodes finally because the workers are duplicated to three AZs of that region, see [GKE doc](https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-regional-cluster) for detail.

#### Workload

As mentioned above, workload params can be configured in multi places. Every param can be configured in each place and the most specific one will be used.

* `args`: the args used to start your node. You can configure args for para chain in `para` and relay chain in `relay` if your node has dual chain support.
* `dataVolume`: the tool uses PVC template of StatefulSet to dynamically create data disks for each of your nodes. You can configure the storage class and initial size of the PV here. If you're not familiar with Kubernetes storage, read this [doc](https://kubernetes.io/docs/concepts/storage/). Note that the initial size cannot be changed after successful creation. You may manually edit the PVC of the node if you want to expand data disk for a specific node.
* `livenessProbe` and `readinessProbe`: raw configs of [Kubernetes liveness probe and readiness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) for your workload pods.
* `resources`: raw configs for [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) of your workload pods.
* `partition`: represents the `partition` of the StatefulSet of the corresponding type of node, can be used for staging or rolling out a canary. Check [StatefulSet rolling update doc](https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/#rolling-update) for details.

Unless otherwise stated, every param can be changed on the fly, so you won't need any imperative command such as scale up and down. Just edit the config file and run `create --update`, the tool will make sure your deployment is as expected regardless of its previous state.

## Monitoring

You can enable monitoring for remote deployments, by setting `monitoring.enabled` to true in the configuration. When enabled, open-node-deployer will install a generic monitoring stack composed of prometheus, alertmanager, grafana and loki.

There will be a grafana instance deployed per cluster, and can be accessed locally by using `kubectl port-forward svc/grafana -n monitoring :80` with default username `admin` and password `admin123`.

## FAQ

> Where can I find the kubeconfig of a specific cluster?

* Linux: `~/.config/open-node-deployer/deployments/${name}-${i}/kubeconfig`
* macOS: `~/Library/Application Support/open-node-deployer/deployments/${name}-${i}/kubeconfig`

`name` stands for your deployment's name and `i` stands for the index of your cluster in the `remote.clusters` array of config file.

## Troubleshooting

Below are some common problems found by users. If you have an issue and this suggestions don't help don't hesitate to [open an issue](https://github.com/Phala-Network/open-node-deployer/issues/new).

You can get more information about what is the actual adding the `--verbose` option to any open-node-deployer command.

* In some cases the installation process can produce errors from the secp256k1 dependency with messages related to the required python version, like:
  ```
  gyp ERR! configure error
  gyp ERR! stack Error: Python executable "/usr/local/opt/python/libexec/bin/python" is v3.7.3, which is not supported by gyp.
  ```
  To solve this problem you can either define some alias from the command line
  before installing:
  ```
  alias python=python2
  alias pip=pip2
  ```
  or call the install command with an additional option:
  ```
  npm i -g --python=python2.7 open-node-deployer
  ```
  See [this issue](https://github.com/w3f/polkadot-deployer/issues/2) for details.

* If you installed gcloud cli tool via homebrew on macOS, you may face this issue:

  ```
  Unable to connect to the server: error executing access token command "/usr/bin/gcloud config config-helper --format=json": err=fork/exec /usr/bin/gcloud: no such file or directory output= stderr=
  ```

  Locate your gcloud installation with the following command:

  ```
  which gcloud
  /usr/local/bin/gcloud
  ``` 

  Add this path as an optional variable in the config/create.remote.*.json

  ```
  "name": "gcp-testnet",
  "type": "remote",
  "gcloudPath": "/usr/local/bin/gcloud",
  "keep": true,
   ...
  ``` 

* Certain files from folder config need to be set with 0600 permission due to security reasons.  
You may experience this error from your local deployment:  

  ```
  node . create --config ./config/create.local.sample.json --verbose
  Expected file permission 600, found 644 for file ./config/create.local.sample.json
  ```
  
  Fix it like this:
  
  ```
  chmod 0600 ./config/create.local.sample.json
  node . create --config ./config/create.local.sample.json --verbose
  ```
