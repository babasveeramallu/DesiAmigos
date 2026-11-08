import app
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

client = TestClient(app.app)

@pytest.mark.parametrize('scheme', ['postgres', 'postgresql'])
def test_provider_database_urls_select_psycopg(scheme):
    url = app.normalize_database_url(
        f'{scheme}://demo:p%40ss%3Aword%2Fvalue@db.example:5432/signal'
        '?sslmode=require&connect_timeout=10'
    )
    assert url.drivername == 'postgresql+psycopg'
    assert url.username == 'demo'
    assert url.password == 'p@ss:word/value'
    assert url.host == 'db.example'
    assert url.port == 5432
    assert url.database == 'signal'
    assert dict(url.query) == {'sslmode': 'require', 'connect_timeout': '10'}
    engine = create_engine(url)
    try:
        assert engine.dialect.name == 'postgresql'
        assert engine.dialect.driver == 'psycopg'
    finally:
        engine.dispose()

@pytest.mark.parametrize('value', [
    'sqlite://',
    'sqlite:///signal.db',
    'postgresql+psycopg://demo:example@db.example/signal?sslmode=verify-full',
])
def test_explicit_database_urls_are_preserved(value):
    assert app.normalize_database_url(value) == make_url(value)

def test_invalid_database_url_does_not_fall_back():
    with pytest.raises(ArgumentError):
        app.normalize_database_url('not-a-database-url')

def test_consent_boundaries(monkeypatch):
    monkeypatch.setenv('RESPONDER_TOKEN', 'test-only')
    headers = {'Authorization': 'Bearer test-only'}
    assert client.post('/api/investigate', json={'scenario_id': 'bank', 'consent': False}, headers=headers).status_code == 403
    assert client.post('/api/escalate', json={'scenario_id': 'bank', 'consent': False}, headers=headers).status_code == 403

def test_hosted_investigation_and_escalation_require_presenter_access(monkeypatch):
    monkeypatch.setenv('RESPONDER_TOKEN', 'test-only')
    monkeypatch.setenv('NVIDIA_API_KEY', '')
    headers = {'Authorization': 'Bearer test-only'}

    assert client.post('/api/investigate', json={'scenario_id': 'bank', 'consent': True}).status_code == 401
    assert client.post('/api/escalate', json={'scenario_id': 'bank', 'consent': True}).status_code == 401
    assert client.post(
        '/api/investigate',
        json={'scenario_id': 'bank', 'consent': True},
        headers=headers,
    ).status_code == 200
    assert client.post(
        '/api/escalate',
        json={'scenario_id': 'bank', 'consent': True},
        headers=headers,
    ).status_code == 200

def test_hosted_investigation_limit(monkeypatch):
    monkeypatch.setenv('RESPONDER_TOKEN', 'test-only')
    monkeypatch.setenv('NVIDIA_API_KEY', '')
    app._investigation_attempts.clear()
    headers = {'Authorization': 'Bearer test-only'}

    for _ in range(app.INVESTIGATION_LIMIT):
        response = client.post(
            '/api/investigate',
            json={'scenario_id': 'bank', 'consent': True},
            headers=headers,
        )
        assert response.status_code == 200

    limited = client.post(
        '/api/investigate',
        json={'scenario_id': 'bank', 'consent': True},
        headers=headers,
    )
    assert limited.status_code == 429
    assert 'Retry-After' in limited.headers

def test_legitimate_and_scam():
    assert app.score(app.SCENARIOS[0]['transcript'])['level'] == 'high'
    assert app.score(app.SCENARIOS[1]['transcript'])['level'] == 'low'

def test_custom_message_scoring_endpoint():
    response = client.post('/api/score', json={'text': 'Act now. Send a gift card. Also buy two gift cards.'})
    assert response.status_code == 200
    result = response.json()
    assert result['level'] == 'high'
    assert [signal['label'] for signal in result['signals']].count('Gift-card payment') == 1

    safe_response = client.post('/api/score', json={'text': 'We will never ask for your verification code.'})
    assert safe_response.status_code == 200
    assert safe_response.json()['level'] == 'low'
    assert client.post('/api/score', json={'text': 'x' * 1001}).status_code == 422

def test_custom_message_rules_cover_twenty_scam_style_lines():
    cases = [
        ('Send me the PIN.', 'Credential request'),
        ('Send me the PIN and the code we texted you.', 'Verification-code request'),
        ('Read me the code we just sent.', 'Verification-code request'),
        ('Tell me your one-time code.', 'Verification-code request'),
        ('Install AnyDesk so I can fix your computer.', 'Remote-access request'),
        ('Open TeamViewer and share the session number.', 'Remote-access request'),
        ('Pay the fee in Bitcoin.', 'Untraceable payment'),
        ('Send the money through Zelle.', 'Untraceable payment'),
        ('Your grandson needs bail money.', 'Emergency-relative pressure'),
        ('Your grandson was arrested.', 'Threat pressure'),
        ('Pay bail before your grandson is arrested.', 'Emergency-relative pressure'),
        ('Buy gift cards to pay the bill.', 'Gift-card payment'),
        ('Install remote access software now.', 'Remote-access request'),
        ('Do not tell anyone about this call.', 'Secrecy pressure'),
        ('Act now or your account will close.', 'Urgency'),
        ('You must act immediately.', 'Urgency'),
        ('Send a wire transfer today.', 'Payment pressure'),
        ('Give me your Social Security number.', 'Sensitive-info request'),
        ('Send $500 in Bitcoin to avoid arrest.', 'Untraceable payment'),
        ('Pay now to avoid arrest.', 'Threat pressure'),
    ]

    for message, expected_label in cases:
        labels = [signal['label'] for signal in app.score(message)['signals']]
        assert expected_label in labels, message

def test_custom_message_rules_suppress_clear_benign_context():
    assert app.score('We will never ask you to buy gift cards or share a code.')['level'] == 'low'
    assert app.score('Please reply immediately to confirm your appointment.')['level'] == 'low'
    mixed = app.score('We will never ask for gift cards. Send me a gift card now.')
    assert mixed['level'] == 'uncertain'

def test_access_and_chain(monkeypatch):
    monkeypatch.setenv('RESPONDER_TOKEN', 'test-only')
    assert client.get('/api/incidents').status_code == 401
    response = client.post('/api/escalate', json={'scenario_id': 'bank', 'consent': True}, headers={'Authorization': 'Bearer test-only'})
    identifier = response.json()['incident']
    events = app.read_events(identifier)
    assert app.verify(events)
    assert '202-555' not in events[0]['body']
    events[0]['body'] = 'tampered'
    assert not app.verify(events)