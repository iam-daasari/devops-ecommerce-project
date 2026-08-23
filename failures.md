# Failures Faced During This Project

This document lists every real failure encountered while building this project, in the order they happened. Each entry includes the exact error, the approach taken to investigate it, the root cause, the fix applied, and the lesson learned.

No screenshots are included in this file — all screenshots captured during this project were of successful/passing states (pipelines green, scan results, dashboards). Error states were captured as terminal/log text only, which is preserved below exactly as encountered.

---

## Failure 1 — Docker Desktop Installation Failed on Windows

**Error:**
```
For security reasons C:\ProgramData\DockerDesktop must be owned by an elevated account
```

**Approach:** Attempted `takeown` and `icacls` commands in an elevated terminal to fix folder ownership. After repeated failures, decided to abandon local Docker entirely.

**Root Cause:** Windows folder permissions were misconfigured, likely from a previous Docker installation or group policy affecting default ownership of the ProgramData directory.

**Fix:** Skipped Docker Desktop on Windows completely. Ran Docker directly on the AWS EC2 Ubuntu instance instead.

**Lesson:** Local Docker Desktop is not required for DevOps project work — real DevOps happens on Linux servers.

---

## Failure 2 — Jenkins Installation Failed on Ubuntu 26.04

**Error:**
```
Failed to start jenkins.service: Unit jenkins.service not found
W: GPG error: https://pkg.jenkins.io/debian-stable binary/ Release:
NO_PUBKEY 7198F4B714ABFC68
```

**Approach:** Investigated the apt repository error, found Ubuntu 26.04 was too new for Jenkins Debian repo certification.

**Root Cause:** Jenkins apt repository GPG signature could not be verified for this very new Ubuntu release, so apt refused the repository entirely and Jenkins was never installed.

**Fix:** Downloaded `jenkins.war` directly from get.jenkins.io. Created a custom systemd service file with Java 21 as runtime.
```bash
sudo wget -O /opt/jenkins.war https://get.jenkins.io/war-stable/latest/jenkins.war
sudo systemctl daemon-reload && sudo systemctl enable jenkins && sudo systemctl start jenkins
```

**Lesson:** When official repositories do not support a very new OS, download the binary directly and write a custom systemd service.

---

## Failure 3 — Jenkins Could Not Schedule Build — Waiting for Executor

**Error:**
```
Still waiting to schedule task - Waiting for next available executor
```

**Approach:** Checked node status (offline), checked `df -h` (/tmp only 444MB) and `free -h` (46MB free RAM, zero swap).

**Root Cause:** Jenkins default threshold requires 1GB free in /tmp but tmpfs /tmp was only 444MB. Also zero swap on t3.micro caused memory exhaustion during builds.

**Fix:** Changed Jenkins Free Temp Space Threshold to 200MB. Created 2GB swap, made permanent in /etc/fstab.
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Lesson:** AWS t3.micro has 1GB RAM, no swap by default — always configure swap before installing memory-intensive tools.

---

## Failure 4 — Docker Image Build Failed — No Space Left on Device

**Error:**
```
write /var/lib/containerd/.../fs/opt/java/openjdk/lib/modules: no space left on device
```

**Approach:** Ran `df -h` (577MB free of 8GB), `du -sh` found duplicate Java installations consuming space.

**Root Cause:** 8GB EBS volume consumed by OS, two Java versions, Maven, Jenkins, Docker — insufficient for image layers.

**Fix:** Removed unused Java 21 install. Expanded EBS 8GB to 20GB in AWS Console, then ran `growpart` and `resize2fs` on the instance.
```bash
sudo growpart /dev/nvme0n1 1
sudo resize2fs /dev/nvme0n1p1
```

**Lesson:** EBS expansion is a two-step process — resize in AWS Console AND expand the filesystem with `growpart`/`resize2fs`.

---

## Failure 5 — Maven Compile Failed — Java Release Version Not Supported

