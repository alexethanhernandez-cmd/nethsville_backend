"""AI progress summary.

Kung may ANTHROPIC_API_KEY, gagamit ng totoong AI (Anthropic).
Kung wala o pumalya ang tawag, gagamit ng offline rule-based na fallback
at **malinaw na naka-label** na hindi ito AI (source = 'offline').

Privacy: first name lang ng bata ang ipinapadala sa AI, hindi ang buong pangalan.
"""
from django.conf import settings

SYSTEM_PROMPT = (
    'You are a kindergarten teacher\'s assistant. Write a short, warm, factual progress '
    'summary (3-5 sentences) for the child\'s parents based ONLY on the teacher\'s '
    'observations. Mention strengths first, then one or two areas to grow. Do not invent '
    'details, grades, or diagnoses. Plain text only, no headings or bullet points.'
)

GROWTH_WORDS = ('needs', 'need ', 'encourage', 'struggl', 'difficult', 'hesitant', 'shy', 'cries', 'help with', 'not yet')


def _build_prompt(first_name, notes, lang):
    language = 'Filipino (Taglish is fine)' if lang == 'tl' else 'English'
    lines = '\n'.join(f'- {n}' for n in notes)
    return f'Child: {first_name}\nTeacher observations:\n{lines}\n\nWrite the summary in {language}.'


def _offline_summary(first_name, notes, lang):
    strengths = [n for n in notes if not any(w in n.lower() for w in GROWTH_WORDS)]
    growth = [n for n in notes if any(w in n.lower() for w in GROWTH_WORDS)]
    parts = []
    if strengths:
        parts.append(f'{first_name} showed progress this period: ' + '; '.join(s.rstrip('.') for s in strengths) + '.')
    if growth:
        parts.append('Areas to support at home and in class: ' + '; '.join(g.rstrip('.') for g in growth) + '.')
    parts.append(f'Based on {len(notes)} teacher observation(s). Please reach out to the teacher for questions.')
    return ' '.join(parts)


def _call_anthropic(first_name, notes, lang):
    import anthropic  # lazy import para gumana pa rin kahit walang package

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=25.0)
    msg = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{'role': 'user', 'content': _build_prompt(first_name, notes, lang)}],
    )
    return ''.join(b.text for b in msg.content if b.type == 'text').strip()


def generate(student, notes, lang='en'):
    """Returns dict: text, source ('anthropic'|'offline'), model, warning."""
    first_name = student.first_name
    warning = ''
    if settings.ANTHROPIC_API_KEY:
        try:
            text = _call_anthropic(first_name, notes, lang)
            if text:
                return {'text': text, 'source': 'anthropic', 'model': settings.ANTHROPIC_MODEL, 'warning': ''}
            warning = 'AI returned empty text; used offline fallback.'
        except Exception as exc:  # network, key, quota, atbp.
            warning = f'AI call failed ({type(exc).__name__}); used offline fallback.'
    else:
        warning = 'No ANTHROPIC_API_KEY set; used offline fallback (not AI).'
    return {'text': _offline_summary(first_name, notes, lang), 'source': 'offline', 'model': '', 'warning': warning}
