import app
from fastapi.testclient import TestClient

client = TestClient(app.app)

def test_consent_boundaries():
    assert client.post('/api/investigate', json={'scenario_id': 'bank', 'consent': False}).status_code == 403
    assert client.post('/api/escalate', json={'scenario_id': 'bank', 'consent': False}).status_code == 403

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

def test_access_and_chain(monkeypatch):
    monkeypatch.setenv('RESPONDER_TOKEN', 'test-only')
    assert client.get('/api/incidents').status_code == 401
    response = client.post('/api/escalate', json={'scenario_id': 'bank', 'consent': True})
    identifier = response.json()['incident']
    events = app.read_events(identifier)
    assert app.verify(events)
    assert '202-555' not in events[0]['body']
    events[0]['body'] = 'tampered'
    assert not app.verify(events)