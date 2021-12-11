terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.3"
    }
  }
}

provider "google" {
  project = "{{ projectID }}"
}
