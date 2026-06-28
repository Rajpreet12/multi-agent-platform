module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  vpc_cidr = "10.10.0.0/16"

  public_subnet_1_cidr = "10.10.1.0/24"
  public_subnet_2_cidr = "10.10.2.0/24"

  private_subnet_1_cidr = "10.10.11.0/24"
  private_subnet_2_cidr = "10.10.12.0/24"
}


module "eks" {
  source = "../../modules/eks"

  project_name = var.project_name
  environment  = var.environment

  private_subnet_ids = module.vpc.private_subnet_ids

  eks_version = "1.33"

  node_instance_type = "t3.medium"

  desired_size = 2
  min_size     = 1
  max_size     = 3
}