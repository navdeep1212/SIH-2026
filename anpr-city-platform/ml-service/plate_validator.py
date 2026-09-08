import re

def normalize_plate(raw_text):
    """
    Normalizes and validates an Indian vehicle plate number.
    Conservatively corrects common OCR confusions only when the structure is clear.

    Args:
        raw_text (str): The raw OCR output.

    Returns:
        tuple: (corrected_text, was_corrected, matches_format)
    """
    if not raw_text:
        return "", False, False

    # 1. Uppercase and remove non-alphanumeric characters
    text = raw_text.upper()
    text = re.sub(r'[^A-Z0-9]', '', text)

    if not text:
        return "", False, False

    # Only apply position-aware corrections if the length is within a reasonable range (7-10)
    if not (7 <= len(text) <= 10):
        pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'
        return text, False, bool(re.match(pattern, text))

    original_cleaned = text
    corrected = list(text)
    was_corrected = False

    # 2. Type mismatch check to avoid aggressive corrections on ambiguous OCR
    # Standard: [State(2L)][RTO(2D)][Series(1-3L)][Number(4D)]
    mismatches = 0
    # State
    for i in range(0, 2):
        if i < len(text) and text[i].isdigit():
            mismatches += 1
    # RTO
    for i in range(2, 4):
        if i < len(text) and text[i].isalpha():
            mismatches += 1
    # Number (last 4)
    for i in range(len(text) - 4, len(text)):
        if i >= 0 and text[i].isalpha():
            mismatches += 1

    # Conservative Threshold: Only correct if 2 or fewer characters are "wrong type"
    if mismatches <= 2:
        # Correct State (indices 0, 1) -> Letters
        for i in [0, 1]:
            if i < len(corrected):
                char = corrected[i]
                if char.isdigit():
                    mapping = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
                    if char in mapping:
                        corrected[i] = mapping[char]
                        was_corrected = True

        # Correct RTO (indices 2, 3) -> Digits
        for i in [2, 3]:
            if i < len(corrected):
                char = corrected[i]
                if char.isalpha():
                    mapping = {'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8'}
                    if char in mapping:
                        corrected[i] = mapping[char]
                        was_corrected = True

        # Correct Vehicle Number (last 4 indices) -> Digits
        for i in range(len(corrected) - 4, len(corrected)):
            if i >= 0:
                char = corrected[i]
                if char.isalpha():
                    mapping = {'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8'}
                    if char in mapping:
                        corrected[i] = mapping[char]
                        was_corrected = True

    corrected_text = "".join(corrected)

    # 3. Format Validation
    pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'
    matches_format = bool(re.match(pattern, corrected_text))

    return corrected_text, was_corrected, matches_format

def test_validator():
    test_cases = [
        # Successful correction
        ("DL 01 AB 1234", "DL01AB1234", True),
        ("DL O1 AB 1234", "DL01AB1234", True),
        ("DL 01 AB 123B", "DL01AB1238", True),
        ("DL 01 AB 123S", "DL01AB1235", True),
        ("DL 01 AB 123Z", "DL01AB1232", True),
        # Already correct
        ("MH 12 JK 5678", "MH12JK5678", False),
        # Incomplete/Ambiguous (should NOT be force corrected)
        ("ABC 123", "ABC123", False),
        ("1234567", "1234567", False),
        ("DL 01 1234", "DL011234", False), # missing series
        ("DL 01 ABCD 1234", "DL01ABCD1234", False), # too many series chars
    ]

    print(f"{'Input':<20} | {'Result':<15} | {'Corrected?':<12} | {'Matches?':<10}")
    print("-" * 65)
    for raw, expected, _ in test_cases:
        res, corr, match = normalize_plate(raw)
        print(f"{raw:<20} | {res:<15} | {str(corr):<12} | {str(match):<10}")

if __name__ == "__main__":
    test_validator()
