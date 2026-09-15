import re

# Comprehensive list of official Indian State & Union Territory codes + Bharat Series
INDIAN_STATES = {
    'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN',
    'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD',
    'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'OR', 'PB', 'PY',
    'RJ', 'SK', 'TN', 'TR', 'TS', 'UA', 'UK', 'UP', 'WB'
}

DIGIT_TO_LETTER = {
    '0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A',
    '5': 'S', '6': 'G', '7': 'T', '8': 'B'
}

LETTER_TO_DIGIT = {
    'O': '0', 'Q': '0', 'D': '0',
    'I': '1', 'L': '1', 'T': '1', 'J': '1',
    'Z': '2',
    'E': '3',
    'A': '4',
    'S': '5',
    'G': '6', 'B': '8'
}

def fix_digit(c: str, allow_4: bool = False) -> str:
    """Converts OCR letter confusion to digit."""
    if c.isdigit():
        return c
    if allow_4 and c in ('A', 'L', 'R', 'K', 'X'):
        return '4'
    return LETTER_TO_DIGIT.get(c, c)

def fix_letter(c: str) -> str:
    """Converts OCR digit confusion to letter."""
    if c.isalpha():
        return c
    return DIGIT_TO_LETTER.get(c, c)

def normalize_plate(raw_text: str):
    """
    State-anchored normalizer and validator for Indian vehicle registration plates.
    Corrects positional OCR ambiguities based on official Indian RTO standards.

    Args:
        raw_text (str): Raw OCR character string.

    Returns:
        tuple: (corrected_text, was_corrected, matches_format)
    """
    if not raw_text:
        return "", False, False

    # 1. Clean non-alphanumeric characters
    clean = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
    if len(clean) < 4:
        return clean, False, False

    was_corrected = False

    # 2. Check if a 2-line plate was read reversed (e.g. "E0263MH04" -> "MH04E0263")
    c0 = fix_letter(clean[0])
    c1 = fix_letter(clean[1])
    starts_with_state = clean[:2] in INDIAN_STATES or (c0 + c1) in INDIAN_STATES
    if not starts_with_state:
        for state in INDIAN_STATES:
            pos = clean.rfind(state)
            if pos >= 3 and pos + 2 <= len(clean):
                if pos + 2 < len(clean) and any(c.isdigit() or c in ('O', 'I', 'L', 'Z', 'S', 'B') for c in clean[pos+2:pos+4]):
                    clean = clean[pos:] + clean[:pos]
                    was_corrected = True
                    c0 = fix_letter(clean[0])
                    c1 = fix_letter(clean[1])
                    break

    # 3. Bharat Series check: YY BH #### XX (e.g. 21BH1234AA)
    bh_match = re.match(r'^([0-9]{2})([B8][H#])([0-9OIDLQ]{4})([A-Z0-9]{1,2})$', clean)
    if bh_match:
        yy = bh_match.group(1)
        num = "".join(LETTER_TO_DIGIT.get(c, c) for c in bh_match.group(3))
        ser = "".join(DIGIT_TO_LETTER.get(c, c) for c in bh_match.group(4))
        result = f"{yy}BH{num}{ser}"
        return result, True, True

    # 4. Standard Series: [State 2L][RTO 1-2D][Series 0-3L][Number 1-4D]
    cand_state = clean[:2]
    best_state = None

    if cand_state in INDIAN_STATES:
        best_state = cand_state
    elif (c0 + c1) in INDIAN_STATES:
        best_state = c0 + c1
        was_corrected = True
    else:
        # Anchored state prefix mapping
        if cand_state.startswith('K') or c0 == 'K':
            best_state = 'KA' if any(x in cand_state for x in ('A', '4', 'L')) else 'KL'
            was_corrected = True
        elif cand_state.startswith('M') or c0 == 'M':
            best_state = 'MH'
            was_corrected = True
        elif cand_state.startswith('D') or c0 == 'D':
            best_state = 'DL'
            was_corrected = True
        elif cand_state.startswith('W') or c0 == 'W':
            best_state = 'WB'
            was_corrected = True
        elif cand_state.startswith('T') or c0 == 'T':
            best_state = 'TN' if 'N' in cand_state else 'TS'
            was_corrected = True
        elif cand_state.startswith('G') or c0 == 'G':
            best_state = 'GJ' if 'J' in cand_state else 'GA'
            was_corrected = True
        elif cand_state.startswith('U') or c0 == 'U':
            best_state = 'UP' if 'P' in cand_state else 'UK'
            was_corrected = True
        elif cand_state.startswith('H') or c0 == 'H':
            best_state = 'HR' if 'R' in cand_state else 'HP'
            was_corrected = True
        elif cand_state.startswith('P') or c0 == 'P':
            best_state = 'PB'
            was_corrected = True
        elif cand_state.startswith('R') or c0 == 'R':
            best_state = 'RJ'
            was_corrected = True
        elif cand_state.startswith('C') or c0 == 'C':
            best_state = 'CH' if 'H' in cand_state else 'CG'
            was_corrected = True
        elif cand_state.startswith('A') or c0 == 'A':
            best_state = 'AP'
            was_corrected = True
        elif cand_state.startswith('J') or c0 == 'J':
            best_state = 'JH' if 'H' in cand_state else 'JK'
            was_corrected = True
        elif cand_state.startswith('B') or c0 == 'B':
            best_state = 'BR'
            was_corrected = True

    if best_state is not None and best_state in INDIAN_STATES:
        rem = clean[2:]
        # Extract last 1 to 4 characters as vehicle number digits
        end_digits = []
        i = len(rem) - 1
        while i >= 0 and len(end_digits) < 4:
            d = fix_digit(rem[i])
            if d.isdigit():
                end_digits.append(d)
                i -= 1
            else:
                break
        
        num = "".join(reversed(end_digits)) if end_digits else ""
        middle = rem[:i+1] if end_digits else rem

        # Extract RTO (1 or 2 digits) from start of middle
        rto_chars = []
        j = 0
        while j < len(middle) and len(rto_chars) < 2:
            d = fix_digit(middle[j], allow_4=True)
            if d.isdigit():
                rto_chars.append(d)
                j += 1
            else:
                break
        
        rto = "".join(rto_chars)
        series_raw = middle[j:]

        # Correct series characters to letters (e.g. 0 -> D, 8 -> B)
        series_chars = []
        for c in series_raw:
            if c in ('0', 'O', 'Q'):
                series_chars.append('D')
            else:
                fc = fix_letter(c)
                if fc.isalpha():
                    series_chars.append(fc)
        series = "".join(series_chars)

        if rto and num:
            rebuilt = f"{best_state}{rto}{series}{num}"
            pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$'
            is_valid = bool(re.match(pattern, rebuilt)) and (best_state in INDIAN_STATES)
            return rebuilt, True, is_valid

    # Strict Indian plate rejection if state is unverified
    return clean, was_corrected, False

