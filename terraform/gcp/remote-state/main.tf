terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.3"
    }
  }
}

provider "google" {
  project     = "{{ projectID }}"
  credentials = "{{ credentials.gcp }}"
}

resource "google_storage_bucket" "tfstore" {
  name          = "pd-tf-state-{{ deploymentName }}"
  location      = "US"
  force_destroy = true
}