**Error:**
```
Fatal error compiling: error: release version 17 not supported
```

**Approach:** Investigated which Java Maven was actually using — found it inherited system Java 21 (required by Jenkins).

**Root Cause:** `java.version` property in Spring Boot pom.xml is only documentation, not an actual Maven compiler directive.

**Fix:** Added explicit `maven.compiler.source`/`target`/`release`=17 in pom.xml. Set `JAVA_HOME` in Jenkinsfile to Java 17 path.

**Lesson:** Always set the three explicit Maven compiler properties — Jenkins runtime Java and build Java can differ.

---

## Failure 6 — Jenkins Failed to Start After Switching System Java to 17

**Error:**
```
Running with Java 17, which is older than minimum required version (Java 21).
Supported Java versions are: [21, 25]
```

**Approach:** While fixing Failure 5, switched system default Java to 17, breaking Jenkins which requires 21 minimum.

**Root Cause:** Jenkins and the application have independent Java version requirements.

**Fix:** Restored Java 21 as system default via `update-alternatives`. Kept JAVA_HOME override scoped to build stage only.
```bash
sudo update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
```

**Lesson:** Never change global system Java to satisfy one tool — scope version control to the specific stage that needs it.

---

## Failure 7 — GitLab CI YAML Invalid — Zero Jobs Created

**Error:**
```
yaml invalid - jobs:maven-clean:script config should be a string or a nested array of strings up to 10 levels deep. GO 0 jobs
```

**Approach:** Used GitLab Pipeline Editor to validate YAML and pinpoint exact syntax problems.

**Root Cause:** `cd` and `mvn` on separate lines (each line = new shell, cd had no effect), docker tag split across lines, special characters in echo confused the parser.

**Fix:** Combined commands with `&&` on single lines, put multi-part commands on one line, simplified echo messages.

**Lesson:** Every dash under `script` in GitLab CI runs in an independent shell — chain related commands with `&&`.

---

## Failure 8 — GitLab CI SSH Deploy Failed — Permission Denied

**Error:**
```
Load key "/root/.ssh/id_rsa": error in libcrypto
ubuntu@[MASKED]: Permission denied (publickey)
```

**Approach:** Investigated exact SSH key format and how GitLab variables handle multiline secrets differently by type.

**Root Cause:** Key was OPENSSH format stored as Variable type (not File type), missing trailing newline, corrupting libcrypto parsing.

**Fix:** Changed variable type to File. Used `cat "$EC2_SSH_KEY" > ~/.ssh/id_rsa`, added trailing newline with `echo`, `chmod 600`.
```bash
cat "$EC2_SSH_KEY" > ~/.ssh/id_rsa
echo "" >> ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
```

**Lesson:** For SSH keys in GitLab CI: always File-type variable, always trailing newline, always chmod 600.

---

## Failure 9 — GitLab CI Health Check Failed — Connection Reset

**Error:**
```
curl: (56) Recv failure: Connection reset by peer
```

**Approach:** SSHed into EC2 manually and ran `docker logs` to see actual Spring Boot startup timeline.

**Root Cause:** Deploy script slept only 20 seconds but Spring Boot took 52.189 seconds to start on the constrained t3.micro.

**Fix:** Increased sleep from 20 to 60 seconds before the health check curl command.

**Lesson:** Never guess startup time — check actual container logs. Spring Boot with JPA commonly takes 30-60s on small instances.

---

## Failure 10 — GitHub Actions — Wrong Directory Path

**Error:**
```
line 7: cd: product-service: No such file or directory
```

**Approach:** Checked actual repository folder structure with `ls -la` to find where pom.xml actually lived.

**Root Cause:** Assumed pom.xml was directly under a `product-service` folder at root, but it was nested under `app/product-service`.

**Fix:** Corrected the `cd` path in the workflow YAML to the actual folder location.

**Lesson:** Always verify actual repo folder structure before writing paths into CI YAML — never assume.

