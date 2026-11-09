import pytest
from fastapi.testclient import TestClient

import app


@pytest.mark.parametrize(('message', 'label'), [
    ('For security, read out the six digits that just arrived on your phone.', 'Verification-code request'),
    ('Please share your verification code with me.', 'Verification-code request'),
    ('Can you repeat the six-digit number?', 'Verification-code request'),
    ('What is your OTP?', 'Verification-code request'),
    ('Forward the security code we texted you.', 'Verification-code request'),
    ('Read out your one time password.', 'Verification-code request'),
    ('SEND ME THE CODE YOU RECEIVED.', 'Verification-code request'),
    ('Read\nout the six digits.', 'Verification-code request'),
    ('Give me your password.', 'Credential request'),
    ('Tell us your PIN.', 'Credential request'),
    ('Please provide your SSN.', 'Sensitive-info request'),
    ('Send your card number and CVV.', 'Sensitive-info request'),
    ('Download TeamViewer so we can fix the issue.', 'Remote-access request'),
    ('Enable screen sharing with us.', 'Remote-access request'),
    ('Purchase two prepaid gift cards.', 'Gift-card payment'),
    ('Pay the fee using cryptocurrency.', 'Untraceable payment'),
    ('Send $500 through Cash App.', 'Untraceable payment'),
    ('Transfer your money into a safe account.', 'Payment pressure'),
    ('Move your savings to our secure account.', 'Payment pressure'),
    ('Keep this between us.', 'Secrecy pressure'),
    ('Do not discuss this with your family.', 'Secrecy pressure'),
    ('Your account will be suspended unless you pay.', 'Threat pressure'),
    ('Your daughter needs bail money.', 'Emergency-relative pressure'),
    ('Read back the code from the text message.', 'Verification-code request'),
    ('Send me your 2FA code.', 'Verification-code request'),
    ('What are the six digits in the text?', 'Verification-code request'),
    ('Tell me your bank PIN.', 'Credential request'),
    ('Allow me to access your computer remotely.', 'Remote-access request'),
    ('Read me the gift card number.', 'Gift-card payment'),
    ('Send $1,000.50 in Bitcoin immediately.', 'Untraceable payment'),
])
def test_scam_paraphrases(message, label):
    result = app.score(message)
    assert label in [signal['label'] for signal in result['signals']]
    assert result['level'] in ('uncertain', 'high')
    assert all(signal['evidence'] in message for signal in result['signals'])


@pytest.mark.parametrize('message', [
    'Your delivery arrives tomorrow. Check the official app.',
    'Enter the six-digit code in the official app yourself.',
    'Please reply immediately to confirm your appointment.',
    'Call your bank immediately using its published number.',
    'I bought a gift card for my sister.',
    'This article explains Bitcoin and Zelle.',
    'The bank supports wire transfers.',
    'TeamViewer release notes are available.',
    'Please share the code for the public repository.',
    'Tell me where to enter the verification code.',
    'Never share your verification code with anyone.',
    "Don't read out the six digits to a caller.",
    'Do not buy gift cards to pay a stranger.',
    'Never install AnyDesk for an unknown caller.',
    'Avoid sending money through Zelle.',
    'We will never ask you to buy gift cards or share a code.',
    "We won't ask you to send Bitcoin or install remote access software.",
    'Our bank does not request your PIN or password.',
    'You do not need to send us a verification code.',
    "Please don't send Bitcoin immediately.",
    'Don\u2019t share your one-time code.',
    'Do not keep this secret from your family.',
    'Do not buy gift cards or send Bitcoin.',
    "I don't want you to send Bitcoin.",
    'Never, ever share your verification code.',
    'Never tell anyone your password.',
    "Don't tell anyone the six-digit code.",
    'Do not tell your family your PIN.',
])
def test_benign_and_protective_messages(message):
    assert app.score(message)['signals'] == []
    assert app.score(message)['level'] == 'low'


@pytest.mark.parametrize('message', [
    'We never ask for your password. Read out the six digits.',
    'We never ask for your password, but read out the six digits.',
    'We never ask for your password; read out the six digits.',
    'We never ask for your password. However, share your OTP.',
    "Don't worry, read out the six digits.",
    'Never share your password. Instead, read out the six digits.',
    'Never share your password, and send me your verification code.',
])
def test_protective_preamble_does_not_hide_later_request(message):
    labels = [signal['label'] for signal in app.score(message)['signals']]
    assert 'Verification-code request' in labels


