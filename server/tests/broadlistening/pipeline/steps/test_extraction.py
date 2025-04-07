import pytest
import sys
import os
import json
from unittest.mock import patch, MagicMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..')))
from broadlistening.pipeline.steps.extraction import extract_arguments_batch, extract_batch


@pytest.fixture
def mock_request_to_chat_openai():
    with patch('broadlistening.pipeline.steps.extraction.request_to_chat_openai') as mock:
        yield mock


@pytest.fixture
def mock_extract_arguments():
    with patch('broadlistening.pipeline.steps.extraction.extract_arguments') as mock:
        yield mock


@pytest.fixture
def mock_extract_arguments_batch():
    with patch('broadlistening.pipeline.steps.extraction.extract_arguments_batch') as mock:
        yield mock


def test_extract_arguments_batch_success(mock_request_to_chat_openai):
    """Test successful batch extraction of arguments"""
    mock_response = {
        "1": ["argument1", "argument2"],
        "2": ["argument3"]
    }
    mock_request_to_chat_openai.return_value = mock_response
    
    input_text = "- 1: First comment\n- 2: Second comment"
    comment_indices = [0, 1]
    prompt = "Test prompt"
    model = "gpt-4"
    
    result = extract_arguments_batch(input_text, comment_indices, prompt, model)
    
    assert result == {"1": ["argument1", "argument2"], "2": ["argument3"]}
    
    mock_request_to_chat_openai.assert_called_once_with(
        messages=[
            {"role": "system", "content": "Test prompt"},
            {"role": "user", "content": "- 1: First comment\n- 2: Second comment"}
        ],
        model="gpt-4",
        is_json=True
    )


def test_extract_arguments_batch_error(mock_request_to_chat_openai):
    """Test error handling in batch extraction"""
    mock_request_to_chat_openai.side_effect = Exception("API error")
    
    input_text = "- 1: First comment\n- 2: Second comment"
    comment_indices = [0, 1]
    prompt = "Test prompt"
    model = "gpt-4"
    
    result = extract_arguments_batch(input_text, comment_indices, prompt, model)
    
    assert result == {}


def test_extract_arguments_batch_invalid_response(mock_request_to_chat_openai):
    """Test handling of invalid response format"""
    mock_request_to_chat_openai.return_value = ["This is not a dict"]
    
    input_text = "- 1: First comment\n- 2: Second comment"
    comment_indices = [0, 1]
    prompt = "Test prompt"
    model = "gpt-4"
    
    result = extract_arguments_batch(input_text, comment_indices, prompt, model)
    
    assert result == {}


def test_extract_batch_success(mock_extract_arguments_batch):
    """Test successful batch extraction with multiple comments"""
    mock_extract_arguments_batch.return_value = {
        "1": ["argument1", "argument2"],
        "2": ["argument3"]
    }
    
    batch = ["First comment", "Second comment", "Third comment"]
    prompt = "Test prompt"
    model = "gpt-4"
    workers = 2
    
    result = extract_batch(batch, prompt, model, workers)
    
    assert result == [["argument1", "argument2"], ["argument3"], []]
    
    assert mock_extract_arguments_batch.called


def test_extract_batch_with_fallback(mock_extract_arguments_batch, mock_extract_arguments):
    """Test batch extraction with fallback to individual processing"""
    mock_extract_arguments_batch.side_effect = Exception("Batch processing error")
    
    mock_extract_arguments.side_effect = [
        ["argument1"], 
        ["argument2"], 
        ["argument3"]
    ]
    
    batch = ["First comment", "Second comment", "Third comment"]
    prompt = "Test prompt"
    model = "gpt-4"
    workers = 3
    
    result = extract_batch(batch, prompt, model, workers)
    
    assert result == [["argument1"], ["argument2"], ["argument3"]]
    
    assert mock_extract_arguments.call_count == 3


def test_extract_batch_with_partial_results(mock_extract_arguments_batch):
    """Test batch extraction with partial results"""
    mock_extract_arguments_batch.return_value = {
        "1": ["argument1"],
        "3": ["argument3"]
    }
    
    batch = ["First comment", "Second comment", "Third comment"]
    prompt = "Test prompt"
    model = "gpt-4"
    workers = 3
    
    result = extract_batch(batch, prompt, model, workers)
    
    assert result == [["argument1"], [], ["argument3"]]