def consensus_plate_readings(readings: list[tuple[str, float, bool]]) -> tuple[str, float, bool]:
    """
    Computes a consensus reading from multiple candidate OCR readings across
    video frames and image decomposition variants.
    
    Args:
        readings: list of tuples (plate_text, confidence, matches_format)
        
    Returns:
        tuple: (best_text, best_confidence, matches_format)
    """
    if not readings:
        return "UNREADABLE", 0.0, False

    valid = [(txt, float(conf), bool(m)) for (txt, conf, m) in readings if txt and txt != "UNREADABLE" and len(txt) >= 4]
    if not valid:
        return "UNREADABLE", 0.0, False

    matching = [r for r in valid if r[2]]
    if matching:
        # Group identical readings
        scores = {}
        for txt, conf, _ in matching:
            if txt not in scores:
                scores[txt] = {"confs": [], "count": 0}
            scores[txt]["confs"].append(conf)
            scores[txt]["count"] += 1

        ranked = []
        for txt, stats in scores.items():
            cnt = stats["count"]
            avg_c = float(sum(stats["confs"])) / cnt
            max_c = float(max(stats["confs"]))
            # Multi-confirmation bonus gives significant weight to readings verified across multiple frames
            vote_score = avg_c * (1.0 + 0.4 * (cnt - 1)) + max_c * 0.2
            ranked.append((vote_score, txt, max_c))

        ranked.sort(key=lambda x: x[0], reverse=True)
        winner_text = ranked[0][1]
        winner_conf = ranked[0][2]
        return winner_text, winner_conf, True

    # No format match found: pick highest confidence reading >= 0.20
    valid.sort(key=lambda r: (r[1], len(r[0])), reverse=True)
    best = valid[0]
    return best[0], best[1], False

def test_validator():
    test_cases = [
        ("KAL108159", "KA41D8159", True),
        ("KAL10 8159", "KA41D8159", True),
        ("KL1D8159", "KL108159", True),
        ("CHOICI7427", "CH01CI7427", True),
        ("CHOIcI727", "CH01C1727", True),
        ("MHO4 LD763", "MH04L0763", True),
        ("MH04 L01263", "MH04LD1263", True),
        ("LB1233 MH04", "MH04LB1233", True),
        ("MH09EG1510", "MH09EG1510", True),
        ("21BH1234AA", "21BH1234AA", True),
        ("DL 01 AB 1234", "DL01AB1234", True),
        ("DL 1C 1234", "DL1C1234", True),
        ("MH 04 263", "MH04263", True),
        ("KL1D8", "KL1D8", True),
        ("57XI", "57XI", False),
        ("TI0LZE", "TI0LZE", False),
    ]

    print(f"{'Input':<20} | {'Result':<15} | {'Valid?':<6}")
    print("-" * 46)
    for raw, expected, expected_val in test_cases:
        res, corr, val = normalize_plate(raw)
        print(f"{raw:<20} | {res:<15} | {str(val):<6}")

if __name__ == "__main__":
    test_validator()