---

## Failure 11 — SonarCloud — Field Injection Flagged (java:S6813)

**Error:**
```
Remove this field injection and use constructor injection instead. Rule: java:S6813
```

**Approach:** Reviewed SonarCloud rule documentation on why field injection via @Autowired is discouraged.

**Root Cause:** Field injection relies on reflection, prevents the field being final, and makes unit testing harder.

**Fix:** Removed `@Autowired`, made the field `private final`, added an explicit constructor. Spring auto-uses it.

**Lesson:** Constructor injection is the Spring Boot best practice — explicit, immutable, trivially testable.

---

## Failure 12 — SonarCloud — Entity Exposed Directly in REST API

**Error:**
```
Replace this persistent entity with a simple POJO or DTO object
```

**Approach:** Investigated why exposing a JPA @Entity directly as a request body is a flagged anti-pattern.

**Root Cause:** `Product` @Entity used directly as @RequestBody meant clients could set internal fields like `id` directly.

**Fix:** Created a `ProductRequest` DTO with only client-settable fields (no id). Controller and Service updated to use it.

**Lesson:** Always separate API contract (DTO) from database model (Entity) — schema changes should not break the API.

---

## Failure 13 — Compilation Error — Constructor Name Typo

**Error:**
```
invalid method declaration; return type required
public ProductController(ProductRepository productRepository) {
```
(inside `ProductService.java`)

**Approach:** Read the exact file line by line to spot the mismatch between class name and constructor name.

**Root Cause:** While applying constructor injection, the constructor in `ProductService.java` was mistakenly named `ProductController`.

**Fix:** Renamed the constructor to match the actual class name, `ProductService`.

**Lesson:** In Java, constructor name must exactly match class name — a copy-paste error across files is an easy trap.

---

## Failure 14 — SonarCloud — Project Not Found in GitHub Actions

**Error:**
```
Project not found. Please check the 'sonar.projectKey' and 'sonar.organization'
properties, the 'SONAR_TOKEN' environment variable, or contact the project
administrator to check the permissions of the user the token belongs to
```

**Approach:** Verified project key and organization key directly from SonarCloud UI/URL rather than trusting secret values blindly.

**Root Cause:** GitHub secrets for project key/org key were either mistyped or not reliably passed through.

**Fix:** Hardcoded the `projectKey` and `organization` values directly in the workflow YAML (only the token stayed a secret).

**Lesson:** Non-sensitive identifiers like project key and org key do not need to be secrets — hardcoding avoids silent typos.

---

## Failure 15 — GitHub Actions SonarCloud — Missing Compiled Classes

**Error:**
```
Your project contains .java files, please provide compiled classes with
sonar.java.binaries property, or exclude them from the analysis
```

**Approach:** Understood SonarCloud needs compiled bytecode, not just source text, to perform analysis.

**Root Cause:** Pipeline ran `mvn sonar:sonar` directly without compiling first, so no .class files existed to analyze.

**Fix:** Changed command to `mvn clean compile test sonar:sonar` so compilation happens before the analysis goal.

**Lesson:** Always chain `compile` (and `test` for coverage) before `sonar:sonar` in the same Maven invocation.

---

## Failure 16 — SonarCloud Quality Gate Failed — Coverage and Duplication

**Error:**
```
Quality Gate Failed
2 conditions failed:
0.0% Coverage (>= 80.0% required)
12.75% Duplicated Lines (<= 3.0% required)
```

**Approach:** Investigated both metrics separately — checked JaCoCo wiring for coverage, checked which files were flagged for duplication.

**Root Cause:** JaCoCo report path was not wired into the SonarCloud command initially (0% coverage). `ProductRequest` DTO and `Product` Entity share near-identical fields by design (duplication).

