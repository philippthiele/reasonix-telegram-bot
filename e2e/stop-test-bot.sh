#!/usr/bin/env bash
# Stops the test bot, the Reasonix instances it started and the stand's proxies.
#
# POSIX counterpart of stop-test-bot.ps1. Deliberately narrow: it only touches
# processes that provably belong to the test setup.
#   - Reasonix: the instances recorded in the stand's own
#     .tmp/e2e/home/run/reasonix-instances.json. Another bot's instances are untouched.
#   - Bot: node processes whose pid appears in a log file name inside
#     .tmp/e2e/home/logs. A production bot started from the same dist/ writes to
#     a different home, so it is not matched.
#   - Fault proxy: the node process named in .tmp/e2e/fault-proxy/proxy.pid,
#     only if its command line runs fault-proxy.mjs.
#   - Forward proxy: the node process named in .tmp/e2e/forward-proxy/proxy.pid,
#     only if its command line runs forward-proxy.mjs.
#
# Usage:
#   ./e2e/stop-test-bot.sh

set -uo pipefail

# Git Bash / MSYS cannot see native Windows processes: ps, kill and lsof only
# know about the emulation layer, so this script would report "nothing running"
# while the bot and its Reasonix instances are very much alive. Refuse instead of lying.
case "$(uname -s 2>/dev/null || echo unknown)" in
  MINGW*|MSYS*|CYGWIN*)
    echo "This script cannot see Windows processes and would report a false clean." >&2
    echo "Use the PowerShell version instead:  .\\e2e\\stop-test-bot.ps1" >&2
    exit 2
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(dirname "$script_dir")"
test_home="$project_root/.tmp/e2e/home"
logs_dir="$test_home/logs"
proxy_pid_file="$project_root/.tmp/e2e/fault-proxy/proxy.pid"
forward_pid_file="$project_root/.tmp/e2e/forward-proxy/proxy.pid"

# --- Reasonix instances ---------------------------------------------------

# Ports the stand's bot actually started, from the instance state it persisted.
# Anything else listening on 47610-47809 belongs to another bot and is untouched.
instances_file="$test_home/run/reasonix-instances.json"
ports=""
if [ -f "$instances_file" ]; then
  ports="$(node -e 'process.stdout.write(Object.values(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))).map((v)=>String(v.port)).join(" "))' "$instances_file" 2>/dev/null || true)"
fi

if [ -z "$ports" ]; then
  echo "No Reasonix instances recorded in $instances_file"
else
  echo "Reasonix ports from instance state: $ports"
fi

find_listener() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n 1
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | awk -v p=":$1\$" '$4 ~ p' | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -n 1
  fi
}

for port in $ports; do
  inst_pid="$(find_listener "$port")"
  if [ -n "${inst_pid:-}" ]; then
    echo "  stopping reasonix serve on $port: PID $inst_pid"
    kill "$inst_pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$inst_pid" 2>/dev/null || break
      sleep 0.3
    done
    if kill -0 "$inst_pid" 2>/dev/null; then
      echo "  still alive, forcing"
      kill -9 "$inst_pid" 2>/dev/null || true
    fi
    echo "  stopped"
  else
    echo "  nothing listening on $port"
  fi
done

# --- Test bot -------------------------------------------------------------

stopped=0
if [ -d "$logs_dir" ]; then
  for log in "$logs_dir"/bot-*.log; do
    [ -e "$log" ] || continue
    bot_pid="$(basename "$log" | sed -n 's/.*_\([0-9][0-9]*\)\.log$/\1/p')"
    [ -n "$bot_pid" ] || continue
    kill -0 "$bot_pid" 2>/dev/null || continue

    args="$(ps -p "$bot_pid" -o args= 2>/dev/null || true)"
    case "$args" in
      *dist/index.js*|*dist\\index.js*) ;;
      *) continue ;;
    esac

    echo "  stopping bot: PID $bot_pid"
    kill "$bot_pid" 2>/dev/null || true
    stopped=$((stopped + 1))
  done
fi

[ "$stopped" -eq 0 ] && echo "  no running test bot found"

# --- Fault proxy and forward proxy ----------------------------------------

# Usage: stop_test_proxy <pid file> <script name> <label>
stop_test_proxy() {
  local proxy_stopped=0 proxy_pid args
  if [ -f "$1" ]; then
    proxy_pid="$(tr -d '[:space:]' < "$1")"
    if [ -n "$proxy_pid" ] && kill -0 "$proxy_pid" 2>/dev/null; then
      args="$(ps -p "$proxy_pid" -o args= 2>/dev/null || true)"
      case "$args" in
        *"$2"*)
          echo "  stopping $3: PID $proxy_pid"
          kill "$proxy_pid" 2>/dev/null || true
          proxy_stopped=1
          echo "  stopped"
          ;;
      esac
    fi
    rm -f "$1"
  fi

  [ "$proxy_stopped" -eq 0 ] && echo "  no $3 running"
  return 0
}

stop_test_proxy "$proxy_pid_file" fault-proxy.mjs "fault proxy"
stop_test_proxy "$forward_pid_file" forward-proxy.mjs "forward proxy"

# --- Result ---------------------------------------------------------------

sleep 0.5
echo
still_listening=""
for port in $ports; do
  [ -n "$(find_listener "$port")" ] && still_listening="$still_listening $port"
done
if [ -n "$still_listening" ]; then
  echo "WARNING: port(s)$still_listening still in use."
else
  echo "Instance ports are free."
fi
