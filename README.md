# DevOps E-Commerce Project:

# ShopEase — CI/CD Pipeline with Security & Quality Gates on AWS

A Spring Boot e-commerce product management API deployed through three 
independent CI/CD pipelines on AWS, with integrated code quality analysis 
and security scanning.

## Overview

This project demonstrates a production-style CI/CD setup where the same 
application is built, tested, quality-checked, security-scanned, and 
deployed through three separate industry-standard tools — proving 
versatility across the CI/CD tooling landscape.

## Tech Stack

- **Application:** Java 17, Spring Boot 3.x, Spring Data JPA, H2 Database
- **CI/CD:** Jenkins, GitHub Actions, GitLab CI
- **Code Quality:** SonarCloud
- **Security:** Trivy (container vulnerability scanning)
- **Containerization:** Docker (multi-stage builds)
- **Registry:** DockerHub
- **Infrastructure:** AWS EC2 (Ubuntu, t3.micro)

## Pipeline Overview

| Pipeline | Stages/Jobs | Deploy Port |
|----------|------------|-------------|
| Jenkins | 12 stages | 8081 |
| GitHub Actions | 7 jobs | 8082 |
| GitLab CI | 10 jobs | 8083 |

Each pipeline: Checkout → Build → Test → SonarCloud Analysis → Package → 
Docker Build → Trivy Scan → Push to Registry → Deploy → Health Check

## Security & Quality Results

- **Trivy Scan:** 0 vulnerabilities (started at 33 — 6 CRITICAL, 27 HIGH)
- **SonarCloud:** Security A | Reliability A | Maintainability A | 0 open issues

## Key Engineering Decisions

- **Constructor-based dependency injection** over field injection for 
  testability (flagged by SonarCloud rule java:S6813)
- **DTO pattern** to decouple API contracts from JPA entities, preventing 
  clients from setting internal/generated fields
- **Multi-stage Docker builds** reducing image size from ~700MB to ~200MB
- **Non-blocking quality gate** — SonarCloud free-tier Quality Gate 
  conditions (80% coverage requirement) documented transparently rather 
  than hidden; overall code health (A/A/A ratings) is the primary signal

## Failures Documented

20+ real failures faced during this build — Jenkins executor scheduling, 
disk space management, Java version conflicts, SSH key formatting, YAML 
syntax and indentation errors, Trivy disk quota issues — each documented 
with root cause, fix, and lesson learned. See `failures.md` for the 
complete list.

## Roadmap

- [x] Multi-pipeline CI/CD (Jenkins, GitHub Actions, GitLab CI)
- [x] Code quality gates (SonarCloud)
- [x] Security scanning (Trivy)
- [ ] Infrastructure as Code (Terraform)
- [ ] Kubernetes deployment (AWS EKS) with GitOps (ArgoCD)
- [ ] Observability (Prometheus, Grafana)
- [ ] Cloud cost optimization
