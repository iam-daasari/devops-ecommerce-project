provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "devops-ecommerce"
      Environment = "dev"
      ManagedBy   = "Terraform"
      Owner       = "Rojarani"
    }
  }
}
