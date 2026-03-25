#!/bin/bash

# MetaBloom Development Log Analyzer
# Analyzes captured development session logs and provides insights

# Configuration
LOG_DIR="dev-session-logs"
LATEST_LOG="$LOG_DIR/latest-session.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Function to count and display pattern matches
count_pattern() {
    local pattern="$1"
    local description="$2"
    local log_file="$3"
    
    if [ -f "$log_file" ]; then
        local count=$(grep -c "$pattern" "$log_file" 2>/dev/null || echo "0")
        echo -e "${GREEN}$description:${NC} $count"
    fi
}

# Function to show recent entries with pattern
show_recent() {
    local pattern="$1"
    local description="$2"
    local log_file="$3"
    local limit="${4:-5}"
    
    echo -e "\n${YELLOW}Recent $description (last $limit):${NC}"
    if [ -f "$log_file" ]; then
        grep "$pattern" "$log_file" | tail -n "$limit" | while read -r line; do
            echo -e "${BLUE}  $line${NC}"
        done
    fi
}

# Check if log file exists
if [ "$1" ]; then
    LOG_FILE="$LOG_DIR/$1"
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${RED}❌ Error: Log file '$LOG_FILE' not found${NC}"
        exit 1
    fi
else
    LOG_FILE="$LATEST_LOG"
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${RED}❌ Error: No log file found. Run capture-dev-logs.sh first.${NC}"
        exit 1
    fi
fi

# Print analysis header
print_header "MetaBloom Development Log Analysis"
echo -e "${BLUE}📁 Analyzing: $LOG_FILE${NC}"
echo -e "${BLUE}📅 Analysis time: $(date)${NC}"

# Basic file statistics
if [ -f "$LOG_FILE" ]; then
    file_size=$(du -h "$LOG_FILE" | cut -f1)
    line_count=$(wc -l < "$LOG_FILE")
    echo -e "${GREEN}📊 File size: $file_size ($line_count lines)${NC}"
fi

# Session information
print_header "Session Overview"
if [ -f "$LOG_FILE" ]; then
    session_start=$(grep "Started:" "$LOG_FILE" | head -1)
    if [ "$session_start" ]; then
        echo -e "${GREEN}$session_start${NC}"
    fi
    
    # Check if session is still running
    if pgrep -f "npm run dev" > /dev/null; then
        echo -e "${GREEN}Status: ${YELLOW}🟡 Session currently running${NC}"
    else
        echo -e "${GREEN}Status: ${RED}🔴 Session ended${NC}"
    fi
fi

# AI Conversation Activity
print_header "AI Conversation Activity"
count_pattern "DEBUGGING CONVERSATION CONTEXT" "New AI conversations started" "$LOG_FILE"
count_pattern "🎭 Starting Hidden Sequential Streaming" "Streaming responses initiated" "$LOG_FILE"
count_pattern "🔧 Tool calls detected" "Function calls executed" "$LOG_FILE"
count_pattern "✅ Two-stage processing complete" "Successful AI processing" "$LOG_FILE"

# Function Call Analysis
print_header "Function Call Breakdown"
count_pattern "🔧 Executing function: buildDeck" "Deck building operations" "$LOG_FILE"
count_pattern "🔧 Executing function: decodeDeck" "Deck decoding operations" "$LOG_FILE"
count_pattern "🔧 Executing function: exploreCardsAST" "AST card searches" "$LOG_FILE"
count_pattern "🔧 Executing function: fetchCardMetadata" "Card metadata lookups" "$LOG_FILE"

# Database Activity
print_header "Database Activity"
count_pattern "🔍 Looking up.*card names" "Card name lookups" "$LOG_FILE"
count_pattern "🔍 Fetching metadata for.*cards" "Metadata fetch operations" "$LOG_FILE"
count_pattern "✅ AST Production:" "AST query executions" "$LOG_FILE"
count_pattern "🤖 Auto-detecting class" "Class auto-detection" "$LOG_FILE"

# Error Analysis
print_header "Error Analysis"
count_pattern "❌" "General errors" "$LOG_FILE"
count_pattern "🚨" "Critical errors" "$LOG_FILE"
count_pattern "⚠️" "Warnings" "$LOG_FILE"
count_pattern "JSON Parse Error" "JSON parsing issues" "$LOG_FILE"

# Performance Metrics
print_header "Performance Indicators"
count_pattern "💰 TOKEN SAVINGS" "Token optimizations" "$LOG_FILE"
count_pattern "⏱️ Query executed in" "Database query timings" "$LOG_FILE"
count_pattern "🎉.*completed successfully" "Successful completions" "$LOG_FILE"

# Recent Activity
print_header "Recent Activity"
show_recent "🔍 DEBUGGING CONVERSATION CONTEXT" "conversations" "$LOG_FILE" 3
show_recent "❌\|🚨" "errors/critical issues" "$LOG_FILE" 5
show_recent "✅.*successful" "successful operations" "$LOG_FILE" 3

# Log file suggestions
print_header "Available Commands"
echo -e "${YELLOW}View full log:${NC} less $LOG_FILE"
echo -e "${YELLOW}Follow live log:${NC} tail -f $LOG_FILE"
echo -e "${YELLOW}Search for pattern:${NC} grep 'pattern' $LOG_FILE"
echo -e "${YELLOW}View errors only:${NC} grep -E '❌|🚨|ERROR' $LOG_FILE"
echo -e "${YELLOW}View AI conversations:${NC} grep '🔍 DEBUGGING CONVERSATION CONTEXT' -A 3 $LOG_FILE"
echo -e "${YELLOW}View function calls:${NC} grep '🔧 Executing function' $LOG_FILE"

# List all available log files
print_header "Available Log Files"
if [ -d "$LOG_DIR" ]; then
    echo -e "${GREEN}Log files in $LOG_DIR:${NC}"
    ls -la "$LOG_DIR"/*.log 2>/dev/null | while read -r line; do
        echo -e "${BLUE}  $line${NC}"
    done
else
    echo -e "${YELLOW}No log directory found${NC}"
fi

echo -e "\n${GREEN}✅ Analysis complete!${NC}"
