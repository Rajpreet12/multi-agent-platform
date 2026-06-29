pipeline {
  agent any

  parameters {
    string(name: 'AWS_REGION', defaultValue: 'us-east-1', description: 'AWS region for ECR and EKS')
    string(name: 'AWS_ACCOUNT_ID', defaultValue: '903584666644', description: 'AWS account ID')
    string(name: 'ECR_REPOSITORY', defaultValue: 'multi-agent-backend', description: 'ECR repository name')
    string(name: 'CLUSTER_NAME', defaultValue: 'multi-agent-test-cluster', description: 'EKS cluster name')
    string(name: 'NAMESPACE', defaultValue: 'multi-agent', description: 'Kubernetes namespace')
  }

  environment {
    AWS_REGION      = "${params.AWS_REGION}"
    AWS_ACCOUNT_ID  = "${params.AWS_ACCOUNT_ID}"
    ECR_REPO        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${params.ECR_REPOSITORY}"
    IMAGE_TAG       = "${BUILD_NUMBER}"
    NAMESPACE       = "${params.NAMESPACE}"
    CLUSTER_NAME    = "${params.CLUSTER_NAME}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test Backend') {
      steps {
        sh '''
          cd app/backend
          npm install
          node -e "const pkg=require('./package.json'); console.log('Backend package ready:', pkg.name)"
        '''
      }
    }

    stage('Build Backend') {
      steps {
        sh '''
          cd app/backend
          npm install
        '''
      }
    }

    stage('Build and Push to ECR') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'aws-credentials',
            usernameVariable: 'AWS_ACCESS_KEY_ID',
            passwordVariable: 'AWS_SECRET_ACCESS_KEY'
          )
        ]) {
          sh '''
            export AWS_DEFAULT_REGION="${AWS_REGION}"
            aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REPO}"
            docker build -t "${ECR_REPO}:${IMAGE_TAG}" -t "${ECR_REPO}:latest" ./app/backend
            docker push "${ECR_REPO}:${IMAGE_TAG}"
            docker push "${ECR_REPO}:latest"
          '''
        }
      }
    }

    stage('Deploy to EKS') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'aws-credentials',
            usernameVariable: 'AWS_ACCESS_KEY_ID',
            passwordVariable: 'AWS_SECRET_ACCESS_KEY'
          )
        ]) {
          sh '''
            export AWS_DEFAULT_REGION="${AWS_REGION}"
            aws eks update-kubeconfig --region "${AWS_REGION}" --name "${CLUSTER_NAME}"
            kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
            kubectl apply -f monitoring
            kubectl apply -f k8s/base
            kubectl set image deployment/multi-agent-backend backend="${ECR_REPO}:${IMAGE_TAG}" -n "${NAMESPACE}"
            kubectl rollout status deployment/multi-agent-backend -n "${NAMESPACE}"
            kubectl rollout status deployment/prometheus -n monitoring
            kubectl rollout status deployment/grafana -n monitoring
          '''
        }
      }
    }
  }

  post {
    failure {
      echo 'Pipeline failed — rolling back deployment'
      withCredentials([
        usernamePassword(
          credentialsId: 'aws-credentials',
          usernameVariable: 'AWS_ACCESS_KEY_ID',
          passwordVariable: 'AWS_SECRET_ACCESS_KEY'
        )
      ]) {
        sh '''
          export AWS_DEFAULT_REGION="${AWS_REGION}"
          kubectl rollout undo deployment/multi-agent-backend -n "${NAMESPACE}"
        '''
      }
    }
  }
}
