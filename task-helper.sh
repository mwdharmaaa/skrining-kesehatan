#!/usr/bin/env bash
set -euo pipefail

# task-helper.sh - Local Task-Driven Development (TSKDD) Helper for Agentic Workflow
# Enforces offline, fast, file-based task tracking in tasks/ with tasks/CURRENT.md pointer.

get_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

get_tasks_dir() {
  local root
  root="$(get_repo_root)"
  echo "${root}/tasks"
}

init_tasks() {
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"
  mkdir -p "$tasks_dir"

  local current_file="${tasks_dir}/CURRENT.md"
  if [[ ! -f "$current_file" ]]; then
    cat <<EOF > "$current_file"
task: none
status: idle
EOF
    echo "[*] Initialized ${current_file}"
  fi
  echo "[OK] Task directory ready at: ${tasks_dir}"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | sed -E 's/^-+|-+$//g' | cut -c 1-50
}

find_task_file() {
  local query="$1"
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"

  # Direct file path
  if [[ -f "$query" ]]; then
    echo "$query"
    return 0
  fi
  if [[ -f "${tasks_dir}/${query}" ]]; then
    echo "${tasks_dir}/${query}"
    return 0
  fi

  # Number lookup (e.g. 1, 01, 001)
  local formatted_id
  if [[ "$query" =~ ^[0-9]+$ ]]; then
    printf -v formatted_id "%03d" "$((10#$query))"
    local match
    match="$(find "$tasks_dir" -maxdepth 1 -name "${formatted_id}-*.md" | head -n 1)"
    if [[ -n "$match" && -f "$match" ]]; then
      echo "$match"
      return 0
    fi
  fi

  # Slug lookup
  local slug_match
  slug_match="$(find "$tasks_dir" -maxdepth 1 -name "*${query}*.md" | head -n 1)"
  if [[ -n "$slug_match" && -f "$slug_match" ]]; then
    echo "$slug_match"
    return 0
  fi

  return 1
}

