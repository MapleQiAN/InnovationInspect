# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a documentation-only repository for a **Challenge Cup (挑战杯) competition project** focused on an event information system (赛事信息化系统). It currently contains technical requirements documents in Chinese.

## Repository Contents



## Notes

There is no source code, build system, or test suite in this repository yet. When code is added, update this file with build commands, architecture details, and development workflow.

## LLM 提供商配置

系统通过 `LLM_MODEL` 环境变量支持任意 AI 提供商，格式为 `<provider>/<model>`：

| 提供商 | 示例值 | 所需 Key |
|--------|--------|----------|
| Anthropic | `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/gpt-4o` | `OPENAI_API_KEY` |
| Google | `gemini/gemini-1.5-pro` | `GEMINI_API_KEY` |
| Mistral | `mistral/mistral-large-latest` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek/deepseek-chat` | `DEEPSEEK_API_KEY` |
| Azure OpenAI | `azure/<deployment>` | `AZURE_API_KEY` + `AZURE_API_BASE` |

完整提供商列表见 [litellm 文档](https://docs.litellm.ai/docs/providers)。
