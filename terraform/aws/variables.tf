variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-south-2"
}

variable "cluster_name" {
  description = "EKS Cluster Name"
  type        = string
  default     = "devops-ecommerce-eks"
}

variable "cluster_version" {
  description = "Kubernetes Version"
  type        = string
  default     = "1.30"
}

variable "vpc_cidr" {
  description = "VPC CIDR Block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_1_cidr" {
  description = "Public Subnet 1 CIDR"
  type        = string
  default     = "10.0.1.0/24"
}

variable "public_subnet_2_cidr" {
  description = "Public Subnet 2 CIDR"
  type        = string
  default     = "10.0.2.0/24"
}

variable "instance_type" {
  description = "Worker Node Instance Type"
  type        = string
  default     = "t3.small"
}

variable "desired_size" {
  description = "Desired Worker Nodes"
  type        = number
  default     = 1
}

variable "min_size" {
  description = "Minimum Worker Nodes"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum Worker Nodes"
  type        = number
  default     = 1
}