**Fix:** Added JaCoCo Maven plugin with `prepare-agent`/`report` goals. Added `-Dsonar.coverage.jacoco.xmlReportPaths` pointing to the generated report. Since free-tier Quality Gate conditions cannot be edited, made the SonarCloud stage non-blocking across all 3 pipelines.

**Lesson:** Free-tier SonarCloud enforces a fixed 80% coverage / 3% duplication gate that cannot be customized without upgrading — document honestly rather than hide it.

---

## Failure 17 — GitHub Actions — Backslash Continuation Error

**Error:**
```
/home/runner/work/_temp/xxxx.sh: line 7: -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml: No such file or directory
Error: Process completed with exit code 127
```

**Approach:** Reviewed the multi-line `run: |` YAML block character by character for a missing continuation character.

**Root Cause:** A line in the middle of the multi-line `mvn` command was missing its trailing backslash, so the shell treated the next line as a new command.

**Fix:** Added the missing backslash so the entire block ran as one continuous shell command.

**Lesson:** Every line except the last in a multi-line `run: |` block must end with a backslash.

---

## Failure 18 — Trivy — apt-key Command Not Found

**Error:**
```
sudo: 'apt-key' command not found
```

**Approach:** Investigated why the standard Trivy install commands failed on this Ubuntu version.

**Root Cause:** `apt-key` was removed/deprecated in newer Ubuntu releases including 26.04.

**Fix:** Used the modern keyring-based method instead:
```bash
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install trivy -y
```

**Lesson:** Always check for deprecated commands on very new OS versions and use the currently recommended method.

---

## Failure 19 — Trivy — 33 Vulnerabilities Found in First Scan

**Error:**
```
Total: 33 (CRITICAL: 6, HIGH: 27)
```

**Approach:** Ran `trivy image --severity CRITICAL,HIGH`, read the Library/Installed/Fixed Version columns carefully.

**Root Cause:** Outdated Alpine `gnutls` package (5 CVEs) and outdated bundled Tomcat/Spring/Logback via Spring Boot 3.2.0, including a Tomcat RCE (CVE-2025-24813).

**Fix:** Added `apk update && apk upgrade` to Dockerfile. Upgraded Spring Boot parent version progressively 3.2.0 → 3.3.11 → 3.5.1 → 3.5.14.

**Lesson:** Spring Boot manages transitive dependency versions through its parent POM — upgrading it patches multiple bundled libraries at once.

---

## Failure 20 — Trivy — Disk Quota Exceeded Downloading Java DB

**Error:**
```
oci download error: write /tmp/trivy-xxxx/oci-download-xxxx/javadb.tar.gz: disk quota exceeded
```

**Approach:** Checked `df -h /tmp`, found the tmpfs partition only 450MB, insufficient for the ~870MB Java DB.

**Root Cause:** Trivy writes temp download files to `/tmp` regardless of `--cache-dir` setting.

**Fix:** Remounted `/tmp` with more size, redirected cache dir to home directory:
```bash
sudo mount -o remount,size=2G /tmp
export TRIVY_CACHE_DIR=/home/ubuntu/.trivy-cache
export TMPDIR=/home/ubuntu/.trivy-tmp
```

**Lesson:** Small cloud instances often have tiny tmpfs `/tmp` partitions — remount larger or redirect tool temp dirs elsewhere.

---

## Failure 21 — Trivy — Vulnerability Remediation Verified

**Result:**
```
Report Summary
Total 0 vulnerabilities (alpine: 0, jar: 0)
```

**Approach:** After each fix round, re-ran the exact same trivy scan command to verify rather than assume.

**Lesson:** Security scanning is iterative: scan, fix, rescan, repeat until clean — never assume a fix worked without proof.

---

## Failure 22 — Trivy — Jackson-Databind Vulnerabilities After Spring Boot Upgrade

**Error:**
```
Total: 2 (HIGH: 2, CRITICAL: 0)
jackson-databind CVE-2026-54512, CVE-2026-54513
```

**Approach:** Read the Trivy report to identify the exact library and fixed version needed.

