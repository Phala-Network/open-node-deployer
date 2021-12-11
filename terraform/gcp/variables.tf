variable "cluster_name" {
  default = "open-node-deployer"
}

variable "location" {
  default = "{{ location }}"
}

variable "node_count" {
  default = 2
}

variable "machine_type" {
  default = "{{#if machineType }}{{ machineType}}{{ else }}n2-standard-4{{/if}}"
}

variable "k8s_version" {
  default = "1.21.5-gke.1302"
}

variable "image_type" {
  default = "ubuntu"
}

variable "gcloud_path" {
  default = "{{ gcloudPath }}"
}
