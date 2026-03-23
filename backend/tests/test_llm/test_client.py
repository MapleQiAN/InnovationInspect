import pytest
from unittest.mock import patch, MagicMock
from app.llm.client import LLMClient


def make_mock_response(text: str):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = text
    return mock_response


@patch("app.llm.client.litellm.completion")
def test_chat_returns_text(mock_completion):
    mock_completion.return_value = make_mock_response("hello world")
    client = LLMClient(model="openai/gpt-4o-mini", api_keys={})
    result = client.chat([{"role": "user", "content": "hi"}], max_tokens=100)
    assert result == "hello world"
    mock_completion.assert_called_once()


@patch("app.llm.client.litellm.completion")
def test_chat_passes_correct_model(mock_completion):
    mock_completion.return_value = make_mock_response("ok")
    client = LLMClient(model="gemini/gemini-1.5-flash", api_keys={"gemini_api_key": "test"})
    client.chat([{"role": "user", "content": "test"}], max_tokens=50)
    call_kwargs = mock_completion.call_args
    assert call_kwargs.kwargs["model"] == "gemini/gemini-1.5-flash"


@patch("app.llm.client.litellm.completion")
def test_chat_empty_message_raises(mock_completion):
    client = LLMClient(model="openai/gpt-4o", api_keys={})
    with pytest.raises(ValueError, match="messages cannot be empty"):
        client.chat([], max_tokens=100)
