resource "aws_iam_role" "eks_cluster_role" {
  name = "${var.project_name}-${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"

        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}


resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role = aws_iam_role.eks_cluster_role.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}


resource "aws_eks_cluster" "main" {

  name = "${var.project_name}-${var.environment}-eks"

  role_arn = aws_iam_role.eks_cluster_role.arn

  version = var.eks_version


  vpc_config {

    subnet_ids = var.private_subnet_ids

    endpoint_private_access = true

    endpoint_public_access = true
  }


  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}



# EKS Worker Node IAM Role

resource "aws_iam_role" "node_role" {

  name = "${var.project_name}-${var.environment}-node-role"


  assume_role_policy = jsonencode({

    Version = "2012-10-17"

    Statement = [
      {
        Action = "sts:AssumeRole"

        Effect = "Allow"

        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}



# Worker Node Policy

resource "aws_iam_role_policy_attachment" "worker_node_policy" {

  role = aws_iam_role.node_role.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}



# CNI Networking Policy

resource "aws_iam_role_policy_attachment" "cni_policy" {

  role = aws_iam_role.node_role.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}



# ECR Pull Access

resource "aws_iam_role_policy_attachment" "ecr_policy" {

  role = aws_iam_role.node_role.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}



# Managed Node Group

resource "aws_eks_node_group" "main" {

  cluster_name = aws_eks_cluster.main.name

  node_group_name = "${var.project_name}-${var.environment}-nodes"

  node_role_arn = aws_iam_role.node_role.arn

  subnet_ids = var.private_subnet_ids


  instance_types = [
    var.node_instance_type
  ]


  scaling_config {

    desired_size = var.desired_size

    min_size = var.min_size

    max_size = var.max_size
  }


  depends_on = [

    aws_iam_role_policy_attachment.worker_node_policy,

    aws_iam_role_policy_attachment.cni_policy,

    aws_iam_role_policy_attachment.ecr_policy

  ]
}