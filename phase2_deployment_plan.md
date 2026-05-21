# Complete AWS Console Deployment Plan (Corrected & Cost-Optimized)

Total Cost Estimate: ~$8-10 for 5 days
Time Required: 3-4 hours (first time)

## ✅ Pre-Deployment Checklist (Print This)

**Before Day 11:**
- [x] Code pushed to GitHub
- [x] Health check endpoint added and tested
- [x] GitHub repo is public (or token created)
- [x] Architecture diagram finalized

**Day 11:**
- [ ] VPC created with 2 public + 2 private subnets
- [ ] 1 NAT Gateway in public subnet
- [ ] Security groups created (ALB-SG, EC2-SG)

**Day 12:**
- [ ] IAM role created with DynamoDB, S3, SNS, CloudWatch policies
- [ ] EC2 launched with User Data script (GitHub username updated!)
- [ ] AMI created from configured instance
- [ ] Master instance STOPPED

**Day 13:**
- [ ] Target Group created (port 80, health check `/api/health`)
- [ ] ALB created in public subnets
- [ ] Launch Template created from AMI
- [ ] Auto Scaling Group created (min:2, desired:2)
- [ ] ALB URL tested and working
- [ ] ASG Desired capacity set to 0 (instances stopped)

**Day 14:**
- [ ] CloudFront distribution created
- [ ] `/api/*` cache behavior added (CachingDisabled)
- [ ] CloudFront URL tested
- [ ] Instances stopped again

**Day 15:**
- [ ] Full demo scenario tested
- [ ] Demo video recorded
- [ ] README updated with CloudFront URL
- [ ] Submitted via Google Form
- [ ] Instances stopped (Desired capacity = 0)

---

## 🆓 Day 0: Pre-Deployment Checklist (FREE — Do This First)
Before touching AWS Console:

✅ **Push all code to GitHub** (Completed)
✅ **Add health check route to backend** (Completed, route `/api/health` already exists in `server/src/index.js`)
✅ **Verify your GitHub repo is public** (Completed)

---

## 💵 Day 11: VPC & Networking (~$1.08/day for NAT Gateway)
*Time: 20 minutes | Cost: NAT Gateway starts charging $0.045/hr immediately*

### Step 1.1: Create VPC with Wizard
1. Go to VPC Dashboard → Click **Create VPC**
2. Select **VPC and more** (this creates everything at once)
3. Fill in:
   - **Name tag auto-generation:** `MiniJira`
   - **IPv4 CIDR block:** `10.0.0.0/16`
   - **Number of Availability Zones:** `2`
   - **Number of public subnets:** `2`
   - **Number of private subnets:** `2`
   - **NAT gateways:** `In 1 AZ` (Cost optimization)
   - **VPC endpoints:** `None`
   - **DNS hostnames:** `Enable`
   - **DNS resolution:** `Enable`
4. Click **Create VPC**
5. Wait 2-3 minutes for creation

> [!WARNING]  
> **COST ALERT:** NAT Gateway is now running and charging $0.045/hr ($1.08/day). This is unavoidable if EC2 needs internet access from private subnets.

### Step 1.2: Create Security Groups
**A. ALB Security Group**
1. Go to EC2 → Security Groups → **Create security group**
2. Fill in:
   - **Name:** `MiniJira-ALB-SG`
   - **Description:** Allow HTTP/HTTPS from internet
   - **VPC:** Select `MiniJira-vpc`
3. Inbound rules → Add 2 rules:
   - Type: `HTTP`, Source: `0.0.0.0/0` (Anywhere)
   - Type: `HTTPS`, Source: `0.0.0.0/0` (Anywhere)
4. Click **Create security group**

**B. EC2 Security Group**
1. **Create security group** again
2. Fill in:
   - **Name:** `MiniJira-EC2-SG`
   - **Description:** Allow traffic from ALB only
   - **VPC:** Select `MiniJira-vpc`
3. Inbound rules → Add 2 rules:
   - Type: `HTTP` (Port 80), Source: `Custom` -> Select `MiniJira-ALB-SG`
   - Type: `SSH` (Port 22), Source: `My IP` (For debugging)
4. Click **Create security group**

---