def test_risk_thresholds_and_category_deduplication():
    single = app.score('Read out the six digits. Share your OTP. Repeat your verification code.')
    assert single['level'] == 'uncertain'
    assert [signal['label'] for signal in single['signals']] == ['Verification-code request']
    multiple = app.score('Read out the six digits. Keep this between us.')
    assert multiple['level'] == 'high'
    assert {signal['label'] for signal in multiple['signals']} == {
        'Verification-code request', 'Secrecy pressure',
    }
    immediate = app.score('Send $1,000.50 in Bitcoin immediately.')
    assert immediate['level'] == 'high'
    assert {signal['label'] for signal in immediate['signals']} == {'Untraceable payment', 'Urgency'}


def test_api_and_scenario_evidence_contract():
    client = TestClient(app.app)
    message = 'Read out the six digits. Keep this between us.'
    response = client.post('/api/score', json={'text': message})
    assert response.status_code == 200
    assert response.json() == app.score(message)
    assert set(response.json()) == {'level', 'signals', 'method'}

    response = client.get('/api/scenarios')
    assert response.status_code == 200
    scenarios = response.json()
    assert {item['id']: item['assessment']['level'] for item in scenarios} == {
        'bank': 'high', 'delivery': 'low', 'support': 'high',
    }
    for item in scenarios:
        for signal in item['assessment']['signals']:
            assert set(signal) == {'label', 'evidence'}
            assert signal['evidence'] in item['transcript']


@pytest.mark.parametrize(('message', 'labels'), [
    ('Please verify your one time passcode.', {'Verification-code request'}),
    ('Confirm the six digits we sent to your phone.', {'Verification-code request'}),
    ('Can you verify your security code for me?', {'Verification-code request'}),
    ('Please confirm your OTP over the phone.', {'Verification-code request'}),
    ('Read back your one-time passcode.', {'Verification-code request'}),
    ("Grandma, I'm in jail. Don't tell Mom, send it via Zelle.",
     {'Emergency-relative pressure', 'Secrecy pressure', 'Untraceable payment'}),
    ("I need bail money. Please don't tell Dad.", {'Emergency-relative pressure', 'Secrecy pressure'}),
    ('Your grandson is in jail and needs money for bail.', {'Emergency-relative pressure'}),
    ('Please send bail money through Zelle.', {'Emergency-relative pressure', 'Untraceable payment'}),
    ('Keep this from your parents and send the money via Cash App.', {'Secrecy pressure', 'Untraceable payment'}),
    ("This is Microsoft. Let me connect to your PC.", {'Remote-access request'}),
    ('We need to connect to your computer to remove the virus.', {'Remote-access request'}),
    ('Allow us to remotely connect to your laptop.', {'Remote-access request'}),
    ('Give me remote control of your computer.', {'Remote-access request'}),
    ('Buy Google Play cards and read me the numbers.', {'Gift-card payment'}),
    ('Purchase Apple gift cards to settle the balance.', {'Gift-card payment'}),
    ('Pay the tax with Steam cards.', {'Gift-card payment'}),
    ('Send me the Google Play card codes.', {'Gift-card payment'}),
    ('Your Social Security number has been suspended.', {'Threat pressure'}),
    ('Your social security benefits will be suspended unless you send Bitcoin.',
     {'Threat pressure', 'Untraceable payment'}),
])
def test_review_followup_scam_cases(message, labels):
    result = app.score(message)
    assert labels <= {signal['label'] for signal in result['signals']}
    assert result['level'] == ('high' if len(labels) >= 2 else 'uncertain')
    assert all(signal['evidence'] in message for signal in result['signals'])


@pytest.mark.parametrize('message', [
    'Verify your one time passcode in the official app yourself.',
    'Confirm the six digits on the official website.',
    'Never verify your passcode with a caller.',
    'We never ask you to confirm your security code over the phone.',
    'Please confirm your appointment tomorrow.',
    'Verify your mailing address in your account settings.',
    'Microsoft published instructions for connecting a printer to your PC.',
    'Connect your printer to your PC using a USB cable.',
    'I can connect to my computer from home.',
    'Never let me connect to your PC.',
    'Do not allow us to remotely connect to your laptop.',
    'I bought Google Play cards for a birthday.',
    'Google Play cards are available at the supermarket.',
    'Buy Google Play cards for your nephew for his birthday.',
    'Do not buy Google Play cards and read me the numbers.',
    'Never send me the Apple gift card codes.',
    'Your Social Security number cannot be suspended.',
    'Your social security benefits will not be suspended.',
    'Your grandson is at school. Tell Mom he is fine.',
    "Don't tell Mom your password or passcode.",
])
def test_review_followup_benign_controls(message):
    assert app.score(message)['signals'] == []
