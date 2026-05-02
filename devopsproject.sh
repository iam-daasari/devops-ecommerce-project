#!/bin/bash/

git init

# Create the full folder structure
mkdir -p app/product-service/src/main/java/com/ecommerce/product/controller
mkdir -p app/product-service/src/main/java/com/ecommerce/product/model
mkdir -p app/product-service/src/main/java/com/ecommerce/product/repository
mkdir -p app/product-service/src/main/java/com/ecommerce/product/service
mkdir -p app/product-service/src/main/resources
mkdir -p app/product-service/src/test/java/com/ecommerce/product
mkdir -p jenkins
mkdir -p .github/workflows
mkdir -p .gitlab-ci
mkdir -p terraform/aws
mkdir -p terraform/azure
mkdir -p terraform/gcp
mkdir -p kubernetes/aws-eks
mkdir -p kubernetes/azure-aks
mkdir -p kubernetes/gcp-gke
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana
mkdir -p ansible/playbooks
mkdir -p docs

echo "# DevOps E-Commerce Project" > README.md
git add .
git commit -m "initial: project structure"