## 💵 Day 12: IAM Role + EC2 Setup (~$1.58 total for day)
*Time: 2 hours*

### Step 2.1: Create IAM Role for EC2 (FREE)
1. Go to IAM → Roles → **Create role**
2. Trusted entity type: `AWS service` → Use case: `EC2`
3. Add permissions — Search and select these 4 policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonSNSFullAccess`
   - `CloudWatchFullAccess`
4. Role name: `MiniJira-EC2-Role`
5. Click **Create role**

### Step 2.2: Launch First EC2 Instance
1. Go to EC2 → Instances → **Launch instances**
2. **Name:** `MiniJira-Master` (we'll create an AMI from this)
3. **AMI:** Ubuntu Server 22.04 LTS (HVM), SSD Volume Type (64-bit x86)
4. **Instance type:** `t2.micro` (Free tier eligible)
5. **Key pair:** Create a new RSA `.pem` key pair named `minijira-key`.
6. **Network settings:**
   - **VPC:** `MiniJira-vpc`
   - **Subnet:** `MiniJira-subnet-private1-eu-north-1a` (PRIVATE SUBNET)
   - **Auto-assign public IP:** `Disable`
   - **Firewall:** Select existing → `MiniJira-EC2-SG`
7. **Storage:** 8 GB gp3
8. **Advanced details:**
   - **IAM instance profile:** `MiniJira-EC2-Role`
   - **User data:** Paste the complete setup script provided below.

> [!IMPORTANT]  
> **CRITICAL:** In the User Data script, replace `YOUR_GITHUB_USERNAME` with your actual GitHub username!

```bash
#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
set -e

echo "========================================="
echo "Mini-Jira EC2 Setup Script"
echo "========================================="

# Update system
echo "[1/8] Updating system packages..."
sudo apt-get update -y

# Install Node.js 20
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Nginx
echo "[3/8] Installing PM2 and Nginx..."
sudo npm install -g pm2
sudo apt-get install -y nginx git

# Clone repository (REPLACE WITH YOUR GITHUB USERNAME)
echo "[4/8] Cloning repository..."
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/YOUR_GITHUB_USERNAME/Mini-JiraAWS.git
cd Mini-JiraAWS

# Install backend dependencies
echo "[5/8] Installing backend dependencies..."
cd /home/ubuntu/Mini-JiraAWS/server
sudo -u ubuntu npm install

# Install frontend dependencies and build
echo "[6/8] Building React app..."
cd /home/ubuntu/Mini-JiraAWS/client
sudo -u ubuntu npm install
sudo -u ubuntu npm run build