**Root Cause:** `jackson-databind` 2.21.2 bundled by the current Spring Boot version had 2 known HIGH CVEs.

**Fix:** Added explicit `jackson-bom.version` property override in pom.xml to force version 2.21.4.

**Lesson:** Even after upgrading a parent framework, individual bundled libraries can still lag — override specific versions when needed.

---

## Failure 23 — GitLab CI — Trivy Image Entrypoint Conflict

**Error:**
```
FATAL Fatal error unknown command "sh" for "trivy"
Use "trivy [command] --help" for more information about a command.
```

**Approach:** Investigated the `aquasec/trivy:latest` image definition, found it sets `ENTRYPOINT ["trivy"]`.

**Root Cause:** Every command GitLab tried to run was being prefixed with `trivy` automatically, turning even a plain echo into an invalid subcommand.

**Fix:** Added `entrypoint: [""]` under the image definition in `.gitlab-ci.yml`.
```yaml
image:
  name: aquasec/trivy:latest
  entrypoint: [""]
```

**Lesson:** When a CI job image has a hardcoded ENTRYPOINT, override it with an empty entrypoint or every script line becomes malformed.

---

## Failure 24 — GitLab CI — YAML Indentation Broke Job Structure

**Error:** `trivy-scan` job's `script` and `artifacts` keys not recognized under the job (silent misconfiguration, no clear error message).

**Approach:** Compared exact leading whitespace of every key character by character against a known-working job.

**Root Cause:** `script` and `artifacts` keys had 1 space instead of the required 2 spaces to be recognized as children of the job key.

**Fix:** Corrected indentation to a consistent 2 spaces for every key belonging directly to a job.

**Lesson:** YAML has zero tolerance for inconsistent indentation — validate in GitLab Pipeline Editor before pushing.

---

## Failure 25 — GitLab CI — Trivy Report Never Generated Due to Command Order

**Error:**
```
WARNING: trivy-report.json: no matching files. Ensure that the artifact path
is relative to the working directory
ERROR: No files to upload
```

**Approach:** Reviewed the script execution order — noticed the `--exit-code 1` scan command ran and failed BEFORE the JSON report-saving command had a chance to run.

**Root Cause:** The strict scan (exit-code 1) was placed first and failed the job immediately on finding vulnerabilities, so the subsequent JSON report generation command never executed.

**Fix:** Reordered the script — generate the JSON report first with `--exit-code 0` (always succeeds), THEN run the strict `--exit-code 1` scan afterward.

**Lesson:** When one command in a script sequence can fail and stop the job, place non-critical reporting commands before it, not after.

---

## Failure 26 — Jenkins — Trivy Disk Space Exhausted Inside Workspace

**Error:**
```
write /var/lib/jenkins/workspace/ecommerce-product-service/.trivy-tmp/getter2116341408/archive:
no space left on device
```

**Approach:** Ran `df -h` (86% full, 16GB of 19GB used), `du -sh` on Jenkins workspace and Docker directories to find the biggest consumers.

**Root Cause:** `TRIVY_CACHE_DIR` was pointed inside the Jenkins workspace itself, which had accumulated old build artifacts, combined with unpruned Docker images.

**Fix:**
```bash
docker system prune -a -f
sudo find /var/lib/jenkins/jobs -name "*.log" -mtime +7 -delete
```
Changed the Trivy cache directory to the stable `/home/ubuntu/.trivy-cache` path outside the workspace.

**Lesson:** CI workspace directories should never be used for large persistent caches — point them to a stable directory outside the workspace.

---

## Failure 27 — Jenkins Health Check Failed — Same Sleep Timing Issue

**Error:**
```
sleep 20 curl -f http://localhost:8081/actuator/health || exit 1 — connection reset
script returned exit code 1
```

**Approach:** Same investigation as Failure 9 — checked actual Spring Boot startup time via container logs.

