#!/bin/bash

# MetaBloom Development Session Logger
# Captures all terminal output from npm run dev and saves to timestamped log files

# Configuration
LOG_DIR="dev-session-logs"
SESSION_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SESSION_LOG="$LOG_DIR/dev-session-$SESSION_TIMESTAMP.log"
LATEST_LOG="$LOG_DIR/latest-session.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log_with_timestamp() {
    while IFS= read -r line; do
        timestamp=$(date '+%Y-%m-%d %H:%M:%S.%3N')
        echo "[$timestamp] $line" | tee -a "$SESSION_LOG"
    done
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] Session ended. Logs saved to:${NC}"
    echo -e "${GREEN}  📁 Session log: $SESSION_LOG${NC}"
    echo -e "${GREEN}  🔗 Latest link: $LATEST_LOG${NC}"
    
    # Calculate session duration and log size
    if [ -f "$SESSION_LOG" ]; then
        log_size=$(du -h "$SESSION_LOG" | cut -f1)
        line_count=$(wc -l < "$SESSION_LOG")
        echo -e "${BLUE}  📊 Log size: $log_size ($line_count lines)${NC}"
    fi
    
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Print header
echo -e "${GREEN}🚀 MetaBloom Development Session Logger${NC}"
echo -e "${BLUE}📅 Session started: $(date)${NC}"
echo -e "${BLUE}📁 Logging to: $SESSION_LOG${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop logging and view summary${NC}"
echo -e "${YELLOW}💡 All terminal output will be captured with timestamps${NC}"
echo ""

# Create symlink to latest session
ln -sf "dev-session-$SESSION_TIMESTAMP.log" "$LATEST_LOG"

# Add session header to log file
{
    echo "=========================================="
    echo "MetaBloom Development Session Log"
    echo "Session ID: $SESSION_TIMESTAMP"
    echo "Started: $(date)"
    echo "Command: npm run dev"
    echo "Working Directory: $(pwd)"
    echo "Node Version: $(node --version 2>/dev/null || echo 'Not found')"
    echo "NPM Version: $(npm --version 2>/dev/null || echo 'Not found')"
    echo "=========================================="
    echo ""
} >> "$SESSION_LOG"

# Change to MetaBloom directory if we're not already there
if [ ! -f "package.json" ]; then
    if [ -d "MetaBloom" ]; then
        echo -e "${YELLOW}📂 Changing to MetaBloom directory...${NC}"
        cd MetaBloom
    else
        echo -e "${RED}❌ Error: package.json not found and MetaBloom directory doesn't exist${NC}"
        echo -e "${RED}   Please run this script from the project root or MetaBloom directory${NC}"
        exit 1
    fi
fi

# Verify package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found in current directory${NC}"
    echo -e "${RED}   Current directory: $(pwd)${NC}"
    exit 1
fi

# Start npm run dev and capture all output
echo -e "${GREEN}🔄 Starting npm run dev...${NC}"
echo ""

# Use script command to capture all output including colors and control characters
# The 2>&1 ensures both stdout and stderr are captured
npm run dev 2>&1 | log_with_timestamp

# This line should never be reached due to the trap, but just in case
cleanup