create_task() {
  local title="${1:-}"
  local type="${2:-feature}"
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"
  init_tasks >/dev/null

  if [[ -z "$title" ]]; then
    echo "Error: Task title is required." >&2
    echo "Usage: $0 new \"<title>\" [type]" >&2
    exit 1
  fi

  # Find next sequential ID
  local max_id=0
  for f in "${tasks_dir}"/[0-9][0-9][0-9]-*.md; do
    if [[ -f "$f" ]]; then
      local base
      base="$(basename "$f")"
      local num="${base%%-*}"
      if [[ "$num" =~ ^[0-9]+$ ]]; then
        local val=$((10#$num))
        if (( val > max_id )); then
          max_id=$val
        fi
      fi
    fi
  done

  local next_val=$((max_id + 1))
  local next_id
  printf -v next_id "%03d" "$next_val"

  local slug
  slug="$(slugify "$title")"
  if [[ -z "$slug" ]]; then
    slug="task"
  fi

  local filename="${next_id}-${slug}.md"
  local target_path="${tasks_dir}/${filename}"
  local today
  today="$(date +%Y-%m-%d)"

  local type_title
  type_title="$(echo "${type:0:1}" | tr '[:lower:]' '[:upper:]')${type:1}"

  cat <<EOF > "$target_path"
---
id: "${next_id}"
title: "${title}"
type: "${type}"
status: "todo"
created_at: "${today}"
updated_at: "${today}"
---

# [${type_title}] ${title}

## Description
${title}

## Acceptance Criteria
- [ ] Implementation completed
- [ ] Tests green (zero mock theater)
- [ ] Documentation updated

## Context / Notes
- Target files: 
- Dependencies: None
EOF

  echo "[OK] Created task: ${target_path}"
}

start_task() {
  local query="${1:-}"
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"
  init_tasks >/dev/null

  if [[ -z "$query" ]]; then
    echo "Error: Task ID, slug, or file path required." >&2
    echo "Usage: $0 start <id|filename>" >&2
    exit 1
  fi

  local target_file
  if ! target_file="$(find_task_file "$query")"; then
    echo "Error: Task not found for query '${query}' in ${tasks_dir}" >&2
    exit 1
  fi

  local base_name
  base_name="$(basename "$target_file")"
  local today
  today="$(date +%Y-%m-%d)"
  local now
  now="$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)"

  # Update status to in-progress in task frontmatter
  sed -i -E 's/^status: ".*"/status: "in-progress"/' "$target_file"
  sed -i -E "s/^updated_at: \".*\"/updated_at: \"${today}\"/" "$target_file"

  # Update CURRENT.md
  cat <<EOF > "${tasks_dir}/CURRENT.md"
task: ${base_name}
status: in-progress
started_at: ${now}
EOF

  echo "[OK] Task started: ${base_name}"
  echo "     tasks/CURRENT.md locked to ${base_name}"
}

show_current() {
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"
  local current_file="${tasks_dir}/CURRENT.md"

  if [[ ! -f "$current_file" ]]; then
    echo "No active task (tasks/CURRENT.md not initialized)."
    return 0
  fi

  local active_task
  active_task="$(grep -E '^task:' "$current_file" | awk '{print $2}' || echo 'none')"
  local active_status
  active_status="$(grep -E '^status:' "$current_file" | awk '{print $2}' || echo 'idle')"

  if [[ "$active_task" == "none" || "$active_status" == "idle" ]]; then
    echo "No task currently in progress (idle)."
    return 0
  fi

  local target_file="${tasks_dir}/${active_task}"
  echo "=== Current Active Task ==="
  cat "$current_file"
  echo "---------------------------"

  if [[ -f "$target_file" ]]; then
    echo "File: ${target_file}"
    echo "Remaining Criteria:"
    local unchecked
    unchecked="$(grep -E '^\- \[ \]' "$target_file" || true)"
    if [[ -n "$unchecked" ]]; then
      echo "$unchecked"
    else
      echo "  (All criteria checked or none defined)"
    fi
  else
    echo "Warning: Target task file ${target_file} not found."
  fi
}

done_task() {
  local query="${1:-}"
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"

  local target_file=""
  if [[ -n "$query" ]]; then
    if ! target_file="$(find_task_file "$query")"; then
      echo "Error: Task not found for query '${query}' in ${tasks_dir}" >&2
      exit 1
    fi
  else
    local current_file="${tasks_dir}/CURRENT.md"
    if [[ -f "$current_file" ]]; then
      local active_task
      active_task="$(grep -E '^task:' "$current_file" | awk '{print $2}' || echo 'none')"
      if [[ "$active_task" != "none" && -f "${tasks_dir}/${active_task}" ]]; then
        target_file="${tasks_dir}/${active_task}"
      fi
    fi
  fi

  if [[ -z "$target_file" || ! -f "$target_file" ]]; then
    echo "Error: No active task or specified task to mark done." >&2
    echo "Usage: $0 done [id|filename]" >&2
    exit 1
  fi

  local base_name
  base_name="$(basename "$target_file")"
  local task_id
  task_id="$(grep -E '^id:' "$target_file" | head -n 1 | sed -E 's/id: "([^"]+)"/\1/' | tr -d ' ')"
  local today
  today="$(date +%Y-%m-%d)"

  # Check for unchecked criteria
  local unchecked
  unchecked="$(grep -E '^\- \[ \]' "$target_file" || true)"
  if [[ -n "$unchecked" ]]; then
    echo "[!] Notice: Completing task with unchecked items in ${base_name}:"
    echo "$unchecked"
  fi

  # Update status to done
  sed -i -E 's/^status: ".*"/status: "done"/' "$target_file"
  sed -i -E "s/^updated_at: \".*\"/updated_at: \"${today}\"/" "$target_file"

  # Reset CURRENT.md
  cat <<EOF > "${tasks_dir}/CURRENT.md"
task: none
status: idle
EOF

  echo "[OK] Task marked done: ${base_name}"
  echo "     tasks/CURRENT.md reset to idle."
  echo "     Suggested commit: type(scope): complete description (closes task-${task_id})"
}

list_tasks() {
  local tasks_dir
  tasks_dir="$(get_tasks_dir)"

  if [[ ! -d "$tasks_dir" ]]; then
    echo "No tasks directory found at ${tasks_dir}"
    return 0
  fi

  local found=0
  printf "%-5s | %-12s | %-10s | %s\n" "ID" "STATUS" "TYPE" "TITLE"
  printf -- "------+--------------+------------+--------------------------------------\n"

  for f in "${tasks_dir}"/[0-9][0-9][0-9]-*.md; do
    if [[ -f "$f" ]]; then
      found=1
      local id
      id="$(grep -E '^id:' "$f" | head -n 1 | sed -E 's/id: "([^"]+)"/\1/' | tr -d ' ')"
      local st
      st="$(grep -E '^status:' "$f" | head -n 1 | sed -E 's/status: "([^"]+)"/\1/' | tr -d ' ')"
      local tp
      tp="$(grep -E '^type:' "$f" | head -n 1 | sed -E 's/type: "([^"]+)"/\1/' | tr -d ' ')"
      local ttl
      ttl="$(grep -E '^title:' "$f" | head -n 1 | sed -E 's/title: "([^"]+)"/\1/')"
      printf "%-5s | %-12s | %-10s | %s\n" "${id:-???}" "${st:-unknown}" "${tp:-misc}" "${ttl:-Untitled}"
    fi
  done

  if (( found == 0 )); then
    echo "No task files found in ${tasks_dir}"
  fi
}

case "${1:-}" in
  init)
    init_tasks
    ;;
  new|create)
    shift
    create_task "$@"
    ;;
  start)
    shift
    start_task "$@"
    ;;
  current)
    show_current
    ;;
  done|close)
    shift
    done_task "$@"
    ;;
  list|ls)
    list_tasks
    ;;
  *)
    cat <<EOF
Usage: $0 <command> [arguments]

Commands:
  init                     Initialize tasks/ directory and tasks/CURRENT.md
  new "<title>" [type]     Create a new numbered task file (tasks/00X-<slug>.md)
  start <id|filename>      Lock task as in-progress and update tasks/CURRENT.md
  current                  Show active task details and unchecked criteria
  done [id|filename]       Mark task done and reset tasks/CURRENT.md to idle
  list                     List all tasks with ID, status, type, and title
EOF
    exit 1
    ;;
esac