# Configure Nginx
echo "[7/8] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/minijira > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    # Serve React app
    location / {
        root /home/ubuntu/Mini-JiraAWS/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API to Express on port 5000
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/minijira /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create production .env
echo "[8/8] Creating production environment file..."
cd /home/ubuntu/Mini-JiraAWS/server
sudo -u ubuntu tee .env > /dev/null <<'ENV'
NODE_ENV=production
PORT=5000
AWS_REGION=eu-north-1

COGNITO_USER_POOL_ID=eu-north-1_C45oxGuvC
COGNITO_APP_CLIENT_ID=106ml793cd0askj277l5gsjr02

DYNAMODB_USERS_TABLE=MiniJira_Users
DYNAMODB_TEAMS_TABLE=MiniJira_Teams
DYNAMODB_PROJECTS_TABLE=MiniJira_Projects
DYNAMODB_TASKS_TABLE=MiniJira_Tasks
DYNAMODB_COMMENTS_TABLE=MiniJira_Comments
DYNAMODB_AUDIT_TABLE=MiniJira_AuditLog

S3_ORIGINALS_BUCKET=minijira-originals-ali-605856
S3_RESIZED_BUCKET=minijira-resized-ali-605856

SNS_TASK_ASSIGNMENT_TOPIC_ARN=arn:aws:sns:eu-north-1:722867460649:MiniJira-TaskAssignment

SQS_ASSIGNMENT_QUEUE_URL=https://sqs.eu-north-1.amazonaws.com/722867460649/MiniJira-AssignmentQueue
ENV

# Start backend with PM2
echo "Starting backend..."
cd /home/ubuntu/Mini-JiraAWS/server
sudo -u ubuntu pm2 start src/index.js --name minijira
sudo -u ubuntu pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo -u ubuntu pm2 save

echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
```

### Step 2.3: Verify EC2 is Working
Check User Data Logs (Easier):
1. Go to EC2 → Select your instance → **Actions** → **Monitor and troubleshoot** → **Get system log**
2. Scroll to bottom, look for: `✅ Setup Complete!`

### Step 2.4: Create AMI from Master Instance
1. Select `MiniJira-Master` instance.
2. Actions → Image and templates → **Create image**
3. Name: `MiniJira-AMI-v1`
4. Click **Create image** and wait for Status = Available.

### Step 2.5: STOP the Master Instance (Save Money)
1. Select `MiniJira-Master` instance.
2. Instance state → **Stop instance**

---

## Day 13: ALB + Auto Scaling (~$1.58 for day)

### Step 3.1: Create Target Group
1. Go to EC2 → Target Groups → **Create target group**
2. Choose a target type: `Instances`
3. Name: `MiniJira-TG`
4. Protocol: `HTTP` on Port `80`
5. VPC: `MiniJira-vpc`
6. Health checks: Protocol `HTTP`, Path `/api/health`
7. Click **Create target group**

### Step 3.2: Create Application Load Balancer
1. Go to EC2 → Load Balancers → **Create Application Load Balancer**
2. Scheme: `Internet-facing`
3. Network mapping: Select `MiniJira-vpc` and map both AZs to the **PUBLIC subnets**.
4. Security groups: Select ONLY `MiniJira-ALB-SG`.
5. Listeners: HTTP Port 80 routing to `MiniJira-TG`.
6. Click **Create load balancer**

### Step 3.3: Create Launch Template
1. Go to EC2 → Launch Templates → **Create launch template**
2. Name: `MiniJira-LT`
3. AMI: Select `MiniJira-AMI-v1`
4. Instance type: `t2.micro`
5. Key pair: Select `minijira-key`
6. Security groups: Select `MiniJira-EC2-SG`
7. Advanced Details: IAM instance profile: `MiniJira-EC2-Role`
8. Click **Create launch template**

### Step 3.4: Create Auto Scaling Group
1. Go to EC2 → Auto Scaling Groups → **Create Auto Scaling group**
2. Name: `MiniJira-ASG`, Select template: `MiniJira-LT`
3. VPC: `MiniJira-vpc`, Subnets: Select both **PRIVATE** subnets.
4. Load balancing: Attach to existing Target Group `MiniJira-TG`.
5. Health checks: Check `ELB`.
6. Capacity: Desired: 2, Min: 2, Max: 4.
7. Tags: Key `Name`, Value `MiniJira-ASG-Instance`.
8. Click **Create Auto Scaling group**.

### Step 3.5: Test and Stop
1. Copy your ALB DNS name and test in browser. It should load the app and API.
2. Once working, edit ASG: Set Desired capacity to `0` to stop instances and save money.

---

## Day 14: CloudFront Distribution (FREE)

### Step 4.1: Create Distribution
1. Go to CloudFront → **Create distribution**
2. Origin domain: Select your ALB.
3. Protocol: `HTTP only`.
4. Default cache behavior:
   - Viewer protocol: `Redirect HTTP to HTTPS`
   - Allowed HTTP methods: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
   - Cache policy: `CachingOptimized`
   - Origin request policy: `AllViewer`
5. Click **Create distribution**

### Step 4.2: Fix Cache Behavior for API Calls
1. Click your distribution → Behaviors tab → **Create behavior**
2. Path pattern: `/api/*`
3. Origin: Select ALB.
4. Viewer protocol: `Redirect HTTP to HTTPS`
5. Allowed methods: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
6. Cache policy: `Managed-CachingDisabled`
7. Origin request policy: `AllViewer`
8. Save. Ensure `/api/*` is at the top (Priority 0).

---

## Day 15: Final Testing & Submission

1. **Start instances:** Set ASG Desired capacity to 2.
2. **Test:** Navigate to CloudFront URL, log in, create tasks.
3. **Record Demo.**
4. **Stop instances:** Set ASG Desired capacity to 0 after grading submission. Keep NAT running.
