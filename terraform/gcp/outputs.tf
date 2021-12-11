output "kubeconfig" {
  value = templatefile("${path.module}/templates/kubeconfig.tpl", {
    cluster_name    = google_container_cluster.primary.name,
    endpoint        = google_container_cluster.primary.endpoint,
    cluster_ca      = google_container_cluster.primary.master_auth.0.cluster_ca_certificate,
    client_cert     = google_container_cluster.primary.master_auth.0.client_certificate,
    client_cert_key = google_container_cluster.primary.master_auth.0.client_key,
    gcloud_path     = var.gcloud_path,
  })
  sensitive = true
}
