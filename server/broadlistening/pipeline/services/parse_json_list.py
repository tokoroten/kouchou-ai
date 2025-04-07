import json
import re

COMMA_AND_SPACE_AND_RIGHT_BRACKET = re.compile(r",\s*(\])")

TEST = """Response was: 以下は、提供されたテキストの要約です。

[
  "創作文化は…",
  "生成AIは無断で特徴を抽出…",
  "多くのクリエイターは…",
  "生成AIによるコンテンツは…"
]"""


def parse_response(response):
    """
    指定されたレスポンス文字列からJSON配列またはオブジェクトを安全に抽出し、パースする。

    JSON配列の場合は従来通り配列として返す。
    JSON オブジェクトの場合はオブジェクトとして返す。

    以下はdoctestによるテスト例。

    >>> parse_response('以下は...\\n```json\\n["a", "b"]\\n```')
    ['a', 'b']

    >>> parse_response('Response was: なんか説明\\n[ "x", "y" ] さらに何か')
    ['x', 'y']

    >>> parse_response('No json here')
    Traceback (most recent call last):
    ...
    RuntimeError: JSON list not found

    >>> parse_response('["a", "b" , ]')
    ['a', 'b']

    >>> parse_response(TEST)
    ['創作文化は…', '生成AIは無断で特徴を抽出…', '多くのクリエイターは…', '生成AIによるコンテンツは…']

    >>> parse_response('"a"')
    ['a']

    >>> parse_response('{"id1": ["a", "b"], "id2": ["c"]}')
    {'id1': ['a', 'b'], 'id2': ['c']}
    """
    try:
        obj = json.loads(response)
        if isinstance(obj, str):
            obj = [obj]
        if isinstance(obj, list):
            items = [a.strip() for a in obj if a.strip()]
            return items
        if isinstance(obj, dict):
            return obj
        return obj
    except Exception:
        # 不要なコードブロックを除去
        response = response.replace("```json", "").replace("```", "")

        if "{" in response and "}" in response:
            match = re.search(r"\{.*?\}", response, flags=re.DOTALL)
            if match:
                json_str = match.group(0)
                try:
                    obj = json.loads(json_str)
                    return obj
                except Exception:
                    pass  # 配列形式を試す

        match = re.search(r"\[.*?\]", response, flags=re.DOTALL)
        if not match:
            # JSON配列が見つからなければraise
            raise RuntimeError("JSON list not found") from None

        json_str = match.group(0)
        # ", ]" のようなパターンを "]" に置換
        json_str = COMMA_AND_SPACE_AND_RIGHT_BRACKET.sub(r"\1", json_str)

        obj = json.loads(json_str)  # ここでも例外の場合はそのまま外に投げる
        if isinstance(obj, str):
            obj = [obj]
        try:
            items = [a.strip() for a in obj]
        except Exception as e:
            print("Error:", e)
            print("Input was:", json_str)
            print("Response was:", response)
            print("JSON was:", obj)
            print("skip")
            items = []
        return items


if __name__ == "__main__":
    import doctest

    doctest.testmod(verbose=True)