**Root Cause:** Jenkins deploy stage also used only 20 seconds sleep before the health check, insufficient for the 52-second Spring Boot startup.

**Fix:** Increased sleep to 60 seconds in the Jenkinsfile Health Check stage.

**Lesson:** The same root cause (Spring Boot startup time) surfaced independently in two different pipelines — a reminder to apply a fix everywhere it applies, not just where it was first found.

---

## Failure 28 — kubectl Not Installed on Windows

**Error:**
```
bash: kubectl: command not found
```

**Approach:** Verified absence with `kubectl version --client` before attempting any EKS work.

**Root Cause:** kubectl was never installed on the Windows machine being used for cluster management.

**Fix:** Downloaded `kubectl.exe` directly, placed it in a folder, added that folder to PATH via `.bashrc`.

**Lesson:** Always verify required CLI tools are installed and on PATH before starting cloud infrastructure work.

---

## Failure 29 — AWS Credentials Invalid (InvalidClientTokenId)

**Error:**
```
An error occurred (InvalidClientTokenId) when calling the GetCallerIdentity
operation: The security token included in the request is invalid.
```

**Approach:** Instead of assuming the credentials file was wrong, investigated WHERE AWS CLI was actually reading credentials from.
```bash
aws configure list
```
Output showed `Type: env` for both `access_key` and `secret_key` — proof that stale environment variables were overriding the correct, freshly-configured credentials file.

**Root Cause:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables (holding an old/invalid key) were set in the terminal session, and environment variables always take priority over the `~/.aws/credentials` file in AWS CLI's credential resolution order.

**Fix:**
```bash
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
aws configure list        # confirmed Type changed to "shared-credentials-file"
aws sts get-caller-identity   # confirmed success
```
Also corrected the configured region from `ap-south-1` to `ap-south-2`.

**Lesson:** When a tool has multiple possible configuration sources with a defined priority order, always identify which source is actually active (`aws configure list`) before changing anything — otherwise you can "fix" the wrong place repeatedly and see no change.

---

## Summary

| # | Category | Failure |
|---|----------|---------|
| 1 | Local Environment | Docker Desktop install failed on Windows |
| 2 | Jenkins | Installation failed on Ubuntu 26.04 |
| 3 | Jenkins | Executor scheduling — disk/RAM/swap |
| 4 | AWS/Docker | Disk full during image build |
| 5 | Java/Maven | Release version 17 not supported |
| 6 | Jenkins/Java | Jenkins broke after system Java change |
| 7 | GitLab CI | YAML invalid — zero jobs |
| 8 | GitLab CI | SSH permission denied |
| 9 | GitLab CI | Health check connection reset |
| 10 | GitHub Actions | Wrong directory path |
| 11 | SonarCloud | Field injection flagged |
| 12 | SonarCloud | Entity exposed in REST API |
| 13 | Java | Constructor name typo |
| 14 | SonarCloud | Project not found (GitHub Actions) |
| 15 | SonarCloud | Missing compiled classes |
| 16 | SonarCloud | Quality Gate failed (coverage/duplication) |
| 17 | GitHub Actions | Backslash continuation error |
| 18 | Trivy | apt-key command not found |
| 19 | Trivy | 33 vulnerabilities found |
| 20 | Trivy | Disk quota exceeded (Java DB) |
| 21 | Trivy | Zero vulnerabilities achieved |
| 22 | Trivy | Jackson-databind vulnerabilities |
| 23 | GitLab CI | Trivy entrypoint conflict |
| 24 | GitLab CI | YAML indentation error |
| 25 | GitLab CI | Trivy report generation order |
| 26 | Jenkins | Trivy disk space in workspace |
| 27 | Jenkins | Health check sleep timing |
| 28 | Local Environment | kubectl not installed |
| 29 | AWS CLI | InvalidClientTokenId (env var override) |

**Total: 29 real failures faced, investigated, and resolved.**
