#!/bin/sh
set -eu

wait_for_ollama() {
  base_url="$1"
  echo "Waiting for Ollama to start: $base_url"
  while ! curl -s "$base_url/api/tags" > /dev/null; do
    sleep 1
  done
}

model_exists() {
  base_url="$1"
  model_name="$2"
  tags_json=$(curl -s "$base_url/api/tags")
  printf '%s' "$tags_json" | grep -Fq "\"name\":\"$model_name\""
}

pull_model() {
  base_url="$1"
  model_name="$2"
  if model_exists "$base_url" "$model_name"; then
    echo "Model already exists, skipping: $model_name"
    return 0
  fi

  echo "Pulling model: $model_name -> $base_url"
  curl -s -X POST "$base_url/api/pull" -H 'Content-Type: application/json' \
    --data-binary "$(printf '{"name":"%s"}' "$model_name")"
}

CPU_URL="${OLLAMA_CPU_URL:-http://ai-engine-cpu:11434}"
GPU_URL="${OLLAMA_CHAT_URL:-http://ai-engine-gpu:11434}"

wait_for_ollama "$CPU_URL"
wait_for_ollama "$GPU_URL"

echo 'Pulling CPU-side models (intent + embedding)...'
pull_model "$CPU_URL" "${OLLAMA_INTENT_MODEL:-qwen2.5:0.5b-instruct}"
pull_model "$CPU_URL" "${OLLAMA_EMBEDDING_MODEL:-hf.co/doof-ferb/AITeamVN-Vietnamese_Embedding-gguf:Q8_0}"

echo 'Pulling GPU-side model (chat)...'
pull_model "$GPU_URL" "${OLLAMA_CHAT_MODEL:-qwen2.5:3b-instruct}"

echo 'All models pulled successfully!'