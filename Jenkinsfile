pipeline {
    agent any

    environment {
        DOCKER_HUB_USER    = 'iamdaasari27'
        IMAGE_NAME         = 'product-service'
        DOCKER_CREDENTIALS = 'dockerhub-credentials'
        GITHUB_CREDENTIALS = 'github-credentials'
        EC2_IP             = 'YOUR_EC2_PUBLIC_IP'
	JAVA_HOME          = '/usr/lib/jvm/java-17-openjdk-amd64'
    }

    tools {
        maven 'Maven'
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo '===== Stage 1: Pulling code from GitHub ====='
                checkout scm
            }
        }

        stage('Clean') {
            steps {
                echo '===== Stage 2: Cleaning previous build files ====='
                dir('app/product-service') {
                    sh 'mvn clean'
                }
            }
            post {
                success {
                    echo 'Clean successful! Fresh build starting.'
                }
                failure {
                    echo 'Clean failed! Check file permissions on server.'
                }
            }
        }

        stage('Validate') {
            steps {
                echo '===== Stage 3: Validating pom.xml ====='
                dir('app/product-service') {
                    sh 'mvn validate'
                }
            }
            post {
                success {
                    echo 'Validation passed! pom.xml is correct.'
                }
                failure {
                    echo 'Validation failed! Check pom.xml for errors.'
                }
            }
        }

        stage('Compile') {
            steps {
                echo '===== Stage 4: Compiling Java code ====='
                dir('app/product-service') {
                    sh 'mvn compile'
                }
            }
            post {
                success {
                    echo 'Compilation successful!'
                }
                failure {
                    echo 'Compilation failed! Check for syntax errors.'
                }
            }
        }

        stage('Unit Tests') {
            steps {
                echo '===== Stage 5: Running Unit Tests ====='
                dir('app/product-service') {
                    sh 'mvn test'
                }
            }
            post {
                always {
                    junit 'app/product-service/target/surefire-reports/*.xml'
                }
                success {
                    echo 'All tests passed!'
                }
                failure {
                    echo 'Tests failed! Fix tests before proceeding.'
                }
            }
        }

        stage('SonarCloud Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonarcloud-token',
                                        variable: 'SONAR_TOKEN')]) {
                    sh '''
                        echo "===== SonarCloud Code Quality Analysis ====="
			cd app/product-service
                        mvn clean compile sonar:sonar \
                            -Dsonar.projectKey=iam-daasari_devops-ecommerce-project \
                            -Dsonar.organization=iam-daasari \
                            -Dsonar.host.url=https://sonarcloud.io \
                            -Dsonar.login=${SONAR_TOKEN}
                        echo "===== SonarCloud Analysis Complete! ====="
                    '''
                }
            }
            post {
                success {
                    echo 'Code quality check PASSED!'
                }
                failure {
                    echo 'Code quality issues found! Check SonarCloud dashboard.'
                }
            }
        }

        stage('Package') {
            steps {
                echo '===== Stage 6: Creating JAR file ====='
                dir('app/product-service') {
                    sh 'mvn package -DskipTests'
                }
            }
            post {
                success {
                    echo 'JAR created successfully!'
                }
                failure {
                    echo 'Packaging failed! Check pom.xml.'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '===== Stage 7: Building Docker Image ====='
                dir('app/product-service') {
                    sh """
                        docker build -t ${DOCKER_HUB_USER}/${IMAGE_NAME}:${BUILD_NUMBER} .
                        docker tag ${DOCKER_HUB_USER}/${IMAGE_NAME}:${BUILD_NUMBER} \
                                   ${DOCKER_HUB_USER}/${IMAGE_NAME}:latest
                    """
                }
            }
            post {
                success {
                    echo 'Docker image built successfully!'
                }
                failure {
                    echo 'Docker build failed! Check Dockerfile.'
                }
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                    echo "===== Trivy Security Scan ====="
                    export TMPDIR=$WORKSPACE/.trivy-tmp
                    export TRIVY_CACHE_DIR=$WORKSPACE/.trivy-cache
                    mkdir -p $TMPDIR $TRIVY_CACHE_DIR

                    trivy image \
                        --exit-code 1 \
                        --severity CRITICAL,HIGH \
                        --ignore-unfixed \
                        --no-progress \
                        --scanners vuln \
                        --cache-dir $TRIVY_CACHE_DIR \
                        --format table \
                        ${DOCKER_HUB_USER}/${IMAGE_NAME}:${BUILD_NUMBER}

                    echo "===== Trivy Scan PASSED! Image is secure! ====="
                '''
            }
            post {
                always {
                    sh '''
                        export TMPDIR=$WORKSPACE/.trivy-tmp
                        export TRIVY_CACHE_DIR=$WORKSPACE/.trivy-cache
                        trivy image \
                            --exit-code 1 \
                            --severity CRITICAL,HIGH \
                            --ignore-unfixed \
                            --scanners vuln \
                            --cache-dir $TRIVY_CACHE_DIR \
                            --format json \
                            --output trivy-report-${BUILD_NUMBER}.json \
                            ${DOCKER_HUB_USER}/${IMAGE_NAME}:${BUILD_NUMBER} || true
                        echo "Trivy JSON report saved!"
                    '''
                }
                success {
                    echo 'Security scan PASSED! No CRITICAL/HIGH vulnerabilities found!'
                }
                failure {
                    echo 'Security scan FAILED! Fix vulnerabilities before deploying!'
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo '===== Stage 8: Pushing to DockerHub ====='
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin
                        docker push ${DOCKER_HUB_USER}/${IMAGE_NAME}:${BUILD_NUMBER}
                        docker push ${DOCKER_HUB_USER}/${IMAGE_NAME}:latest
                    """
                }
            }
            post {
                success {
                    echo 'Image pushed to DockerHub successfully!'
                }
                failure {
                    echo 'DockerHub push failed! Check credentials.'
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                echo '===== Stage 9: Deploying to AWS EC2 ====='
                sh """
                    docker stop product-service || true
                    docker rm product-service || true
                    docker run -d \
                        --name product-service \
                        -p 8081:8081 \
                        --restart unless-stopped \
                        ${DOCKER_HUB_USER}/${IMAGE_NAME}:${BUILD_NUMBER}
                """
            }
            post {
                success {
                    echo 'Application deployed successfully!'
                }
                failure {
                    echo 'Deployment failed! Check Docker logs.'
                }
            }
        }

        stage('Health Check') {
            steps {
                echo '===== Stage 10: Verifying Deployment ====='
                sh """
                    sleep 20
                    curl -f http://localhost:8081/actuator/health || exit 1
                    echo "Application is healthy and running!"
                """
            }
            post {
                success {
                    echo 'Health check passed! App is live!'
                }
                failure {
                    echo 'Health check failed! App not responding.'
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build #${BUILD_NUMBER} completed! App is live at http://${EC2_IP}:8081"
        }
        failure {
            echo "❌ Build #${BUILD_NUMBER} FAILED! Check which stage failed above."
        }
        always {
            sh 'docker system prune -f || true'
        }
    }
}
