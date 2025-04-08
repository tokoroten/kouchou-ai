import os
import sys

import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

sys.modules["services"] = type("MockServices", (), {})
sys.modules["services.category_classification"] = type(
    "MockCategoryClassification", (), {"classify_args": lambda *args, **kwargs: None}
)
sys.modules["services.llm"] = type("MockLLM", (), {"request_to_chat_openai": lambda *args, **kwargs: None})

from broadlistening.pipeline.services.parse_json_list import parse_response  # noqa: E402


def test_parse_response_with_json_array():
    """Test parsing a valid JSON array"""
    response = '["item1", "item2", "item3"]'
    result = parse_response(response)
    assert result == ["item1", "item2", "item3"]


def test_parse_response_with_json_object():
    """Test parsing a valid JSON object with comment IDs as keys"""
    response = '{"1": ["item1", "item2"], "2": ["item3"]}'
    result = parse_response(response)
    assert result == {"1": ["item1", "item2"], "2": ["item3"]}


def test_parse_response_with_markdown_code_block():
    """Test parsing a JSON array inside a markdown code block"""
    response = '```json\n["item1", "item2"]\n```'
    result = parse_response(response)
    assert result == ["item1", "item2"]


def test_parse_response_with_text_and_json_array():
    """Test parsing a JSON array with surrounding text"""
    response = 'Here is the result:\n["item1", "item2"]\nEnd of result.'
    result = parse_response(response)
    assert result == ["item1", "item2"]


def test_parse_response_with_text_and_json_object():
    """Test parsing a JSON object with surrounding text"""
    response = 'Here is the result:\n{"1": ["item1"], "2": ["item2"]}\nEnd of result.'
    result = parse_response(response)
    assert result == {"1": ["item1"], "2": ["item2"]}


def test_parse_response_with_single_string():
    """Test parsing a single string value"""
    response = '"single_item"'
    result = parse_response(response)
    assert result == ["single_item"]


def test_parse_response_with_invalid_json():
    """Test parsing invalid JSON raises an error"""
    response = "This is not JSON"
    with pytest.raises(RuntimeError, match="JSON list not found"):
        parse_response(response)


def test_parse_response_with_trailing_comma():
    """Test parsing JSON with trailing comma"""
    response = '["item1", "item2", ]'
    result = parse_response(response)
    assert result == ["item1", "item2"]


def test_parse_response_with_empty_strings():
    """Test parsing JSON with empty strings are filtered out"""
    response = '["item1", "", "item2"]'
    result = parse_response(response)
    assert result == ["item1", "item2"]


def test_parse_response_with_nested_json_object():
    """Test parsing a nested JSON object"""
    response = '{"1": ["item1", "item2"], "2": ["item3", "item4"]}'
    result = parse_response(response)
    assert result == {"1": ["item1", "item2"], "2": ["item3", "item4"]}
