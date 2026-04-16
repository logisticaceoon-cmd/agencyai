#!/bin/bash

API_URL="${1:-http://localhost:3000/api/cowork}"
API_KEY="${2:-sk_agencyai_demo_local_testing_key_12345}"

echo "Testing AgencyAI Cowork API"
echo "URL: $API_URL"
echo "================================"

PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS - $name (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo "  FAIL - $name (expected $expected, got $actual)"
    FAIL=$((FAIL+1))
  fi
}

# 1. Health check (no auth)
echo ""
echo "1. Health Check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
check "GET /health" "200" "$STATUS"

# 2. Tasks without auth (should 401)
echo ""
echo "2. Auth Required"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/tasks")
check "GET /tasks sin auth" "401" "$STATUS"

# 3. Tasks with invalid key (should 401)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/tasks" -H "Authorization: Bearer invalid_key")
check "GET /tasks invalid key" "401" "$STATUS"

# 4. List tasks
echo ""
echo "3. List Tasks"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/tasks" -H "Authorization: Bearer $API_KEY")
check "GET /tasks" "200" "$STATUS"

# 5. Create task
echo ""
echo "4. Create Task"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task from script","priority":"high"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)
check "POST /tasks" "201" "$STATUS"

# Extract task ID for next tests
TASK_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TASK_ID" ]; then
  # 6. Get task by ID
  echo ""
  echo "5. Get Task Detail"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/tasks/$TASK_ID" -H "Authorization: Bearer $API_KEY")
  check "GET /tasks/$TASK_ID" "200" "$STATUS"

  # 7. Update task
  echo ""
  echo "6. Update Task"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_URL/tasks/$TASK_ID" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"title":"Updated test task","priority":"medium"}')
  check "PATCH /tasks/$TASK_ID" "200" "$STATUS"

  # 8. Complete task
  echo ""
  echo "7. Complete Task"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/tasks/$TASK_ID" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"action":"complete"}')
  check "POST /tasks/$TASK_ID complete" "200" "$STATUS"
else
  echo "  SKIP - No task ID to test detail/update/complete"
fi

# 9. Create task without title (should 400)
echo ""
echo "8. Validation"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"description":"no title"}')
check "POST /tasks sin title" "400" "$STATUS"

# 10. List clients
echo ""
echo "9. List Clients"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/clients" -H "Authorization: Bearer $API_KEY")
check "GET /clients" "200" "$STATUS"

# 11. List projects
echo ""
echo "10. List Projects"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/projects" -H "Authorization: Bearer $API_KEY")
check "GET /projects" "200" "$STATUS"

# 12. List team
echo ""
echo "11. List Team"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/team" -H "Authorization: Bearer $API_KEY")
check "GET /team" "200" "$STATUS"

# Summary
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL TESTS PASSED"
else
  echo "SOME TESTS FAILED"
  exit 1
fi
