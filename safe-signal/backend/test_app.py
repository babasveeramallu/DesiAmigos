import app
from fastapi.testclient import TestClient

client = TestClient(app.app)

def test_consent_boundaries():
    assert client.post('/api/investigate', json={'scenario_id': 'bank', 'consent': False}).status_code == 403
    assert client.post('/api/escalate', json={'scenario_id': 'bank', 'consent': False}).status_code == 403

def test_legitimate_and_scam():
    assert app.score(app.SCENARIOS[0]['transcript'])['level'] == 'high'
    assert app.score(app.SCENARIOS[1]['transcript'])['level'] == 'low'

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